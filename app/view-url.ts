import type {Atlas,SceneState,Concept} from './anatomy';
const views=['three-quarter','front','side','back'];
export function restoreView(hash:string,atlas:Atlas,initial:SceneState,start:number,end:number):{state:SceneState;chosen:Concept|null}{
 const params=new URLSearchParams(hash.replace(/^#/,'')),state={...initial,visible:[...initial.visible],selected:[] as string[]};
 if(params.has('systems'))state.visible=[...new Set((params.get('systems')??'').split(','))].filter((id):id is SceneState['visible'][number]=>initial.visible.includes(id as SceneState['visible'][number]));
 const view=params.get('view');if(view&&views.includes(view))state.view=view as SceneState['view'];
 const date=params.get('date');if(date&&/^\d{4}-\d{2}-\d{2}$/.test(date)){const at=Date.parse(`${date}T00:00:00Z`);if(Number.isFinite(at)&&new Date(at).toISOString().slice(0,10)===date)state.assembly=Math.max(start,Math.min(end,at));}
 const explode=Number(params.get('explode'));if(Number.isFinite(explode)&&state.assembly===null)state.explode=Math.max(0,Math.min(1,explode/100));
 if(state.explode>.8)state.view='front';
 let chosen=atlas.concepts.find(c=>c.id===params.get('element'))??null;
 if(chosen)state.selected=chosen.elements;
 else{const part=atlas.parts.find(p=>p.id===params.get('part'));if(part){chosen={id:part.conceptId,name:part.name,elements:[part.id]};state.selected=[part.id];}}
 state.isolate=state.selected.length>0&&state.assembly===null&&params.get('isolate')==='1';
 if(state.isolate)state.explode=0;
 return{state,chosen};
}
export function viewHash(state:SceneState,atlas:Atlas){
 const params=new URLSearchParams();params.set('view',state.view);params.set('systems',state.visible.join(','));
 if(state.assembly!==null)params.set('date',new Date(state.assembly).toISOString().slice(0,10));
 if(state.explode)params.set('explode',String(Math.round(state.explode*100)));
 if(state.selected.length){const selected=new Set(state.selected),concept=atlas.concepts.find(c=>c.elements.length===selected.size&&c.elements.every(id=>selected.has(id)));if(concept)params.set('element',concept.id);else params.set('part',state.selected[0]);}
 if(state.isolate)params.set('isolate','1');return `#${params}`;
}
