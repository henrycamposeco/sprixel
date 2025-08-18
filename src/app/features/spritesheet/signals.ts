import {signal} from '@preact/signals';

export const ssImages = signal<ImageBitmap[]>([]);
export const ssCols = signal<number | undefined>(undefined);
export const ssPadding = signal(2);
export const ssExtrude = signal(0);
export const ssFps = signal(12);
export const ssStatus = signal('');