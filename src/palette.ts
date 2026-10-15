export type ThemeMode = 'light' | 'dark' | 'system';
export const lightPalette = {
 bg:'#F9FAF6', white:'#FFFFFF', ink:'#213D35', muted:'#596A60',
 green:'#0F6E56', primary:'#0F6E56', onPrimary:'#FFFFFF', soft:'#EAF2E6',
 border:'#E0E6DE', borderStrong:'#A6BE9A', amber:'#8B580D', yellow:'#F5E8C9',
 red:'#A32D2D', danger:'#A32D2D', errorBg:'#FAEDEA',
 input:'#FAFBF8', placeholder:'#64736A', subtle:'#F5F7F2', welcome:'#EBF1E3',
 hover:'#EFF4EA', hero:'#1E604B', heroText:'#FFFFFF', heroMuted:'#D6E6D7',
 heroButton:'#E8F0DD', heroButtonText:'#0F6E56', inactive:'#DCE1DB',
 success:'#0F6E56', warning:'#BA7517', urgent:'#A32D2D',
 toast:'#294C3D', toastText:'#FFFFFF', overlay:'#132B2580',
};
export type Palette = typeof lightPalette;
export const darkPalette: Palette = {
 bg:'#101B17', white:'#1A2922', ink:'#EDF4EB', muted:'#A9B9AC',
 green:'#8CD7AE', primary:'#176D50', onPrimary:'#FFFFFF', soft:'#263C2E',
 border:'#344A3C', borderStrong:'#6C9778', amber:'#EAC379', yellow:'#3E3320',
 red:'#FFA79D', danger:'#9C3535', errorBg:'#402A29',
 input:'#14221B', placeholder:'#94A69A', subtle:'#203128', welcome:'#233829',
 hover:'#2B4433', hero:'#204C38', heroText:'#F1F7EE', heroMuted:'#D0E2CD',
 heroButton:'#DCEACF', heroButtonText:'#154832', inactive:'#536257',
 success:'#69D39C', warning:'#E5BC62', urgent:'#F18E88',
 toast:'#D7E8D2', toastText:'#203D2D', overlay:'#000000B3',
};
export function resolveTheme(mode:ThemeMode, system:'light'|'dark'|null|undefined):'light'|'dark' {
 return mode==='system'?(system==='dark'?'dark':'light'):mode;
}
export function savedTheme(value:string|null):ThemeMode {
 return value==='light'||value==='dark'||value==='system'?value:'system';
}
