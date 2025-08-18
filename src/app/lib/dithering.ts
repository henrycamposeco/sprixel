export type DitherMode = 'none'|'ordered'|'error';
export interface DitherConfig { mode:DitherMode; intensity?:number } // intensity: 0..1 typical

export const BAYER4 = [
    0, 8, 2,10,
    12, 4,14, 6,
    3,11, 1, 9,
    15, 7,13, 5
];
export const clamp8 = (v:number)=> v<0?0:(v>255?255:v);