import {useRef} from 'preact/hooks';
import {ssCols, ssExtrude, ssFps, ssImages, ssPadding, ssStatus} from '../features/spritesheet/signals';
import {buildSimpleGridAtlas} from '../lib/export/atlas';
import {framesToGIF} from '../lib/export/gif';

export function SpritesheetTab() {
    const prevRef = useRef<HTMLCanvasElement>(null);

    const onImport = async (e: Event) => {
        const files = (e.currentTarget as HTMLInputElement).files;
        if (!files) return;
        const imgs: ImageBitmap[] = [];
        for (const f of Array.from(files)) {
            const img = await createImageBitmap(await blobFromFile(f));
            imgs.push(img);
        }
        ssImages.value = imgs;
        ssStatus.value = `${imgs.length} images loaded`;
    };

    const onBuild = async () => {
        if (!ssImages.value.length) {
            alert('Import images');
            return;
        }
        const w = ssImages.value[0].width, h = ssImages.value[0].height;
        const {canvas, atlas} = buildSimpleGridAtlas(ssImages.value, {
            frameW: w,
            frameH: h,
            columns: ssCols.value,
            padding: ssPadding.value,
            extrude: ssExtrude.value,
            names: ssImages.value.map((_, i) => `img_${i}`),
            fps: ssFps.value
        });
        const pv = prevRef.current!;
        const ctx = pv.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, pv.width, pv.height);
        const scale = Math.min(pv.width / canvas.width, pv.height / canvas.height);
        const dw = Math.floor(canvas.width * scale), dh = Math.floor(canvas.height * scale);
        const dx = Math.floor((pv.width - dw) / 2), dy = Math.floor((pv.height - dh) / 2);
        ctx.drawImage(canvas, dx, dy, dw, dh);
        canvas.toBlob(b => {
            if (b) downloadBlob(b, 'spritesheet.png');
        }, 'image/png');
        downloadBlob(new Blob([JSON.stringify(atlas, null, 2)], {type: 'application/json'}), 'spritesheet.json');
    };

    const onExportGIF = async () => {
        if (!ssImages.value.length) {
            alert('Import images');
            return;
        }
        // Export frames as an animated GIF using current FPS
        const blob = await framesToGIF(ssImages.value, ssFps.value);
        downloadBlob(blob, 'pixForge.gif');
    };

    return (
        <div class="content">

            <aside>

                <div class="row"><label>Import images</label><input type="file" accept="image/*" multiple
                                                                    onChange={onImport}/></div>
                <div class="row"><label>Columns</label><input type="number" placeholder="auto" onInput={e => {
                    const v = (e.currentTarget as HTMLInputElement).value;
                    ssCols.value = v ? parseInt(v) : undefined;
                }}/></div>
                <div class="row"><label>Padding</label><input type="number" value={ssPadding.value}
                                                              onInput={e => ssPadding.value = parseInt((e.currentTarget as HTMLInputElement).value || '0')}/>
                </div>
                <div class="row"><label>Extrude</label><input type="number" value={ssExtrude.value}
                                                              onInput={e => ssExtrude.value = parseInt((e.currentTarget as HTMLInputElement).value || '0')}/>
                </div>
                <div class="row"><label>FPS (preview)</label><input type="number" value={ssFps.value}
                                                                    onInput={e => ssFps.value = parseInt((e.currentTarget as HTMLInputElement).value || '12')}/>
                </div>
                <div class="row">
                    <button onClick={onBuild}>Build + Export</button>
                </div>
                <div class="row">
                    <button onClick={onExportGIF}>Export Animated GIF</button>
                </div>
                <div class="row small">{ssStatus}</div>
            </aside>
            <main>
                <h1>Work in Progress...</h1>
                <canvas ref={prevRef} width={640} height={360}></canvas>
            </main>
        </div>
    );
}

async function blobFromFile(f: File) {
    return new Blob([new Uint8Array(await f.arrayBuffer())], {type: f.type});
}

function downloadBlob(b: Blob, name: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = name;
    a.click();
}