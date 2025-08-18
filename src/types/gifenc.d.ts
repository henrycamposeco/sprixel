interface GIFEncoderOptions {
    loops?: number;
}

interface WriteFrameOptions {
    palette: Uint8Array;
    delay: number;
}

interface GIFEncoder {
    writeFrame(indices: Uint8Array, width: number, height: number, opts: WriteFrameOptions): void;

    bytesView(): Uint8Array;
}

export const GIFEncoder = (_opts?: GIFEncoderOptions): GIFEncoder => {
    throw new Error('Not implemented');
};

export const quantize = (_rgba: Uint8ClampedArray, _maxColors?: number): Uint8Array => {
    throw new Error('Not implemented');
};

export const applyPalette = (_rgba: Uint8ClampedArray, _palette: Uint8Array, _dither?: boolean): Uint8Array => {
    throw new Error('Not implemented');
};