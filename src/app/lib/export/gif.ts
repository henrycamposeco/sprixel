// Minimal GIF89a encoder without external libraries.
// - Builds a global palette (<=256 colors) from frames if possible,
//   otherwise falls back to fixed 3-3-2 (256 color) palette.
// - LZW-compresses indexed pixels and assembles an animated GIF.
// Notes: No transparency; infinite loop; simple "no disposal" for frames.

export async function framesToGIF(frames: ImageBitmap[], fps: number): Promise<Blob> {
    if (!frames.length) throw new Error('No frames');
    const w = frames[0].width;
    const h = frames[0].height;
    for (const f of frames) {
        if (f.width !== w || f.height !== h) {
            throw new Error('All frames must have the same dimensions');
        }
    }

    // Grab pixel data helper
    const getPixels = (bmp: ImageBitmap): Uint8ClampedArray => {
        const off = typeof OffscreenCanvas !== 'undefined'
            ? new OffscreenCanvas(w, h)
            : (() => {
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                return c as unknown as OffscreenCanvas;
            })();
        const ctx = (off as any).getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
        (ctx as any).imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(bmp, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        return img.data;
    };

    // First pass: try to collect unique colors across frames (cap at 256)
    let tooManyColors = false;
    const colorOrder: number[] = [];
    const colorToIndex = new Map<number, number>();
    for (const f of frames) {
        const data = getPixels(f);
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const rgb = (r << 16) | (g << 8) | b;
            if (!colorToIndex.has(rgb)) {
                colorToIndex.set(rgb, colorOrder.length);
                colorOrder.push(rgb);
                if (colorOrder.length > 256) {
                    tooManyColors = true;
                    break;
                }
            }
        }
        if (tooManyColors) break;
    }

    type PaletteBuild =
        | { type: 'fixed332', palette: Uint8Array, usedColors: number, indexOf: (r: number, g: number, b: number) => number };

    const buildPalette = (): PaletteBuild => {
        // Force fixed 3-3-2 palette (256 colors) for stable indices across all frames
        const paletteArr = new Uint8Array(256 * 3);
        for (let r3 = 0; r3 < 8; r3++) {
            for (let g3 = 0; g3 < 8; g3++) {
                for (let b2 = 0; b2 < 4; b2++) {
                    const idx = (r3 << 5) | (g3 << 2) | b2;
                    paletteArr[idx * 3 + 0] = expandToByte(r3, 3);
                    paletteArr[idx * 3 + 1] = expandToByte(g3, 3);
                    paletteArr[idx * 3 + 2] = expandToByte(b2, 2);
                }
            }
        }
        const indexOf = (r: number, g: number, b: number) => {
            const r3 = r >> 5, g3 = g >> 5, b2 = b >> 6;
            return (r3 << 5) | (g3 << 2) | b2;
        };
        return { type: 'fixed332', palette: paletteArr, usedColors: 256, indexOf };
    };

    const pal = buildPalette();
    const paletteSize = pal.palette.length / 3; // 2,4,8,...,256
    const gctPower = Math.log2(paletteSize) | 0; // 1..8
    const gctSizeField = Math.max(0, gctPower - 1); // 0..7 (2^(n+1))
    // LZW minimum code size must match the number of bits of color indices (GCT bit-depth), clamped to [2..8]
    const bitsPerPixel = Math.max(2, Math.min(8, gctPower));

    // Build frames' indexed pixel data
    const framesIndexed: Uint8Array[] = [];
    for (const f of frames) {
        const data = getPixels(f);
        const idxs = new Uint8Array(w * h);
        let p = 0;
        for (let i = 0; i < data.length; i += 4) {
            const ci = pal.indexOf(data[i], data[i + 1], data[i + 2]);
            // Clamp to valid palette index range as a safety net
            idxs[p++] = ci < paletteSize ? ci : (paletteSize - 1);
        }
        framesIndexed.push(idxs);
    }

    // Assemble GIF
    const bw = new ByteWriter();
    // Header
    bw.writeASCII('GIF89a');
    // Logical Screen Descriptor
    bw.writeU16LE(w);
    bw.writeU16LE(h);
    // Packed: Global Color Table Flag (1) | Color Resolution (gctPower-1) | Sort Flag (0) | GCT size
    bw.writeByte(0x80 | (((gctPower - 1) & 0x07) << 4) | (gctSizeField & 0x07));
    bw.writeByte(0x00); // Background color index
    bw.writeByte(0x00); // Pixel aspect ratio

    // Global Color Table
    bw.writeBytes(pal.palette);

    // Looping extension (Netscape)
    // Application Extension
    bw.writeByte(0x21); // Extension Introducer
    bw.writeByte(0xFF); // Application Extension Label
    bw.writeByte(11);   // Block Size
    bw.writeASCII('NETSCAPE2.0');
    bw.writeByte(3);    // Sub-block size
    bw.writeByte(1);    // Sub-block ID
    bw.writeU16LE(0);   // Loop count: 0 = infinite
    bw.writeByte(0);    // Block terminator

    // Frame delay in hundredths of a second
    const delayCs = Math.max(2, Math.round(100 / Math.max(1, fps)));

    for (const idxs of framesIndexed) {
        // Graphic Control Extension
        bw.writeByte(0x21); // Extension
        bw.writeByte(0xF9); // GCE Label
        bw.writeByte(4);    // Block size
        // Packed: Reserved(000) | Disposal Method(000) | User Input(0) | Transparent Color Flag(0)
        bw.writeByte(0x00);
        bw.writeU16LE(delayCs);
        bw.writeByte(0x00); // Transparent color index (unused)
        bw.writeByte(0x00); // Block terminator

        // Image Descriptor
        bw.writeByte(0x2C);
        bw.writeU16LE(0); // left
        bw.writeU16LE(0); // top
        bw.writeU16LE(w);
        bw.writeU16LE(h);
        bw.writeByte(0x00); // No local color table, not interlaced

        // Image Data
        bw.writeByte(bitsPerPixel); // LZW minimum code size
        const compressed = lzwCompress(idxs, bitsPerPixel);
        // Write as sub-blocks (max 255 bytes each)
        let off = 0;
        while (off < compressed.length) {
            const len = Math.min(255, compressed.length - off);
            bw.writeByte(len);
            bw.writeBytes(compressed.subarray(off, off + len));
            off += len;
        }
        bw.writeByte(0x00); // Block terminator
    }

    // Trailer
    bw.writeByte(0x3B);

    return new Blob([bw.toUint8Array()], { type: 'image/gif' });
}

