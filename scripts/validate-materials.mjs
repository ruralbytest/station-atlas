import fs from 'node:fs';
import assert from 'node:assert/strict';
import {sourceMaterial,textureKey} from '../app/source-material.ts';
import * as T from 'three';
const dir=new URL('../public/',import.meta.url),atlas=JSON.parse(fs.readFileSync(new URL('models/atlas.json',dir)));
assert.equal(atlas.triangles,atlas.sourceTriangles,'The source-detail pipeline must not simplify geometry');
const buffers=atlas.chunks.map(c=>fs.readFileSync(new URL('.'+c.url,dir)));
let ranges=0,mapped=0;
for(const p of atlas.parts){
 const b=buffers[p.chunk];let count=0;
 for(const d of p.draws){assert.equal(d.start,count);assert.ok(atlas.materials[d.material]);assert.equal(d.count%3,0);count+=d.count;ranges++;}
 assert.equal(count,p.indexCount,`${p.id}: surface ranges must cover every triangle exactly once`);
 for(const [offset,size] of [[p.sourcePositions,p.vertexCount*3],[p.uvs,p.vertexCount*2]]){assert.equal(offset%4,0);assert.ok(offset+size*4<=b.length);const values=new Float32Array(b.buffer,b.byteOffset+offset,size);assert.ok(values.every(Number.isFinite));}
}
for(const source of atlas.materials){
 assert.ok(source.color.every(Number.isFinite));
 const textures=new Map();
 for(const layer of source.layers){assert.ok([0,1,2,5].includes(layer.projection));assert.ok(layer.size.every((n,i)=>Number.isFinite(n)&&(n!==0||(layer.projection===0?i===layer.axis:layer.projection===1&&i!==layer.axis))));assert.ok([0,5].includes(layer.blend),'Unsupported blend must not be silently substituted');assert.ok(fs.existsSync(new URL('.'+layer.texture.url,dir)));textures.set(textureKey(layer),new T.Texture());mapped++;}
 const material=sourceMaterial(source,textures),shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};material.onBeforeCompile(shader,{});
 assert.equal(shader.uniforms.sourceDiffuse.value,source.diffuse??1);
 assert.ok(!shader.fragmentShader.includes('NaN'));
 material.dispose();textures.forEach(t=>t.dispose());
}
console.log(`Verified ${ranges} source surface ranges, ${atlas.materials.length} materials and ${mapped} available image color layers; full source triangle count retained.`);
