import {useEffect, useRef} from 'preact/hooks';
import {signal} from '@preact/signals';
import {kfMarkers, kfProgress, kfSelected, kfStatus, kfThreshold, kfVideo} from '../features/keyframes/signals';
import {KeyframeService} from '../features/keyframes/useKeyframeService';
import {buildSimpleGridAtlas} from '../lib/export/atlas';

const svcSig = signal<KeyframeService | null>(null);

export function KeyframesTab() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        kfVideo.value = videoRef.current;
    }, []);
    useEffect(() => {
        const svc = new KeyframeService();
        svcSig.value = svc;
        svc.onMessage(async (e) => {
            const {op} = e.data;
            if (op === 'pushProgress') {
                const {done, total} = e.data;
                kfProgress.value = Math.round(done / total * 100);
            }
            if (op === 'detectDone') {
                const {indices, times} = e.data as { indices: number[]; times: number[] };
                const v = kfVideo.value!;
                const secs = indices.map(i => times[i]);
                kfMarkers.value = secs;
                kfProgress.value = 100;
                kfStatus.value = `Detectados ${secs.length} keyframes`;
                if (secs.length) {
                    await seekVideo(v, secs[0]);
                    const ctx = canvasRef.current!.getContext('2d')!;
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(v, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
                }
            }
        });
        return () => svc.recreate();
    }, []);

    const onDetect = async () => {
        const v = kfVideo.value;
        if (!v) {
            alert('Carga un video');
            return;
        }
        const sampleFPS = 10;
        const dt = 1 / sampleFPS;
        const sampleW = 160;
        const sampleH = Math.max(1, Math.round(sampleW * (v.videoHeight / v.videoWidth)));
        kfProgress.value = 0;
        kfStatus.value = 'Muestreando…';
        const svc = svcSig.value!;
        svc.post({op: 'reset', w: sampleW, h: sampleH});

        const sc = document.createElement('canvas');
        sc.width = sampleW;
        sc.height = sampleH;
        const sctx = sc.getContext('2d', {willReadFrequently: true})!;
        sctx.imageSmoothingEnabled = false;
        let done = 0;
        const total = Math.max(1, Math.floor(v.duration / dt));
        for (let t = 0; t <= v.duration - 0.01; t += dt) {
            await seekVideo(v, t);
            sctx.drawImage(v, 0, 0, sc.width, sc.height);
            const img = sctx.getImageData(0, 0, sc.width, sc.height);
            svc.post({op: 'push', w: sc.width, h: sc.height, time: t, buf: img.data.buffer},);
            done++;
            kfProgress.value = Math.round(done / total * 100);
        }
        kfStatus.value = 'Detectando…';
        svc.post({op: 'detect', threshold: kfThreshold.value});
    };

    const onMakeSpritesheet = async () => {
        const v = kfVideo.value;
        if (!v) {
            alert('Carga un video');
            return;
        }
        const selected = kfMarkers.value.filter((_, i) => kfSelected.value.includes(i));
        if (!selected.length) {
            alert('No hay keyframes seleccionados');
            return;
        }
        const bitmaps: ImageBitmap[] = [];
        const sc = document.createElement('canvas');
        sc.width = v.videoWidth;
        sc.height = v.videoHeight;
        const sctx = sc.getContext('2d', {willReadFrequently: true})!;
        for (const t of selected) {
            await seekVideo(v, Math.min(t, v.duration - 0.01));
            sctx.drawImage(v, 0, 0, sc.width, sc.height);
            bitmaps.push(await createImageBitmap(sc));
        }
        const targetH = 120;
        const frames = await Promise.all(bitmaps.map(async bmp => resizeBitmap(bmp, Math.floor(bmp.width * (targetH / bmp.height)), targetH)));
        const {canvas, atlas} = buildSimpleGridAtlas(frames, {
            frameW: frames[0].width,
            frameH: frames[0].height,
            columns: Math.ceil(Math.sqrt(frames.length)),
            padding: 2,
            extrude: 1,
            names: frames.map((_, i) => `kf_${i}`),
            fps: 12
        });
        canvas.toBlob(b => {
            if (!b) return;
            downloadBlob(b, 'spritesheet.png');
        }, 'image/png');
        downloadBlob(new Blob([JSON.stringify(atlas, null, 2)], {type: 'application/json'}), 'spritesheet.json');
    };

    return (
        <div class="content">
            <aside>
                <div class="row"><label>Video</label><input type="file" accept="video/*" onChange={e => {
                    const f = (e.currentTarget as HTMLInputElement).files?.[0];
                    if (!f) return;
                    const url = URL.createObjectURL(f);
                    const v = videoRef.current!;
                    v.src = url;
                    v.onloadedmetadata = () => kfStatus.value = `dur:${v.duration.toFixed(2)}s`;
                }}/></div>
                <div class="row"><label>Umbral (auto)</label><input type="range" min="0" max="1" step="0.01"
                                                                    value={kfThreshold.value}
                                                                    onInput={e => kfThreshold.value = parseFloat((e.currentTarget as HTMLInputElement).value)}/>
                </div>
                <div class="row">
                    <button onClick={onDetect}>Detectar keyframes</button>
                </div>
                <div class="row small">{kfStatus} — prog {kfProgress}%</div>
                <div class="row"><label>Selecciona keyframes</label>
                    <div class="small" style="display:grid; gap:6px; max-height:40vh; overflow:auto">
                        {kfMarkers.value.map((t, i) => (
                            <label style="display:flex; gap:6px; align-items:center"><input type="checkbox"
                                                                                            checked={kfSelected.value.includes(i)}
                                                                                            onInput={e => {
                                                                                                const arr = [...kfSelected.value];
                                                                                                const idx = arr.indexOf(i);
                                                                                                if ((e.currentTarget as HTMLInputElement).checked) {
                                                                                                    if (idx < 0) arr.push(i);
                                                                                                } else {
                                                                                                    if (idx >= 0) arr.splice(idx, 1);
                                                                                                }
                                                                                                kfSelected.value = arr;
                                                                                            }}/>{t.toFixed(2)}s</label>
                        ))}
                    </div>
                </div>
                <div class="row">
                    <button onClick={onMakeSpritesheet}>Construir spritesheet</button>
                </div>
            </aside>
            <main>
                <video ref={videoRef} style="display:none" playsInline muted></video>
                <canvas ref={canvasRef} width={640} height={360}></canvas>
            </main>
        </div>
    );
}

function seekVideo(v: HTMLVideoElement, t: number) {
    return new Promise<void>(res => {
        const onSeek = () => {
            v.removeEventListener('seeked', onSeek);
            res();
        };
        v.addEventListener('seeked', onSeek, {once: true});
        v.currentTime = t;
    });
}

async function resizeBitmap(bmp: ImageBitmap, w: number, h: number) {
    const off = new OffscreenCanvas(w, h);
    const ctx = off.getContext('2d', {willReadFrequently: true})!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bmp, 0, 0, w, h);
    const out = await (off as any).transferToImageBitmap?.() ?? await createImageBitmap(off as any);
    return out as ImageBitmap;
}

function downloadBlob(b: Blob, name: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = name;
    a.click();
}