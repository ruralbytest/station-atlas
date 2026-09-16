import {useEffect,useRef} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {createExplosionLayout} from './explosion-layout';
import {decodeModelResponse} from './model-download';
import {PointerTap} from './pointer-tap';
import {partLaunchTimes} from './assembly';
import {SYSTEMS,type Atlas,type SceneState} from './anatomy';
import type {Theme} from './theme';
import {visibilityFor} from './visibility';
import {measureFreeBox,observeFreeBox} from './scene-viewport';
import {sourceMaterial,textureKey} from './source-material';
interface Props {atlas:Atlas;state:SceneState;theme:Theme;onSelect:(id:string)=>void;onProgress:(n:number)=>void;onError:(s:string)=>void}
export default function StationScene({atlas,state,theme,onSelect,onProgress,onError}:Props){
 const currentTheme=useRef(theme);currentTheme.current=theme;
 const host=useRef<HTMLDivElement>(null),latest=useRef(state),select=useRef(onSelect);
 latest.current=state;select.current=onSelect;
 useEffect(()=>{
  const el=host.current!;let disposed=false,frame=0,dirty=true,ready=false,lastView='',lastReset=-1,lastIsolate='',layoutKey='',amount=0;
  let lastState:SceneState|null=null;
  const abort=new AbortController();
  let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch{onError('This browser could not start the 3D viewer. Please try a browser with WebGL enabled.');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<768?1.5:2));renderer.setClearColor('#f3f4f4',0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;el.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Interactive International Space Station model. Drag to orbit, pinch or scroll to zoom, and tap a structure to inspect it.');
  // Camera limits and framing come from the manifest's overall bounds, not a fixed human-scale stage.
  const [boundsLo,boundsHi]=atlas.bounds??[[-1,-1,-1],[1,1,1]];
  const stationSize=new T.Vector3(boundsHi[0]-boundsLo[0],boundsHi[1]-boundsLo[1],boundsHi[2]-boundsLo[2]);
  const stationCenter=new T.Vector3((boundsLo[0]+boundsHi[0])/2,(boundsLo[1]+boundsHi[1])/2,(boundsLo[2]+boundsHi[2])/2);
  const stationDiagonal=stationSize.length();
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,stationDiagonal*.00015,stationDiagonal*4),controls=new OrbitControls(camera,renderer.domElement);
  camera.position.set(stationCenter.x+stationDiagonal*.3,stationCenter.y+stationDiagonal*.18,stationCenter.z+stationDiagonal*.4);controls.target.copy(stationCenter);controls.enableDamping=true;controls.dampingFactor=.085;controls.minDistance=stationDiagonal*.0004;controls.maxDistance=stationDiagonal*3.5;controls.maxPolarAngle=Math.PI*.96;controls.addEventListener('change',()=>{dirty=true;});
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);scene.environment=env.texture;room.dispose();pmrem.dispose();
  // Soft studio lighting keeps the system colors legible against the pale backdrop.
  const ambient=new T.AmbientLight(0xffffff,.2),hemisphere=new T.HemisphereLight(0xf4f8ff,0xb9b5ad,.45);scene.add(ambient,hemisphere);
  const sun=new T.DirectionalLight(0xfff6ea,1.5);sun.position.set(-3,2.2,4);scene.add(sun);
  const fill=new T.DirectionalLight(0xe0edff,.35);fill.position.set(3,1,-2);scene.add(fill);
  let lastTheme:Theme|undefined;
  const width=T.MathUtils.ceilPowerOfTwo(atlas.parts.length),data=new Float32Array(width*4),partTexture=new T.DataTexture(data,width,1,T.RGBAFormat,T.FloatType);partTexture.needsUpdate=true;
  const selectedData=new Uint8Array(width*4),selectionTexture=new T.DataTexture(selectedData,width,1);selectionTexture.needsUpdate=true;
  const materials:T.Material[]=[],geometries:T.BufferGeometry[]=[],pickers:(T.Mesh|undefined)[]=[],centers=atlas.parts.map(p=>new T.Vector3().fromArray(p.bounds[0]).add(new T.Vector3().fromArray(p.bounds[1])).multiplyScalar(.5));
  const offsets:T.Vector3[]=[],bounds=atlas.parts.map(p=>new T.Box3(new T.Vector3().fromArray(p.bounds[0]),new T.Vector3().fromArray(p.bounds[1])));
  let packingWidth=1,packingHeight=1;
  // Launch history is a visibility filter in the source reference layout, not a docking simulation.
  const launches=partLaunchTimes(atlas),systemIndex=atlas.parts.map(p=>SYSTEMS.findIndex(sys=>sys.id===p.system));
  const markerPositions=new Float32Array(atlas.parts.length*3),markerGeometry=new T.BufferGeometry();markerGeometry.setAttribute('position',new T.BufferAttribute(markerPositions,3));
  const markerMaterial=new T.PointsMaterial({color:0x64748b,size:5,sizeAttenuation:false,transparent:true,opacity:.72,depthTest:false});
  markerMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif (distance(gl_PointCoord, vec2(0.5)) > 0.5) discard;');};
  const markers=new T.Points(markerGeometry,markerMaterial);markers.frustumCulled=false;markers.renderOrder=10;markers.visible=false;scene.add(markers);
  const hover=document.createElement('div');hover.className='part-hover';hover.setAttribute('role','tooltip');hover.hidden=true;el.appendChild(hover);
  type Target={index:number;x:number;y:number;left:number;right:number;top:number;bottom:number};let targets:Target[]=[];
  const projected=new T.Vector3();
  const findTarget=(x:number,y:number,radius:number)=>{
   let best=-1,score=Infinity;
   for(const t of targets){const dx=Math.max(t.left-x,0,x-t.right),dy=Math.max(t.top-y,0,y-t.bottom),distance=Math.hypot(dx,dy);if(distance>radius)continue;const candidate=distance+Math.hypot(t.x-x,t.y-y)*.025;if(candidate<score){score=candidate;best=t.index;}}
   return best;
  };
  const materialFor=(system:string,source?:T.MeshStandardMaterial)=>{
   const m=source??new T.MeshStandardMaterial({color:SYSTEMS.find(s=>s.id===system)?.color??'#aebbb8',metalness:.08,roughness:.7,envMapIntensity:.7,side:T.DoubleSide});
   const compile=m.onBeforeCompile.bind(m);
   m.onBeforeCompile=shader=>{
    compile(shader,renderer);
    shader.uniforms.partState={value:partTexture};shader.uniforms.selectionState={value:selectionTexture};shader.uniforms.stateWidth={value:width};
    shader.vertexShader='attribute float partIndex; uniform sampler2D partState; uniform sampler2D selectionState; uniform float stateWidth; varying float partVisible; varying float partSelected;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvec2 stateUv = vec2((partIndex + 0.5) / stateWidth, 0.5); vec4 state = texture2D(partState, stateUv); transformed += state.xyz; partVisible = state.w; partSelected = texture2D(selectionState, stateUv).r;');
    shader.fragmentShader='varying float partVisible; varying float partSelected;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif (partVisible < 0.5) discard;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','#include <alphatest_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.85, 0.78), partSelected * 0.55);');
   };materials.push(m);return m;
  };
  const mats=new Map(SYSTEMS.map(s=>[s.id,materialFor(s.id)]));
  const textures=new Map<string,T.Texture>(),sourceMats:T.Material[]=[],sourceMaterialIds:number[]=[];
  let loaded=0;
  const loadChunk=async(ci:number)=>{
   const chunk=atlas.chunks[ci],compressed=!!chunk.gzip&&typeof DecompressionStream!=='undefined';const response=await fetch(compressed?chunk.gzip!:chunk.url,{signal:abort.signal});const buffer=await decodeModelResponse(response,chunk.bytes,compressed);if(disposed)return;
   const groups=new Map<string,T.BufferGeometry[]>();
   atlas.parts.forEach((p,i)=>{
    if(p.chunk!==ci)return;
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(buffer,p.positions,p.vertexCount*3),3));
    // GPU normalized signed-short normals keep the complete atlas compact in memory.
    g.setAttribute('normal',new T.BufferAttribute(new Int16Array(buffer,p.normals,p.vertexCount*3),3,true));g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,p.indices,p.indexCount),1));
    if(p.sourcePositions!==undefined)g.setAttribute('sourcePosition',new T.BufferAttribute(new Float32Array(buffer,p.sourcePositions,p.vertexCount*3),3));
    if(p.uvs!==undefined)g.setAttribute('sourceUv',new T.BufferAttribute(new Float32Array(buffer,p.uvs,p.vertexCount*2),2));
    g.boundingBox=bounds[i].clone();g.computeBoundingSphere();const pick=new T.Mesh(g);pick.matrixAutoUpdate=false;pickers[i]=pick;geometries.push(g);
    g.setAttribute('partIndex',new T.BufferAttribute(new Float32Array(p.vertexCount).fill(i),1));
    if(p.draws?.length&&sourceMats.length){
     for(const draw of p.draws){
      // Compact each surface range before batching, while retaining the original part index for picking.
      const surface=new T.BufferGeometry(),remap=new Map<number,number>(),old:number[]=[],index=new Uint32Array(draw.count);
      for(let j=0;j<draw.count;j++){const vi=g.index!.getX(draw.start+j);if(!remap.has(vi)){remap.set(vi,old.length);old.push(vi);}index[j]=remap.get(vi)!;}
      for(const [name,attr] of Object.entries(g.attributes)){const values=new (attr.array.constructor as typeof Float32Array)(old.length*attr.itemSize);old.forEach((vi,j)=>{for(let a=0;a<attr.itemSize;a++)values[j*attr.itemSize+a]=attr.array[vi*attr.itemSize+a];});surface.setAttribute(name,new T.BufferAttribute(values,attr.itemSize,attr.normalized));}
      surface.setIndex(new T.BufferAttribute(index,1));geometries.push(surface);const key=`source:${sourceMaterialIds[draw.material]}`,list=groups.get(key)??[];list.push(surface);groups.set(key,list);
     }
    }else{const list=groups.get(p.system)??[];list.push(g);groups.set(p.system,list);}
   });
   groups.forEach((gs,system)=>{const geometry=mergeGeometries(gs,false);if(!geometry)throw new Error('Could not assemble station geometry.');geometries.push(geometry);const mesh=new T.Mesh(geometry,system.startsWith('source:')?sourceMats[Number(system.slice(7))]:mats.get(system as never));mesh.frustumCulled=false;scene.add(mesh);});
   lastState=null;loaded++;onProgress(Math.round(loaded/atlas.chunks.length*100));dirty=true;
  };
  (async()=>{try{
   const layers=new Map(atlas.materials?.flatMap(m=>m.layers.map(layer=>[textureKey(layer),layer] as const))??[]);
   const wrap=(n:number)=>n===1?T.RepeatWrapping:n===2?T.MirroredRepeatWrapping:T.ClampToEdgeWrapping;
   await Promise.all([...layers].map(async([key,layer])=>{const texture=await new T.TextureLoader().loadAsync(layer.texture.url);if(disposed){texture.dispose();return;}texture.colorSpace=T.SRGBColorSpace;texture.wrapS=wrap(layer.wrap[0]);texture.wrapT=wrap(layer.wrap[1]);texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.set(key,texture);}));
   if(disposed)return;
   const equivalent=new Map<string,number>();
   for(const source of atlas.materials??[]){const key=JSON.stringify({color:source.color,diffuse:source.diffuse,specular:source.specular,glossiness:source.glossiness,reflection:source.reflection,transparency:source.transparency,luminosity:source.luminosity,layers:source.layers,world:source.layers.some(l=>l.world)?source.sourceWorld:undefined});let index=equivalent.get(key);if(index===undefined){index=sourceMats.length;equivalent.set(key,index);sourceMats.push(materialFor('',sourceMaterial(source,textures)));}sourceMaterialIds.push(index);}
   let cursor=0;await Promise.all(Array.from({length:3},async()=>{while(cursor<atlas.chunks.length){const i=cursor++;await loadChunk(i);}}));if(!disposed){ready=true;dirty=true;}
  }catch(e){if(!disposed)onError(e instanceof Error?e.message:'Could not load the station model or its source textures.');}})();
  // Screen rectangle left free by the panels, dock, caption, and camera rail; the exploded inventory is framed into it.
  let availableBox=measureFreeBox(el);const freeBox=()=>availableBox;
  const fit=(view:string,extent=0)=>{
   const effectiveView=extent>.8?'front':view;
   const direction=effectiveView==='front'?new T.Vector3(0,.02,1):effectiveView==='back'?new T.Vector3(0,.02,-1):effectiveView==='side'?new T.Vector3(1,.02,0):new T.Vector3(.35,.3,1).normalize();direction.normalize();
   const rightAxis=new T.Vector3().crossVectors(camera.up,direction).normalize(),upAxis=new T.Vector3().crossVectors(direction,rightAxis).normalize();
   const projectedSize=(axis:T.Vector3)=>Math.abs(axis.x)*stationSize.x+Math.abs(axis.y)*stationSize.y+Math.abs(axis.z)*stationSize.z;
   const halfFov=T.MathUtils.degToRad(camera.fov/2);
   const fb=freeBox(),W=el.clientWidth,H=el.clientHeight,atlasDistance=Math.max(packingHeight*H/Math.max(80,fb.b-fb.t),packingWidth*H/Math.max(120,fb.r-fb.l))/(2*Math.tan(halfFov))*1.04;
   const normalDistance=Math.max(projectedSize(upAxis)*H/Math.max(80,fb.b-fb.t),projectedSize(rightAxis)*H/Math.max(120,fb.r-fb.l))/(2*Math.tan(halfFov))*1.08+projectedSize(direction)/2;
   if(!latest.current.isolate)camera.setViewOffset(W,H,W/2-(fb.l+fb.r)/2,H/2-(fb.t+fb.b)/2,W,H);
   const distance=T.MathUtils.lerp(normalDistance,Math.max(.2,atlasDistance),extent);
   controls.maxDistance=Math.max(stationDiagonal*3.5,distance*2);
   camera.far=controls.maxDistance+stationDiagonal*2;camera.updateProjectionMatrix();
   controls.target.set(stationCenter.x,stationCenter.y,stationCenter.z);camera.position.copy(controls.target).addScaledVector(direction,distance);controls.update();dirty=true;
  };
  const resize=()=>{layoutKey='';lastState=null;renderer.setPixelRatio(Math.min(devicePixelRatio,el.clientWidth<768||el.clientHeight<600?1.5:2));camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);fit(latest.current.view,amount);};const observer=new ResizeObserver(resize);observer.observe(el);
  const stopObservingPanels=observeFreeBox(el,box=>{availableBox=box;layoutKey='';lastState=null;lastIsolate='';if(!latest.current.isolate)fit(latest.current.view,amount);dirty=true;});
  const raycaster=new T.Raycaster(),pointer=new T.Vector2(),tap=new PointerTap(),worldBox=new T.Box3(),hitPoint=new T.Vector3();
  const down=(e:PointerEvent)=>{hover.hidden=true;tap.down(e.pointerId,e.clientX,e.clientY,e.pointerType==='touch'?12:5);};
  const move=(e:PointerEvent)=>{tap.move(e.pointerId,e.clientX,e.clientY);if(e.buttons||amount<.5||e.pointerType==='touch'){hover.hidden=true;return;}const rect=el.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top,index=findTarget(x,y,12);hover.hidden=index<0;renderer.domElement.style.cursor=index<0?'grab':'pointer';if(index>=0){hover.textContent=atlas.parts[index].name;hover.style.left=`${Math.max(8,Math.min(x+14,el.clientWidth-260))}px`;hover.style.top=`${Math.max(8,Math.min(y+18,el.clientHeight-55))}px`;}};
  const cancel=(e:PointerEvent)=>tap.cancel(e.pointerId);
  const up=(e:PointerEvent)=>{
   const validTap=tap.up(e.pointerId,e.clientX,e.clientY);if(!validTap||!ready)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
   let nearest=Infinity,found=-1;
   pickers.forEach((mesh,i)=>{if(!mesh||data[i*4+3]<.5)return;worldBox.copy(bounds[i]).translate(mesh.position);if(!raycaster.ray.intersectBox(worldBox,hitPoint))return;const hits=raycaster.intersectObject(mesh,false);if(hits[0]&&hits[0].distance<nearest){nearest=hits[0].distance;found=i;}});
   if(found<0&&amount>.45)found=findTarget(e.clientX-rect.left,e.clientY-rect.top,e.pointerType==='touch'?24:16);if(found>=0){hover.hidden=true;select.current(atlas.parts[found].id);}
  };
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',cancel);
  const clock=new T.Clock();let lastExtent=-1;
  const animate=()=>{
   if(disposed)return;frame=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),s=latest.current;
   if(lastTheme!==currentTheme.current){const dark=currentTheme.current==='dark';ambient.color.set(dark?0x8fa2c9:0xffffff);ambient.intensity=dark?.1:.2;hemisphere.color.set(dark?0x9fb4d8:0xf4f8ff);hemisphere.groundColor.set(dark?0x05070c:0xb9b5ad);hemisphere.intensity=dark?.25:.45;sun.intensity=dark?2.2:1.5;fill.intensity=dark?.15:.35;lastTheme=currentTheme.current;dirty=true;}
   const changed=lastState?.visible!==s.visible||lastState?.selected!==s.selected||lastState?.isolate!==s.isolate||lastState?.assembly!==s.assembly;
   const moving=Math.abs(amount-s.explode)>.0001;
   if(moving){amount=T.MathUtils.damp(amount,s.explode,8,dt);dirty=true;}
   if(changed||moving||lastExtent<0){
    const visible=new Set(s.visible),selection=new Set(s.selected),isVisible=visibilityFor(s);
    const visibleParts=atlas.parts.filter(p=>s.isolate?selection.has(p.id):visible.has(p.system)||selection.has(p.id));
    const nextLayoutKey=visibleParts.map(p=>p.id).join(',')+':'+camera.aspect.toFixed(3);
    if(nextLayoutKey!==layoutKey){const layout=createExplosionLayout(visibleParts,(b=>(b.r-b.l)/Math.max(80,b.b-b.t))(freeBox()));packingWidth=layout.width;packingHeight=layout.height;atlas.parts.forEach((p,i)=>{const cell=layout.cells.get(p.id);offsets[i]=cell?new T.Vector3(cell.x,cell.y+stationCenter.y,(bounds[i].min.z-bounds[i].max.z)/2):centers[i].clone();});layoutKey=nextLayoutKey;if(amount>.05&&!s.isolate)fit(s.view,Math.max(0,(amount-.3)/.7));}

    atlas.parts.forEach((p,i)=>{
     const c=centers[i],destination=offsets[i];let dx=0,dy=0,dz=0;
     // Phase one: parts slide outward along the truss axis in proportion to their distance from center, with a small
     // vertical spread by system so overlapping structures separate. Phase two lerps into the packed inventory grid.
     const group=systemIndex[i],spread=stationSize.y*.3,startDx=(c.x-stationCenter.x)*.5,startDy=(group/Math.max(1,SYSTEMS.length-1)-.5)*spread;
     if(amount<=.45){const t=amount/.45;dx=startDx*t;dy=startDy*t;dz=0;}
     else {const t=(amount-.45)/.55;dx=T.MathUtils.lerp(startDx,destination.x-c.x,t);dy=T.MathUtils.lerp(startDy,destination.y-c.y,t);dz=T.MathUtils.lerp(0,destination.z-c.z,t);}
     const selected=selection.has(p.id);data.set([dx,dy,dz,isVisible(p,launches[i])?1:0],i*4);selectedData[i*4]=selected?255:0;
     markerPositions.set(data[i*4+3]>.5?[c.x+dx,c.y+dy,c.z+dz]:[10000,10000,10000],i*3);const mesh=pickers[i];if(mesh){mesh.position.set(dx,dy,dz);mesh.updateMatrix();mesh.updateMatrixWorld(true);}
    });partTexture.needsUpdate=true;selectionTexture.needsUpdate=true;markerGeometry.attributes.position.needsUpdate=true;lastState=s;lastExtent=amount;dirty=true;
   }
   if(s.view!==lastView||s.reset!==lastReset){fit(s.view,amount);lastView=s.view;lastReset=s.reset;}
   if(moving&&!s.isolate)fit(amount>.5?'front':s.view,Math.max(0,(amount-.3)/.7));
   const isolateKey=s.isolate?s.selected.join(',')+':'+s.reset+':'+s.inspectorOpen+':'+camera.aspect:'';
   if(isolateKey!==lastIsolate||(s.isolate&&moving)){
    if(s.isolate){const box=new T.Box3();atlas.parts.forEach((p,i)=>{if(s.selected.includes(p.id))box.union(bounds[i].clone().translate(new T.Vector3(data[i*4],data[i*4+1],data[i*4+2])));});
     if(!box.isEmpty()){const center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());const w=el.clientWidth,h=el.clientHeight,{l:left,r:right,t:top,b:bottom}=freeBox();const availableWidth=Math.max(150,right-left),availableHeight=Math.max(40,bottom-top);camera.setViewOffset(w,h,w/2-(left+right)/2,h/2-(top+bottom)/2,w,h);const distance=Math.max(.07,Math.max(size.y*h/availableHeight,size.x*w/availableWidth/camera.aspect,size.z)/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))*1.35);controls.maxDistance=Math.max(40,distance*2);controls.target.copy(center);camera.position.copy(center).add(new T.Vector3(.2,.1,1).normalize().multiplyScalar(distance));controls.update();dirty=true;}
    }else if(lastIsolate){camera.clearViewOffset();fit(s.view,amount);}
    lastIsolate=isolateKey;
   }
   controls.enableRotate=amount<.8;controls.mouseButtons.LEFT=amount<.8?T.MOUSE.ROTATE:T.MOUSE.PAN;controls.touches.ONE=amount<.8?T.TOUCH.ROTATE:T.TOUCH.PAN;markers.visible=amount>.75;controls.autoRotate=s.rotate&&!s.isolate&&amount<.4;controls.autoRotateSpeed=.65;controls.update();if(controls.autoRotate)dirty=true;
   if(dirty){renderer.render(scene,camera);targets=[];if(amount>.45){atlas.parts.forEach((p,i)=>{if(data[i*4+3]<.5)return;let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;for(let corner=0;corner<8;corner++){projected.set(p.bounds[(corner&1)?1:0][0]+data[i*4],p.bounds[(corner&2)?1:0][1]+data[i*4+1],p.bounds[(corner&4)?1:0][2]+data[i*4+2]).project(camera);const x=(projected.x+1)*el.clientWidth/2,y=(1-projected.y)*el.clientHeight/2;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}projected.copy(centers[i]).add(new T.Vector3(data[i*4],data[i*4+1],data[i*4+2])).project(camera);if(projected.z< -1||projected.z>1)return;targets.push({index:i,x:(projected.x+1)*el.clientWidth/2,y:(1-projected.y)*el.clientHeight/2,left,right,top,bottom});});}dirty=false;}

  };animate();
  const contextLost=(e:Event)=>{e.preventDefault();onError('The 3D session was paused by your device. Reload to continue.');};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  return()=>{disposed=true;abort.abort();cancelAnimationFrame(frame);observer.disconnect();stopObservingPanels();controls.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());scene.traverse(o=>{if(o instanceof T.Mesh&&!geometries.includes(o.geometry)){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});env.dispose();partTexture.dispose();selectionTexture.dispose();markerGeometry.dispose();markerMaterial.dispose();hover.remove();renderer.dispose();renderer.domElement.remove();};
 },[atlas]);
 return <div className="scene" ref={host}/>;
}
