export type FrameRect = { name: string; x: number; y: number; w: number; h: number };
export type Atlas = {
    image: string; meta: { w: number; h: number; frameCount: number; fps?: number };
    frames: FrameRect[]; animations?: Record<string, string[]>;
    padding: number; extrude: number; origin?: 'topleft' | 'center';
};

export function buildSimpleGridAtlas(bitmaps: ImageBitmap[], opts: {
    frameW: number; frameH: number; columns?: number; padding?: number; extrude?: number;
    names?: string[]; fps?: number;
}): { canvas: HTMLCanvasElement; atlas: Atlas } {
    const padding = opts.padding ?? 0;
    const extrude = opts.extrude ?? 0;
    const cols = Math.max(1, opts.columns ?? Math.ceil(Math.sqrt(bitmaps.length)));
    const rows = Math.ceil(bitmaps.length / cols);
    const cellW = opts.frameW + padding * 2 + extrude * 2;
    const cellH = opts.frameH + padding * 2 + extrude * 2;
    const W = cols * cellW;
    const H = rows * cellH;
    const cnv = document.createElement('canvas');
    cnv.width = W;
    cnv.height = H;
    const ctx = cnv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const frames: FrameRect[] = [];
    for (let i = 0; i < bitmaps.length; i++) {
        const col = i % cols, row = Math.floor(i / cols);
        const x = col * cellW + padding + extrude;
        const y = row * cellH + padding + extrude;
        const bmp = bitmaps[i];
        ctx.drawImage(bmp, x, y, opts.frameW, opts.frameH);
        if (extrude > 0) {
            ctx.drawImage(cnv, x, y, opts.frameW, 1, x, y - extrude, opts.frameW, extrude);
            ctx.drawImage(cnv, x, y + opts.frameH - 1, opts.frameW, 1, x, y + opts.frameH, opts.frameW, extrude);
            ctx.drawImage(cnv, x, y, 1, opts.frameH, x - extrude, y, extrude, opts.frameH);
            ctx.drawImage(cnv, x + opts.frameW - 1, y, 1, opts.frameH, x + opts.frameW, y, extrude, opts.frameH);
        }
        frames.push({
            name: opts.names?.[i] ?? `frame_${String(i).padStart(4, '0')}`,
            x: x - extrude,
            y: y - extrude,
            w: opts.frameW + extrude * 2,
            h: opts.frameH + extrude * 2
        });
    }
    const atlas: Atlas = {
        image: 'spritesheet.png',
        meta: {w: W, h: H, frameCount: bitmaps.length, fps: opts.fps},
        frames,
        padding,
        extrude,
        origin: 'topleft'
    };
    return {canvas: cnv, atlas};
}