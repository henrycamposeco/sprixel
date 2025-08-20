import './app.css'
import {signal} from "@preact/signals";
import {PixelizeTab} from "./app/tabs/PixelizeTab.tsx";
import {SpritesheetTab} from "./app/tabs/SpritesheetTab.tsx";
const currentTab = signal<'pixelize'|'sheets' | 'colorLab'>('pixelize');
export function App(){

    return (
        <div className="sprixel-root">

            {/* HEADER */}
            <header>
                <div className="container topbar">
                    <div className="brand" aria-label="Sprixel">
                        <span className="logo" aria-hidden="true"/>
                        <span>Sprixel</span>
                    </div>
                </div>
            </header>

            {/* HERO */}
            <section className="hero">
                <div className="container">
                    <h1>Pixelize & Spritesheet Lab</h1>
                    <p>
                        Transform your videos into stunning pixel art, export and use them wherever you want.
                    </p>
                </div>
            </section>

            {/* TABS */}
            <section className="container tabs" id="tabs">
                <div className="head tab-head head">
                    <button
                        className={`pill ${currentTab.value === "pixelize" ? "pill--active" : ""}`}
                        onClick={() => currentTab.value="pixelize"}
                    >
                        Pixelize
                    </button>
                    <button
                        className={`pill ${currentTab.value === "sheets" ? "pill--active" : ""}`}
                        onClick={() => currentTab.value = "sheets" }
                    >
                        Spritesheet Lab
                    </button>
                    <button
                        className={`pill ${currentTab.value === "colorLab" ? "pill--active" : ""}`}
                        onClick={() => currentTab.value = "colorLab"}
                    >
                        Color Lab
                    </button>
                </div>

                {/* ============== PIXELIZE TAB ============== */}
                {currentTab.value === "pixelize" && (
                    <PixelizeTab/>
                )}

                {/* ============== SPRITESHEET LAB TAB ============== */}
                {currentTab.value === "sheets" && (
                    <SpritesheetTab/>
                )}

                {/* ============== COLOR LAB TAB ============== */}
                {currentTab.value === "colorLab" && (
                    <div className="tab-shell">
                        <div className="container layout" style="grid-template-columns:1fr;">
                            <section className="panel">
                                <h3 style="margin:.25rem 0 .5rem;">Color lab</h3>
                                <p style="color:var(--muted); max-width:70ch;">
                                    Exciting new feature coming soon! Color Lab will be your creative space for crafting
                                    custom color palettes and using them to create stunning pixel art. Stay tuned for
                                    tools to design, save and apply unique color schemes to your pixel art projects.
                                </p>
                            </section>
                        </div>

                    </div>
                )}
            </section>

            {/* FOOTER / STATUS */}
            <footer>
                <div className="container footerbar">
                    <span>© {new Date().getFullYear()} Sprixel</span>
                    <span className="status" aria-live="polite">statusText</span>
                </div>
            </footer>
        </div>
    );
}