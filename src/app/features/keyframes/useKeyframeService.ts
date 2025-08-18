export type ThumbsMsg =
    | { op: 'thumb'; time: number; w: number; h: number }
    | { op: 'detect'; times: number[]; threshold: number; w: number; h: number }
    | { op: 'reset', w: number; h: number }
    | { op: 'push', w: number; h: number, time: number, buf: ArrayBuffer }
    | { op: 'detect'; threshold: number };

export class KeyframeService {
    private worker: Worker;

    constructor() {
        this.worker = new Worker(new URL('../../workers/thumbsWorker.ts', import.meta.url), {type: 'module'});
    }

    recreate() {
        this.worker.terminate();
        this.worker = new Worker(new URL('../../workers/thumbsWorker.ts', import.meta.url), {type: 'module'});
    }

    onMessage(cb: (e: MessageEvent) => void) {
        this.worker.onmessage = cb;
    }

    post(msg: ThumbsMsg) {
        this.worker.postMessage(msg);
    }
}