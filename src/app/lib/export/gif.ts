import type {FixedPalette} from '../palettes';
import {applyPalette, GIFEncoder, quantize} from '../../../types/gifenc.d';

function flattenRGB(colors: number[][]): Uint8Array {
    const out = new Uint8Array(colors.length * 3);
    for (let i = 0; i < colors.length; i++) {
        const [r, g, b] = colors[i];
        out[i * 3] = r;
        out[i * 3 + 1] = g;
        out[i * 3 + 2] = b;
    }
    return out;
}

function processFrame(frame: ImageBitmap, w: number, h: number, fixedPalBytes: Uint8Array | null): {
    palette: Uint8Array,
    indices: Uint8Array
} {
    const off = new OffscreenCanvas(w, h);
    const ctx = off.getContext('2d', {willReadFrequently: true})!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frame, 0, 0, w, h);
    const {data} = ctx.getImageData(0, 0, w, h);

    let palette: Uint8Array;
    let indices: Uint8Array;

    if (fixedPalBytes) {
        palette = fixedPalBytes;
        indices = applyPalette(data, palette);
    } else {
        palette = quantize(data, 256);
        indices = applyPalette(data, palette);
    }

    return {palette, indices};
}

export async function framesToGIF(frames: ImageBitmap[], fps: number, fixedPalette?: FixedPalette): Promise<Blob> {
    if (!frames.length) throw new Error('No frames');

    const w = frames[0].width, h = frames[0].height;
    const enc = GIFEncoder({loops: 0});
    const delay = Math.max(1, Math.round(1000 / Math.max(1, fps)));
    const useFixed = !!fixedPalette && fixedPalette.colors.length <= 256;
    const fixedPalBytes = useFixed ? flattenRGB(fixedPalette!.colors) : null;

    for (const frame of frames) {
        const {palette, indices} = processFrame(frame, w, h, fixedPalBytes);
        enc.writeFrame(indices, w, h, {palette, delay});
    }

    const bytes = enc.bytesView();
    return new Blob([bytes], {type: 'image/gif'});
}