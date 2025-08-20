import { signal } from '@preact/signals';
import { PixelizeTab } from './app/tabs/PixelizeTab'
import { KeyframesTab } from './app/tabs/KeyframesTab';
import { SpritesheetTab } from './app/tabs/SpritesheetTab';
import './app.css'

const currentTab = signal<'pixelize'|'keyframes'|'spritesheet'>('pixelize');

export function App_bk(){
    return (
        <div class="layout">
            <header>
                <h1 style="margin:0;font-size:16px" class="grow">PixForge</h1>
                <nav class="tabs">
                    {['pixelize','keyframes','spritesheet'].map(id=>
                        <button class={`tab ${currentTab.value===id?'active':''}`} onClick={()=>currentTab.value=id as any}>
                            {id==='pixelize'?'Pixelizer': id==='keyframes'?'Keyframes → Spritesheet':'Spritesheet' }
                        </button>
                    )}
                </nav>
            </header>
            {currentTab.value==='pixelize' && <PixelizeTab/>}
            {currentTab.value==='keyframes' && <KeyframesTab/>}
            {currentTab.value==='spritesheet' && <SpritesheetTab/>}
        </div>
    );
}