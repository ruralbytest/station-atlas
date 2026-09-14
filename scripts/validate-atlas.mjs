import fs from 'node:fs';
import assert from 'node:assert/strict';
import {EXPLANATIONS,SOURCES,SYSTEMS} from '../app/anatomy.ts';
const filename=process.argv[2]??'atlas.json';
const base=new URL('../public/models/',import.meta.url),atlas=JSON.parse(fs.readFileSync(new URL(filename,base)));
// Expected counts come from the manifest itself: every scene object the converter saw must be represented, and the part ids must be unique.
assert.ok(atlas.version.startsWith('ISS'),'manifest is not a station build');
assert.ok(atlas.parts.length>0&&atlas.concepts.length>0);
const ids=new Set(atlas.parts.map(p=>p.id));assert.equal(ids.size,atlas.parts.length,'duplicate part ids');
const files=atlas.chunks.map(c=>{const b=fs.readFileSync(new URL(c.url.split('/').pop(),base));assert.equal(b.length,c.bytes);if(c.gzip)assert.equal(fs.statSync(new URL(c.gzip.split('/').pop(),base)).size,c.gzipBytes);return b;});
let tris=0;
for(const p of atlas.parts){assert.ok(p.name.trim()&&p.name!=='-'&&!p.name.includes('Bounds('));assert.ok(p.conceptId!=='-');assert.ok(p.system);assert.ok(p.item,`${p.id}: no scene item`);const b=files[p.chunk];assert.ok(p.indices+p.indexCount*4<=b.length);const pos=new Float32Array(b.buffer,b.byteOffset+p.positions,p.vertexCount*3),indices=new Uint32Array(b.buffer,b.byteOffset+p.indices,p.indexCount);assert.ok(indices.length>=3);for(const i of indices)assert.ok(i<p.vertexCount,`${p.id}: invalid vertex`);for(const value of pos)assert.ok(Number.isFinite(value));for(let a=0;a<3;a++)assert.ok(p.bounds[0][a]<=p.bounds[1][a]);tris+=p.indexCount/3;}
const conceptIds=new Set(atlas.concepts.map(c=>c.id));
for(const c of atlas.concepts){assert.ok(c.elements.length);for(const id of c.elements)assert.ok(ids.has(id),`${c.id}: missing ${id}`);}
for(const p of atlas.parts)assert.ok(conceptIds.has(p.conceptId),`${p.id}: concept ${p.conceptId} is not in the manifest`);
assert.equal(tris,atlas.triangles);
assert.ok(Array.isArray(atlas.bounds)&&atlas.bounds[1][0]-atlas.bounds[0][0]>100,'station bounds should span the 109 m truss');
// Every object layer the scene loads must have produced at least one part.
const objects=atlas.scene?.objects??[];assert.ok(objects.length>0,'manifest carries no scene object list');
const perItem=new Map();for(const p of atlas.parts)perItem.set(p.item,(perItem.get(p.item)??0)+1);
for(const o of objects){assert.equal(perItem.get(o.id)??0,o.parts,`${o.file}#${o.layer}: part count drifted`);assert.ok(o.parts>0,`${o.file}#${o.layer}: scene object produced no parts`);}
assert.equal([...perItem.keys()].filter(id=>!objects.some(o=>o.id===id)).length,0,'parts reference unknown scene objects');
// When the source package is present, cross-check against the scene file directly.
const scene=new URL(`../work/iss/${atlas.scene.file}`,import.meta.url);
if(fs.existsSync(scene)){const loads=[...fs.readFileSync(scene,'utf8').matchAll(/^LoadObjectLayer (\d+) ([0-9a-f]+) (.+?)\s*$/gm)];assert.equal(loads.length,objects.length,'scene LoadObjectLayer count differs from manifest');for(const [,layer,id,file] of loads)assert.ok(objects.some(o=>o.id===id&&o.layer===+layer&&o.file===file),`${file}#${layer} missing from manifest`);}
// Every part's concept has a written explanation, and every fact it states cites a nasa.gov or esa.int page.
const systemIds=new Set(SYSTEMS.map(s=>s.id));for(const p of atlas.parts)assert.ok(systemIds.has(p.system),`${p.id}: unknown system ${p.system}`);
const FACT_LABELS={launch:'Launched ',vehicle:' aboard ',agency:'Provided by ',mass:'Mass '};
for(const id of new Set(atlas.parts.map(p=>p.conceptId))){
 const text=EXPLANATIONS[id],cited=SOURCES[id];
 assert.ok(text&&text.trim(),`${id}: no explanation`);assert.ok(cited,`${id}: no sources`);
 assert.ok(cited.purpose,`${id}: purpose is unsourced`);
 for(const [fact,urls] of Object.entries(cited))for(const url of [urls].flat()){const host=new URL(url).hostname;assert.ok(host==='nasa.gov'||host.endsWith('.nasa.gov')||host==='esa.int'||host.endsWith('.esa.int'),`${id}.${fact}: ${host} is not a nasa.gov or esa.int page`);}
 for(const [fact,label] of Object.entries(FACT_LABELS))if(text.includes(label))assert.ok(cited[fact],`${id}: states ${fact} without a source`);
}
// Every concept carries a launch, and elements that flew together share one date.
for(const c of atlas.concepts){assert.match(c.launch?.date??'',/^\d{4}-\d{2}-\d{2}$/,`${c.id}: no launch date`);assert.ok(c.launch.flight&&c.launch.vehicle,`${c.id}: launch needs a flight and vehicle`);}
const flightDates=new Map();for(const id of new Set(atlas.parts.map(p=>p.conceptId))){const {flight,date}=atlas.concepts.find(c=>c.id===id).launch;assert.equal(flightDates.get(flight)??date,date,`flight ${flight} has several dates`);flightDates.set(flight,date);}
for(const id of Object.keys(EXPLANATIONS))assert.ok(atlas.concepts.some(c=>c.id===id),`explanation for unknown concept ${id}`);
console.log(`Verified ${ids.size} individually indexed meshes from ${objects.length} scene layers, ${atlas.concepts.length} concept mappings, ${tris.toLocaleString()} triangles, and every binary buffer.`);
