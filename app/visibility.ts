import type {Part,SceneState} from './anatomy';
/** Shared by the counter, rendered geometry and picking visibility. */
export function visibilityFor(state:SceneState){
 const systems=new Set(state.visible),selected=new Set(state.selected);
 return (part:Part,launch:number)=>
  (state.isolate?selected.has(part.id):systems.has(part.system)||selected.has(part.id))&&
  (state.assembly===null||launch<=state.assembly);
}
