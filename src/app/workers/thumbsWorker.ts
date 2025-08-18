let W = 0, H = 0;
const hists: Uint32Array[] = [];
const times: number[] = [];

function histRGBA(data: Uint8ClampedArray) {
    const bins = new Uint32Array(48); // 16 por canal * 3
    for (let i = 0; i < data.length; i += 4) {
        bins[(data[i] >> 4)]++;
        bins[16 + (data[i + 1] >> 4)]++;
        bins[32 + (data[i + 2] >> 4)]++;
    }
    return bins;
}

function l1(a: Uint32Array, b: Uint32Array) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
    return s;
}

(self as any).onmessage = (e: MessageEvent) => {
    const msg = e.data as any;
    if (msg.op === 'reset') {
        W = msg.w | 0;
        H = msg.h | 0;
        hists.length = 0;
        times.length = 0;
        return;
    }
    if (msg.op === 'push') {
        const arr = new Uint8ClampedArray(msg.buf); // reconstruir RGBA
        hists.push(histRGBA(arr));
        times.push(msg.time);
        (self as any).postMessage({op: 'pushProgress', done: hists.length, total: undefined});
        return;
    }
    if (msg.op === 'detect') {
        const idx: number[] = [];
        if (!hists.length) {
            (self as any).postMessage({op: 'detectDone', indices: [], times: []});
            return;
        }
        idx.push(0);
        const normDen = Math.max(1, W * H * 3);
        for (let i = 1; i < hists.length; i++) {
            const diff = l1(hists[i], hists[i - 1]) / normDen; // ~0..1
            if (diff >= msg.threshold) idx.push(i);
        }
        (self as any).postMessage({op: 'detectDone', indices: idx, times});
    }
};