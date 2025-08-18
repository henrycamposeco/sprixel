import type {DitherMode} from '../../lib/dithering';

export type PixelConfig = { paletteId: string; dither: DitherMode; intensity: number; targetH: number };
export type PixelWorkerMsg =
    | { op: 'config'; cfg: PixelConfig }
    | { op: 'frame'; index: number; bitmap: ImageBitmap }
    | { op: 'flush' };

export class PixelizeService {
    private worker: Worker;

    constructor() {
        this.worker = new Worker(new URL('../../workers/pixelWorker.ts', import.meta.url), {type: 'module'});
    }

    recreate() {
        this.worker.terminate();
        this.worker = new Worker(new URL('../../workers/pixelWorker.ts', import.meta.url), {type: 'module'});
    }

    onMessage(cb: (e: MessageEvent) => void) {
        this.worker.onmessage = cb;
    }

    post(msg: PixelWorkerMsg) {
        if (msg.op === 'frame') this.worker.postMessage(msg, [msg.bitmap]);
        else this.worker.postMessage(msg);
    }
}