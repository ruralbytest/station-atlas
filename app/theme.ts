export type Theme='light'|'dark';
const key='station-atlas-theme';
export function readTheme():Theme{try{return localStorage.getItem(key)==='dark'?'dark':'light';}catch{return 'light';}}
export function applyTheme(theme:Theme){
 document.documentElement.classList.toggle('dark',theme==='dark');
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#05070c':'#f3f4f4');
 try{localStorage.setItem(key,theme);}catch{/* The toggle still works when storage is unavailable. */}
}
