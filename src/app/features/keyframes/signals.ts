import {signal} from '@preact/signals';

export const kfVideo = signal<HTMLVideoElement | null>(null);
export const kfThreshold = signal(0.25); // 0..1
export const kfMarkers = signal<number[]>([]); // seconds
export const kfSelected = signal<number[]>([]); // indices to export
export const kfProgress = signal(0);
export const kfStatus = signal('');