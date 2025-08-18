import {quantizeByPalette} from '../lib/palettes';
import {BAYER4, clamp8} from '../lib/dithering';

let paletteId = 'default';
let dither: 'none' | 'ordered' | 'error' = 'none';
let intensity = 0.5; // 0..1
let targetH = 90;

self.onmessage = async (e: MessageEvent) => {
    const msg = e.data as any;
    if (msg.op === 'config') {
        paletteId = msg.cfg.paletteId;
        dither = msg.cfg.dither;
        intensity = msg.cfg.intensity ?? 0.5;
        targetH = msg.cfg.targetH ?? 90;
        return;
    }
    if (msg.op === 'frame') {
        const {index, bitmap} = msg;
        const sw = bitmap.width, sh = bitmap.height;
        const tw = Math.max(1, Math.floor(sw * (targetH / sh)));
        const th = targetH;
        const off = new OffscreenCanvas(tw, th);
        const ctx = off.getContext('2d', {willReadFrequently: true})!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(bitmap, 0, 0, tw, th);
        const img = ctx.getImageData(0, 0, tw, th);
        const d = img.data;

        if (dither === 'ordered') {
            const bias = Math.floor(8 + 24 * intensity);
            for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
                const i = (y * tw + x) * 4;
                const t = BAYER4[(y & 3) * 4 + (x & 3)] - 7.5;
                const rr = clamp8(d[i] + t * bias), gg = clamp8(d[i + 1] + t * bias), bb = clamp8(d[i + 2] + t * bias);
                const [nr, ng, nb] = quantizeByPalette(paletteId, rr, gg, bb);
                d[i] = nr;
                d[i + 1] = ng;
                d[i + 2] = nb;
            }
        } else if (dither === 'error') {
            const factor = 0.25 + intensity * 0.75;
            for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
                const i = (y * tw + x) * 4;
                const r = d[i], g = d[i + 1], b = d[i + 2];
                const [nr, ng, nb] = quantizeByPalette(paletteId, r, g, b);
                const er = (r - nr) * factor, eg = (g - ng) * factor, eb = (b - nb) * factor;
                d[i] = nr;
                d[i + 1] = ng;
                d[i + 2] = nb;
                const addAt = (xx: number, yy: number, fr: number) => {
                    if (xx >= 0 && xx < tw && yy >= 0 && yy < th) {
                        const j = (yy * tw + xx) * 4;
                        d[j] = clamp8(d[j] + er * fr);
                        d[j + 1] = clamp8(d[j + 1] + eg * fr);
                        d[j + 2] = clamp8(d[j + 2] + eb * fr);
                    }
                };
                addAt(x + 1, y, 7 / 16);
                addAt(x - 1, y + 1, 3 / 16);
                addAt(x, y + 1, 5 / 16);
                addAt(x + 1, y + 1, 1 / 16);
            }
        } else {
            for (let i = 0; i < d.length; i += 4) {
                const [nr, ng, nb] = quantizeByPalette(paletteId, d[i], d[i + 1], d[i + 2]);
                d[i] = nr;
                d[i + 1] = ng;
                d[i + 2] = nb;
            }
        }

        ctx.putImageData(img, 0, 0);
        const out = await (off as any).transferToImageBitmap?.() ?? await createImageBitmap(off as any);
        (self as any).postMessage({op: 'frameDone', index, bitmap: out}, [out]);
    }
};