// ---------- Helpers ----------
function expandToByte(v: number, bits: number): number {
    // Expand v in [0..(2^bits-1)] to [0..255]
    if (bits <= 0) return 0;
    const max = (1 << bits) - 1;
    return Math.round((v / max) * 255);
}

class ByteWriter {
    private arr: number[] = [];
    writeByte(b: number) { this.arr.push(b & 0xff); }
    writeBytes(bytes: Uint8Array) { for (let i = 0; i < bytes.length; i++) this.arr.push(bytes[i]); }
    writeU16LE(n: number) {
        this.arr.push(n & 0xff, (n >> 8) & 0xff);
    }
    writeASCII(s: string) {
        for (let i = 0; i < s.length; i++) this.arr.push(s.charCodeAt(i) & 0xff);
    }
    toUint8Array(): Uint8Array { return new Uint8Array(this.arr); }
}

function lzwCompress(indices: Uint8Array, minCodeSize: number): Uint8Array {
    const CLEAR = 1 << minCodeSize;
    const END = CLEAR + 1;
    let codeSize = minCodeSize + 1;
    let nextCode = END + 1;

    // Bit writer (LSB-first per GIF)
    const out: number[] = [];
    let cur = 0;
    let bitPos = 0;
    const writeCode = (code: number) => {
        for (let i = 0; i < codeSize; i++) {
            cur |= ((code >> i) & 1) << bitPos;
            bitPos++;
            if (bitPos === 8) {
                out.push(cur);
                cur = 0;
                bitPos = 0;
            }
        }
    };
    const flush = () => {
        if (bitPos > 0) {
            out.push(cur);
            cur = 0;
            bitPos = 0;
        }
    };

    // Dictionary for sequences beyond single-byte literals
    const dict = new Map<string, number>();
    const chr = (n: number) => String.fromCharCode(n & 0xff);

    // Start stream
    writeCode(CLEAR);

    let w = chr(indices[0]);
    for (let i = 1; i < indices.length; i++) {
        const k = chr(indices[i]);
        const wk = w + k;

        if (dict.has(wk)) {
            w = wk;
        } else {
            // Output code for w
            const code = (w.length === 1) ? w.charCodeAt(0) : dict.get(w)!;
            writeCode(code);

            // Add wk to dictionary if there is capacity, otherwise CLEAR first
            if (nextCode < 4096) {
                dict.set(wk, nextCode++);
                if (nextCode === (1 << codeSize) && codeSize < 12) {
                    codeSize++;
                }
            } else {
                // Dictionary full: CLEAR and reset (do not add wk this turn)
                writeCode(CLEAR);
                dict.clear();
                codeSize = minCodeSize + 1;
                nextCode = END + 1;
            }

            // Start new sequence
            w = k;
        }
    }

    // Output last code and end
    const lastCode = (w.length === 1) ? w.charCodeAt(0) : dict.get(w)!;
    writeCode(lastCode);
    writeCode(END);
    flush();
    return new Uint8Array(out);
}