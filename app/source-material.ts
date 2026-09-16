import * as T from 'three';
export interface ImageLayer {
 projection:number;axis:number;center:number[];size:number[];rotation:number[];world:boolean;
 wrap:number[];repeat:number[];uvMap:string;blend:number;opacity:number;negative:boolean;
 texture:{url:string;source:string;width:number;height:number};
}
export interface SourceMaterial {
 name:string;color:number[];diffuse?:number;specular?:number;glossiness?:number;reflection?:number;
 transparency?:number;luminosity?:number;layers:ImageLayer[];sourceWorld:number[];unsupported?:string[];
}
export const textureKey=(layer:ImageLayer)=>`${layer.texture.url}:${layer.wrap.join(',')}`;
/** Legacy Lightwave surface values mapped to a browser PBR approximation.
 * Image projection stays in the original object frame, so explode cannot slide the textures.
 * Legacy procedural, bump and reflection maps are recorded by the converter, not fabricated here.
 */
export function sourceMaterial(source:SourceMaterial,textures:Map<string,T.Texture>) {
 const color=new T.Color().setRGB(source.color[0],source.color[1],source.color[2],T.SRGBColorSpace);
 const material=new T.MeshPhysicalMaterial({color,roughness:T.MathUtils.clamp(1-(source.glossiness??.4)*.8,.12,1),specularIntensity:T.MathUtils.clamp(source.specular??0,0,1),metalness:T.MathUtils.clamp(source.reflection??0,0,1),envMapIntensity:.65,side:T.DoubleSide,opacity:1-(source.transparency??0),transparent:(source.transparency??0)>0,emissive:color,emissiveIntensity:source.luminosity??0});
 material.customProgramCacheKey=()=>JSON.stringify(source.layers.map(({projection,axis,repeat,negative,wrap,opacity,blend})=>({projection,axis,repeat,negative,wrap,opacity,blend})));
 material.onBeforeCompile=shader=>{
  shader.vertexShader='attribute vec3 sourcePosition; attribute vec2 sourceUv; varying vec3 sourcePoint; varying vec2 originalUv;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsourcePoint=sourcePosition; originalUv=sourceUv;');
  shader.uniforms.sourceDiffuse={value:Math.max(0,source.diffuse??1)};
  let declarations='varying vec3 sourcePoint; varying vec2 originalUv; uniform float sourceDiffuse;\n',sampling='vec3 sourceBase=diffuseColor.rgb;\n';
  source.layers.forEach((layer,i)=>{
   const transform=new T.Matrix4().makeRotationFromEuler(new T.Euler(layer.rotation[1],layer.rotation[0],layer.rotation[2],'YXZ'));
   transform.setPosition(new T.Vector3().fromArray(layer.center));transform.invert();
   if(layer.world)transform.multiply(new T.Matrix4().fromArray(source.sourceWorld));
   shader.uniforms[`sourceMap${i}`]={value:textures.get(textureKey(layer))};
   shader.uniforms[`sourceTransform${i}`]={value:transform};
   // Cylindrical maps often store a zero unused radial size in the source archive.
   shader.uniforms[`sourceSize${i}`]={value:new T.Vector3().fromArray(layer.size.map(n=>n===0?1:n))};
   declarations+=`uniform sampler2D sourceMap${i}; uniform mat4 sourceTransform${i}; uniform vec3 sourceSize${i};\n`;
   const coord=layer.axis===0?'q.zy':layer.axis===1?'q.xz':'q.xy';
   const longitude=layer.axis===0?'atan(p.z,p.y)':layer.axis===1?'atan(p.x,p.z)':'atan(p.y,p.x)';
   const height=layer.axis===0?'p.x':layer.axis===1?'p.y':'p.z';
   let projection=`uv=${coord}+0.5;`;
   if(layer.projection===1)projection=`uv=vec2(${longitude}/6.28318530718+0.5,${height.replace('p.','q.')}+0.5);`;
   if(layer.projection===2)projection=`uv=vec2(${longitude}/6.28318530718+0.5,asin(clamp(${height}/max(length(p),0.000001),-1.0,1.0))/3.14159265359+0.5);`;
   if(layer.projection===5)projection='uv=originalUv;';
   sampling+=`{vec3 p=(sourceTransform${i}*vec4(sourcePoint,1.0)).xyz; vec3 q=p/sourceSize${i}; vec2 uv; ${projection} uv*=vec2(${layer.repeat.map(x=>Number(x).toFixed(8)).join(',')}); vec4 texel=texture2D(sourceMap${i},uv);`;
   if(layer.negative)sampling+='texel.rgb=vec3(1.0)-texel.rgb;';
   const mask=layer.wrap.map((wrap,axis)=>wrap===0?`step(0.0,uv.${axis?'y':'x'})*step(uv.${axis?'y':'x'},1.0)`:'1.0').join('*');
   sampling+=`texel.rgb*=${mask};`;
   // Lightwave Alpha layers mask the accumulated color; they are not color decals.
   sampling+=layer.blend===5?`diffuseColor.rgb=mix(sourceBase,diffuseColor.rgb,mix(1.0,dot(texel.rgb,vec3(0.3333333333)),clamp(${layer.opacity.toFixed(8)},0.0,1.0)));}\n`:`diffuseColor.rgb=mix(diffuseColor.rgb,texel.rgb,clamp(${layer.opacity.toFixed(8)}*texel.a,0.0,1.0));}\n`;
  });
  shader.fragmentShader=declarations+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+sampling+'diffuseColor.rgb*=sourceDiffuse;');
 };
 return material;
}
