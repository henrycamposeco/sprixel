export async function framesToWebM(frames: ImageBitmap[], fps: number, size?: { w: number, h: number }): Promise<Blob> {
    if (!frames.length) throw new Error('No frames');
    const w = size?.w ?? frames[0].width, h = size?.h ?? frames[0].height;
    const cnv = document.createElement('canvas');
    cnv.width = w;
    cnv.height = h;
    const ctx = cnv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const stream = cnv.captureStream(fps);
    const rec = new MediaRecorder(stream, {mimeType: 'video/webm'});
    const chunks: BlobPart[] = [];
    return new Promise<Blob>((resolve) => {
        rec.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };
        rec.onstop = () => resolve(new Blob(chunks, {type: 'video/webm'}));
        rec.start();
        let i = 0;
        const frameDur = 1000 / Math.max(1, fps);
        const tick = () => {
            const f = frames[i];
            ctx.clearRect(0, 0, w, h);
            const scale = Math.min(w / f.width, h / f.height);
            const dw = Math.floor(f.width * scale), dh = Math.floor(f.height * scale);
            const dx = Math.floor((w - dw) / 2), dy = Math.floor((h - dh) / 2);
            ctx.drawImage(f, dx, dy, dw, dh);
            i++;
            if (i < frames.length) setTimeout(tick, frameDur);
            else setTimeout(() => rec.stop(), frameDur + 50);
        };
        setTimeout(tick, 0);
    });
}