export type FixedPalette = { id: string; label: string; type: 'fixed'; colors: number[][] };
export type FormulaPalette = {
    id: string;
    label: string;
    type: 'formula';
    quantize: (r: number, g: number, b: number) => [number, number, number]
};
export type Palette = FixedPalette | FormulaPalette;

const HEX = (h: string) => {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const makeColors = (hex: string[]) => hex.map(HEX);

const Q = {
    rgb565: (r: number, g: number, b: number) => {
        const rq = Math.round(r / 255 * 31), gq = Math.round(g / 255 * 63), bq = Math.round(b / 255 * 31);
        return [Math.round(rq * 255 / 31), Math.round(gq * 255 / 63), Math.round(bq * 255 / 31)] as [number, number, number];
    },
    rgb332: (r: number, g: number, b: number) => {
        const rq = Math.round(r / 255 * 7), gq = Math.round(g / 255 * 7), bq = Math.round(b / 255 * 3);
        return [Math.round(rq * 255 / 7), Math.round(gq * 255 / 7), Math.round(bq * 255 / 3)] as [number, number, number];
    }
};

export const PALETTES: Record<string, Palette> = {
    rgb565: {id: 'rgb565', label: 'RGB565 (16-bit look)', type: 'formula', quantize: Q.rgb565},
    rgb332: {id: 'rgb332', label: 'RGB332 (8-bit look)', type: 'formula', quantize: Q.rgb332},
    pico8: {
        id: 'pico8', label: 'PICO-8 (16)', type: 'fixed', colors: makeColors([
            '#000000', '#1D2B53', '#7E2553', '#008751', '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
            '#FF004D', '#FFA300', '#FFEC27', '#00E436', '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'
        ])
    },
    voodo8bit: {
        id: 'voodo8bit', label: 'Voodo 8bit (6)', type: 'fixed', colors: makeColors([
            '#ffda71', '#d0a047', '#e8b08e', '#ba877f', '#7f425a', '#3e2542'
        ])
    },
    vampire: {
        id: 'vampire', label: 'Vampire (7)', type: 'fixed', colors: makeColors([
            '#050002', '#171237', '#31144f', '#3e207b', '#84266e', '#c355da', '#74aeff'
        ])
    },
    funky: {
        id: 'funky', label: 'Funky (4)', type: 'fixed', colors: makeColors([
            '#610066', '#cc0000', '#1aacf5', '#bdff99'
        ])
    },
    vinik24: {
        id: 'vinik24', label: 'Vinik24 (16)', type: 'fixed', colors: makeColors([
            '#d1b187', '#c77b58', '#ae5d40', '#79444a', '#4b3d44', '#ba9158', '#927441', '#4d4539',
            '#77743b', '#b3a555', '#d2c9a5', '#8caba1', '#4b726e', '#574852', '#847875', '#ab9b8e'
        ])
    },
    temple: {
        id: 'temple', label: 'Temple (14)', type: 'fixed', colors: makeColors([
            '#ffffff', '#d6cdd4', '#b4a8b6', '#8e8496', '#676375', '#494151',
            '#eeeeb4', '#dcbf81', '#dda082', '#d88282', '#c77b51', '#7c3b17',
            '#500d06', '#000000'
        ])
    },
    pastel: {
        id: 'pastel', label: 'Pastel (62)', type: 'fixed', colors: makeColors([
            '#F2AE99','#F2AE99','#C97373','#C97373','#A6555F','#A6555F','#873555','#873555',
            '#611851','#611851','#390947','#390947','#751756','#751756',
            '#A32858','#A32858','#CC425E','#CC425E','#EA6262','#EA6262','#F49373','#F49373',
            '#FFB879','#FFB879','#F9CD8E','#F9CD8E','#FCEF8D','#FCEF8D','#BDF767','#BDF767',
            '#99E65F','#99E65F','#5AC54F','#5AC54F','#30A15F','#30A15F','#1F8962','#1F8962',
            '#18685B','#18685B','#0E3850','#0E3850','#0D6D80','#0D6D80','#1B9C95','#1B9C95',
            '#2BBD97','#2BBD97','#4DD092','#4DD092','#65E78F','#65E78F','#84F793','#84F793',
            '#C3FF98','#C3FF98','#FFFFFF','#FFFFFF','#C9F7FF','#C9F7FF','#AEE2FF','#AEE2FF',
            '#8DB7FF','#8DB7FF','#6D80FA','#6D80FA','#5B5BEC','#5B5BEC','#6646DE','#6646DE',
            '#6128AF','#6128AF','#4E187C','#4E187C','#7D2DA0','#7D2DA0','#834DC4','#834DC4',
            '#8465EC','#8465EC','#8282FF','#8282FF','#5B34AF','#5B34AF','#A452D5','#A452D5',
            '#CD5BE3','#CD5BE3','#FF70E8','#FF70E8','#FFC3F2','#FFC3F2','#EE8FCB','#EE8FCB',
            '#D46EB3','#D46EB3','#873E84','#873E84','#1F102A','#1F102A','#4A3052','#4A3052',
            '#7B5480','#7B5480','#A6859F','#A6859F','#D9BDC8','#D9BDC8','#4C245A','#4C245A',
            '#5A3271','#5A3271','#5B4180','#5B4180','#695D97','#695D97','#8181C2','#8181C2',
            '#A0B3DE','#A0B3DE','#CBDCF2','#CBDCF2','#D1F8FF'
        ])
    },
    pastel2: {
        id: 'pastel2', label: 'Pastel2 (64)', type: 'fixed', colors: makeColors([
            '#050914','#050914','#110524','#110524','#3B063A','#3B063A','#691749','#691749',
            '#9C3247','#9C3247','#D46453','#D46453','#F5A15D','#F5A15D','#FFCF8E','#FFCF8E',
            '#FF7A7D','#FF7A7D','#FF417D','#FF417D','#D61A88','#D61A88','#94007A','#94007A',
            '#42004E','#42004E','#220029','#220029','#100726','#100726','#25082C','#25082C',
            '#3D1132','#3D1132','#73263D','#73263D','#BD4035','#BD4035','#ED7B39','#ED7B39',
            '#FFB84A','#FFB84A','#FFF540','#FFF540','#C6D831','#C6D831','#77B02A','#77B02A',
            '#429058','#429058','#2C645E','#2C645E','#153C4A','#153C4A','#052137','#052137',
            '#0E0421','#0E0421','#0C0B42','#0C0B42','#032769','#032769','#144491','#144491',
            '#488BD4','#488BD4','#78D7FF','#78D7FF','#B0FFF1','#B0FFF1','#FAFFFF','#FAFFFF',
            '#C7D4E1','#C7D4E1','#928FB8','#928FB8','#5B537D','#5B537D','#392946','#392946',
            '#24142C','#24142C','#0E0F2C','#0E0F2C','#132243','#132243','#1A466B','#1A466B',
            '#10908E','#10908E','#28C074','#28C074','#3DFF6E','#3DFF6E','#F8FFB8','#F8FFB8',
            '#F0C297','#F0C297','#CF968C','#CF968C','#8F5765','#8F5765','#52294B','#52294B',
            '#0F022E','#0F022E','#35003B','#35003B','#64004C','#64004C','#9B0E3E','#9B0E3E',
            '#D41E3C','#D41E3C','#ED4C40','#ED4C40','#FF9757','#FF9757','#D4662F','#D4662F',
            '#9C341A','#9C341A','#691B22','#691B22','#450C28','#450C28','#2D002E'
        ])
    },
};

export function quantizeByPalette(name: string, r: number, g: number, b: number): [number, number, number] {
    const p = PALETTES[name];
    if (!p) return [r, g, b];
    if (p.type === 'formula') return p.quantize(r, g, b);
    let best = 0, bd = 1e18;
    for (let i = 0; i < p.colors.length; i++) {
        const [pr, pg, pb] = p.colors[i];
        const d = (r - pr) * (r - pr) + (g - pg) * (g - pg) + (b - pb) * (b - pb);
        if (d < bd) {
            bd = d;
            best = i;
        }
    }
    const [pr, pg, pb] = p.colors[best];
    return [pr, pg, pb];
}