import {signal} from '@preact/signals';
import type {DitherMode} from '../../lib/dithering';

export const pxVideo = signal<HTMLVideoElement | null>(null);
export const pxStart = signal(0);
export const pxDur = signal(10);
export const pxFps = signal(15);
export const pxTargetH = signal(90);
export const pxPalette = signal('default');
export const pxDither = signal<DitherMode>('none');
export const pxDitherIntensity = signal(0.05);
export const pxPreviewFrame = signal(0);
export const pxProgress = signal(0);
export const pxStatus = signal('');