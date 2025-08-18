import {useEffect, useRef} from 'preact/hooks';
import {signal} from '@preact/signals';
import {PALETTES} from '../lib/palettes';
import {
    pxDither,
    pxDitherIntensity,
    pxDur,
    pxFps,
    pxPalette,
    pxPreviewFrame,
    pxProgress,
    pxStart,
    pxStatus,
    pxTargetH,
    pxVideo
} from '../features/pixelize/signals';
import {PixelizeService} from '../features/pixelize/usePixelizeService';
import {framesToWebM} from '../lib/export/webm';
import {framesToGIF} from '../lib/export/gif';

const serviceSig = signal<PixelizeService | null>(null);

export function PixelizeTab() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const framesRef = useRef<ImageBitmap[]>([]);

    useEffect(() => {
        pxVideo.value = videoRef.current;
    }, []);
    useEffect(() => {
        const svc = new PixelizeService();
        serviceSig.value = svc;
        svc.onMessage((e) => {
            const {op} = e.data;
            if (op === 'frameDone') {
                const {index, bitmap} = e.data;
                framesRef.current[index] = bitmap;
                const pct = framesRef.current.filter(Boolean).length / framesRef.current.length;
                pxProgress.value = Math.round(pct * 100);
                if (pct === 1) {
                    pxStatus.value = `Listo: ${framesRef.current.length} frames`;
                    playFrames(canvasRef.current!, framesRef.current, pxFps.value);
                }
            }
        });
        return () => svc.recreate();
    }, []);

    const onProcess = async () => {
        const v = pxVideo.value;
        if (!v) {
            alert('Carga un video');
            return;
        }


        // Limpiar el canvas y mostrar estado de procesando
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d')!;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0f1115'; // Color de fondo del tema
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#8892a6'; // Color muted
            ctx.font = '14px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('Procesando...', canvas.width / 2, canvas.height / 2);
        }
        const start = pxStart.value;
        const end = Math.min(v.duration, start + pxDur.value);
        const total = Math.max(1, Math.floor((end - start) * pxFps.value));
        framesRef.current = new Array(total);
        pxProgress.value = 0;
        pxStatus.value = 'Procesando...';

        const svc = serviceSig.value!;
        svc.post({
            op: 'config',
            cfg: {
                paletteId: pxPalette.value,
                dither: pxDither.value,
                intensity: pxDitherIntensity.value,
                targetH: pxTargetH.value
            }
        });

        const sc = document.createElement('canvas');
        sc.width = v.videoWidth;
        sc.height = v.videoHeight;
        const sctx = sc.getContext('2d', {willReadFrequently: true})!;
        for (let i = 0; i < total; i++) {
            const t = start + (i / total) * (end - start);
            await seekVideo(v, Math.min(t, v.duration - 0.01));
            sctx.drawImage(v, 0, 0, sc.width, sc.height);
            const bmp = await createImageBitmap(sc);
            svc.post({op: 'frame', index: i, bitmap: bmp});
        }
        svc.post({op: 'flush'});
    };

    const onPreviewChange = async () => {
        const v = pxVideo.value;
        if (!v) return;
        const sc = document.createElement('canvas');
        sc.width = v.videoWidth;
        sc.height = v.videoHeight;
        const sctx = sc.getContext('2d')!;
        await seekVideo(v, pxPreviewFrame.value);
        sctx.drawImage(v, 0, 0, sc.width, sc.height);
        
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        
        // Limpiar el canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calcular el aspect ratio y centrar la imagen
        const scale = Math.min(canvas.width / sc.width, canvas.height / sc.height);
        const dw = Math.floor(sc.width * scale);
        const dh = Math.floor(sc.height * scale);
        const dx = Math.floor((canvas.width - dw) / 2);
        const dy = Math.floor((canvas.height - dh) / 2);
        
        ctx.drawImage(sc, dx, dy, dw, dh);
    };
    useEffect(() => {
        onPreviewChange();
    }, [pxPreviewFrame.value, pxVideo.value]);

    const onExportWebM = async () => {
        if (!framesRef.current.length) {
            alert('Primero procesa el clip');
            return;
        }
        const blob = await framesToWebM(framesRef.current, pxFps.value, {w: 640, h: 360});
        downloadBlob(blob, 'pixel-clip.webm');
    };

    const onExportGIF = async () => {
        if (!framesRef.current.length) {
            alert('Primero procesa el clip');
            return;
        }
        const pal = PALETTES[pxPalette.value];
        const fixed = pal?.type === 'fixed' ? pal : undefined;
        const blob = await framesToGIF(framesRef.current, pxFps.value, fixed as any);
        downloadBlob(blob, 'pixel-clip.gif');
    };

    const onExportPNGs = async () => {
        if (!framesRef.current.length) {
            alert('Primero procesa el clip');
            return;
        }
        for (let i = 0; i < framesRef.current.length; i++) {
            const f = framesRef.current[i];
            const cnv = document.createElement('canvas');
            cnv.width = f.width;
            cnv.height = f.height;
            cnv.getContext('2d')!.drawImage(f, 0, 0);
            await new Promise(res => cnv.toBlob(b => {
                if (b) downloadBlob(b, `frame_${String(i).padStart(4, '0')}.png`);
                setTimeout(res, 40);
            }, 'image/png'));
        }
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
                    v.onloadedmetadata = () => {
                        pxStatus.value = `${v.videoWidth}×${v.videoHeight}  dur:${v.duration.toFixed(2)}s`;
                    };
                }}/></div>
                <div class="row"><label>Inicio</label><input type="number" step="0.1" value={pxStart.value}
                                                             onInput={e => pxStart.value = parseFloat((e.currentTarget as HTMLInputElement).value || '0')}/>
                </div>
                <div class="row"><label>Duración</label><input type="number" step="0.1" value={pxDur.value}
                                                               onInput={e => pxDur.value = parseFloat((e.currentTarget as HTMLInputElement).value || '10')}/>
                </div>
                <div class="row"><label>FPS</label><input type="number" step="1" value={pxFps.value}
                                                          onInput={e => pxFps.value = parseInt((e.currentTarget as HTMLInputElement).value || '15')}/>
                </div>
                <div class="row"><label>Altura destino</label><input type="number" step="2" value={pxTargetH.value}
                                                                     onInput={e => pxTargetH.value = parseInt((e.currentTarget as HTMLInputElement).value || '120')}/>
                </div>
                <div class="row"><label>Paleta</label><select value={pxPalette.value}
                                                              onInput={e => pxPalette.value = (e.currentTarget as HTMLSelectElement).value}>
                    {Object.values(PALETTES).map(p => <option value={p.id}>{p.label}</option>)}
                </select></div>
                <div class="row"><label>Dithering</label><select value={pxDither.value}
                                                                 onInput={e => pxDither.value = (e.currentTarget as HTMLSelectElement).value as any}>
                    <option value="none">None</option>
                    <option value="ordered">Ordered</option>
                    <option value="error">Error Diffusion</option>
                </select></div>
                <div class="row"><label>Intensidad</label><input type="range" min="0" max="1" step="0.05"
                                                                 value={pxDitherIntensity.value}
                                                                 onInput={e => pxDitherIntensity.value = parseFloat((e.currentTarget as HTMLInputElement).value)}/>
                </div>
                <div class="row">
                    <button onClick={onProcess}>Procesar</button>
                </div>
                <div class="row">
                    <button onClick={onExportWebM}>Export WebM</button>
                </div>
                <div class="row">
                    <button onClick={onExportGIF}>Export GIF</button>
                    <span class="small muted">(usa paleta fija si está disponible)</span></div>
                <div class="row">
                    <button onClick={onExportPNGs}>Export PNG frames</button>
                </div>
                <div class="row small">Progreso: {pxProgress} % — {pxStatus}</div>
            </aside>
            <main>
                <video ref={videoRef} style="display:none" playsInline muted></video>
                <div class="row" style="padding:12px">
                    <label>Preview frame (s)</label>
                    <input type="range" min={0} max={pxVideo.value?.duration ?? 0} step={0.05}
                           value={pxPreviewFrame.value}
                           onInput={e => pxPreviewFrame.value = parseFloat((e.currentTarget as HTMLInputElement).value)}/>
                </div>
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

function playFrames(canvas: HTMLCanvasElement, frames: ImageBitmap[], fps: number) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    
    ctx.imageSmoothingEnabled = false;
    let i = 0;
    let animationId: number | undefined;
    
    const draw = () => {
        if (frames.length === 0) return; // Stop if no frames
        
        const f = frames[i];
        const scale = Math.min(canvas.width / f.width, canvas.height / f.height);
        const dw = Math.floor(f.width * scale);
        const dh = Math.floor(f.height * scale);
        const dx = Math.floor((canvas.width - dw) / 2);
        const dy = Math.floor((canvas.height - dh) / 2);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(f, dx, dy, dw, dh);
        
        i = (i + 1) % frames.length;
        animationId = setTimeout(draw, 1000 / fps);
    };
    
    // Return cleanup function
    const stop = () => {
        if (animationId !== undefined) {
            clearTimeout(animationId);
            animationId = undefined;
        }
    };
    
    draw();
    return stop;
}
function downloadBlob(b: Blob, name: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = name;
    a.click();
}