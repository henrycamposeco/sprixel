export async function framesToAPNG(frames: ImageBitmap[], fps: number): Promise<Blob> {
    if (!frames.length) throw new Error('No frames');

    const w = frames[0].width, h = frames[0].height;
    const delayNum = Math.max(1, Math.round(1000 / Math.max(1, fps)));
    const delayDen = 1000;

    // Render each frame to a PNG (uniform size), then parse IDAT from each
    const pngBytes: Uint8Array[] = [];
    for (const frame of frames) {
        const off = typeof OffscreenCanvas !== 'undefined'
            ? new OffscreenCanvas(w, h)
            : (() => {
                const c = document.createElement('canvas');
                c.width = w;
                c.height = h;
                return c as unknown as OffscreenCanvas;
            })();

        const ctx = off.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, w, h);
        // Scale the frame to target dimensions if needed
        ctx.drawImage(frame, 0, 0, w, h);

        const blob: Blob = 'convertToBlob' in off
            ? await (off as OffscreenCanvas).convertToBlob({ type: 'image/png' })
            : await new Promise<Blob>((resolve, reject) => {
                (off as any as HTMLCanvasElement).toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
            });

        const buf = new Uint8Array(await blob.arrayBuffer());
        pngBytes.push(buf);
    }

    // Parse PNGs to extract IHDR/IDAT/IEND; use IHDR and IEND from first frame
    const firstParsed = parsePng(pngBytes[0]);
    const framesParsed = pngBytes.map(parsePng);

    // Build APNG
    let seq = 0; // fcTL/fdAT sequence number
    const out: Uint8Array[] = [];
    out.push(PNG_SIG);
    out.push(firstParsed.ihdrChunk); // Keep original IHDR

    // acTL: total frames, infinite loops
    out.push(makeChunk('acTL', concatBytes(u32(frames.length), u32(0))));

    // fcTL for frame 0
    out.push(makeChunk('fcTL', concatBytes(
        u32(seq++),
        u32(w), u32(h),
        u32(0), u32(0),
        u16(delayNum), u16(delayDen),
        u8(0), // dispose_op: APNG_DISPOSE_OP_NONE
        u8(0)  // blend_op: APNG_BLEND_OP_SOURCE
    )));

    // IDATs for frame 0 as-is
    for (const idat of firstParsed.idatChunks) out.push(idat);

    // Subsequent frames: fcTL + fdAT (each IDAT becomes an fdAT with seq number)
    for (let i = 1; i < framesParsed.length; i++) {
        const p = framesParsed[i];
        out.push(makeChunk('fcTL', concatBytes(
            u32(seq++),
            u32(w), u32(h),
            u32(0), u32(0),
            u16(delayNum), u16(delayDen),
            u8(0), // dispose_op
            u8(0)  // blend_op (source)
        )));
        for (const idat of p.idatDataPayloads) {
            // fdAT data = sequence_number (4) + IDAT payload
            const fd = concatBytes(u32(seq++), idat);
            out.push(makeChunk('fdAT', fd));
        }
    }

    // IEND
    out.push(firstParsed.iendChunk);

    const bytes = concatBytes(...out);
    return new Blob([bytes], { type: 'image/apng' });
}

// ---------- PNG/APNG helpers ----------

const PNG_SIG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function parsePng(bytes: Uint8Array): {
    ihdrChunk: Uint8Array,
    idatChunks: Uint8Array[],       // full IDAT chunks (with header/length/crc)
    idatDataPayloads: Uint8Array[], // payload only from IDAT chunks
    iendChunk: Uint8Array
} {
    // Validate signature
    for (let i = 0; i < PNG_SIG.length; i++) {
        if (bytes[i] !== PNG_SIG[i]) throw new Error('Invalid PNG signature');
    }
    let off = 8;

    let ihdrChunk: Uint8Array | null = null;
    const idatChunks: Uint8Array[] = [];
    const idatPayloads: Uint8Array[] = [];
    let iendChunk: Uint8Array | null = null;

    while (off + 8 <= bytes.length) {
        const len = readU32(bytes, off);
        const type = String.fromCharCode(
            bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7]
        );
        const chunkStart = off;
        const dataStart = off + 8;
        const dataEnd = dataStart + len;
        const crcEnd = dataEnd + 4;
        if (crcEnd > bytes.length) throw new Error('Corrupt PNG chunk');

        const fullChunk = bytes.subarray(chunkStart, crcEnd);
        const payload = bytes.subarray(dataStart, dataEnd);

        if (type === 'IHDR') ihdrChunk = fullChunk;
        else if (type === 'IDAT') {
            idatChunks.push(fullChunk);
            idatPayloads.push(payload);
        } else if (type === 'IEND') {
            iendChunk = fullChunk;
            break;
        }

        off = crcEnd;
    }

    if (!ihdrChunk || !iendChunk) throw new Error('PNG missing IHDR or IEND');

    return {
        ihdrChunk,
        idatChunks,
        idatDataPayloads: idatPayloads,
        iendChunk
    };
}

function u32(n: number): Uint8Array {
    const b = new Uint8Array(4);
    b[0] = (n >>> 24) & 0xff;
    b[1] = (n >>> 16) & 0xff;
    b[2] = (n >>> 8) & 0xff;
    b[3] = n & 0xff;
    return b;
}
function u16(n: number): Uint8Array {
    const b = new Uint8Array(2);
    b[0] = (n >>> 8) & 0xff;
    b[1] = n & 0xff;
    return b;
}
function u8(n: number): Uint8Array {
    return new Uint8Array([n & 0xff]);
}
function readU32(b: Uint8Array, o: number): number {
    return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}

function concatBytes(...arrs: Uint8Array[]): Uint8Array {
    let len = 0;
    for (const a of arrs) len += a.length;
    const out = new Uint8Array(len);
    let off = 0;
    for (const a of arrs) {
        out.set(a, off);
        off += a.length;
    }
    return out;
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
    const typeBytes = new TextEncoder().encode(type);
    const len = u32(data.length);
    const crc = crc32(concatBytes(typeBytes, data));
    const crcBytes = u32(crc >>> 0);
    return concatBytes(len, typeBytes, data, crcBytes);
}

// CRC32 implementation
const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : (c >>> 1);
        }
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(data: Uint8Array): number {
    let c = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
        c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
}
