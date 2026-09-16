export interface FreeBox {l:number;r:number;t:number;b:number}
const selectors=['.identity','.top-actions','.view-controls','.layers-panel','.bottom-dock','.scene-caption','.history-scope','.detail-sheet'];
/** Read actual panel bounds so CSS remains the source of layout dimensions. */
export function measureFreeBox(host:HTMLElement):FreeBox{
 const root=host.getBoundingClientRect(),w=root.width,h=root.height,pad=16;
 const box={l:pad,r:w-pad,t:pad,b:h-pad};
 for(const selector of selectors){
  const element=document.querySelector<HTMLElement>(selector);if(!element)continue;
  const style=getComputedStyle(element),rect=element.getBoundingClientRect();
  if(style.display==='none'||style.visibility==='hidden'||!rect.width||!rect.height)continue;
  const left=rect.left-root.left,right=rect.right-root.left,top=rect.top-root.top,bottom=rect.bottom-root.top;
  if(selector==='.identity'||selector==='.top-actions')box.t=Math.max(box.t,bottom+pad);
  else if(selector==='.bottom-dock'||selector==='.scene-caption'||selector==='.history-scope')box.b=Math.min(box.b,top-pad);
  else if(selector==='.view-controls'){if(rect.width>rect.height)box.t=Math.max(box.t,bottom+pad);else box.r=Math.min(box.r,left-pad);}
  else if(selector==='.layers-panel'){if(!element.classList.contains('mobile-open'))box.l=Math.max(box.l,right+pad);}
  else if(selector==='.detail-sheet'){if(rect.width>w*.6)box.b=Math.min(box.b,top-pad);else box.r=Math.min(box.r,left-pad);}
 }
 // A small landscape screen can have very little space between controls.
 box.r=Math.max(box.l+80,box.r);box.b=Math.max(box.t+40,box.b);return box;
}
export function observeFreeBox(host:HTMLElement,update:(box:FreeBox)=>void){
 let frame=0,last='',disposed=false;
 const schedule=()=>{if(!frame&&!disposed)frame=requestAnimationFrame(()=>{frame=0;const box=measureFreeBox(host),key=JSON.stringify(box);if(key!==last){last=key;update(box);}});};
 const resize=new ResizeObserver(schedule),observed=new Set<Element>();
 const sync=()=>{const nodes=[host,...selectors.flatMap(selector=>[...document.querySelectorAll(selector)])];for(const old of observed)if(!nodes.includes(old)){resize.unobserve(old);observed.delete(old);}for(const node of nodes)if(!observed.has(node)){resize.observe(node);observed.add(node);}schedule();};
 const mutation=new MutationObserver(records=>{if(records.some(record=>record.type==='childList'||(record.target instanceof Element&&selectors.some(selector=>record.target instanceof Element&&record.target.matches(selector)))))sync();});
 mutation.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
 document.addEventListener('transitionend',schedule);sync();
 return()=>{disposed=true;cancelAnimationFrame(frame);resize.disconnect();mutation.disconnect();document.removeEventListener('transitionend',schedule);};
}
