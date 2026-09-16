"""Convert NASA's "ISS complete 2011" Lightwave package into the atlas manifest and chunk layout.
Usage: python scripts/convert-station.py [WORK_DIR=work/iss] [STATION_MAP=scripts/station.json] [--stats]
Requires numpy. Source package and credit: public/ATTRIBUTION.md and docs/iss-explorer-plan.md.
Reads every LWO2 object layer the scene loads, bakes each layer's world transform from the scene's
motion channels and parent chain, converts Lightwave's left-handed frame to three.js, triangulates,
computes area-weighted normals with hard edges above 60 degrees, and writes atlas.json plus .bin chunks.
"""
import sys,json,re,struct,math
from pathlib import Path
import numpy as np
import importlib.util
spec=importlib.util.spec_from_file_location('lwo_materials',Path(__file__).with_name('lwo-materials.py'));appearance=importlib.util.module_from_spec(spec);spec.loader.exec_module(appearance)
root=Path(__file__).resolve().parents[1]
args=[a for a in sys.argv[1:] if not a.startswith('--')];flags=set(a for a in sys.argv[1:] if a.startswith('--'))
work=Path(args[0]) if len(args)>0 else root/'work/iss'
station=json.loads((Path(args[1]) if len(args)>1 else root/'scripts/station.json').read_text(encoding='utf8'))
out=root/'public/models';out.mkdir(parents=True,exist_ok=True)
textures=appearance.TextureExporter(work,out);materials=[];material_ids={}
SCENE=work/'Scenes/ISS complete_2011.lws'
UNIT=0.0254 # Scene units are inches: the P6 to S6 truss spans about 4,290 units, the real 109 m.
SMOOTH=math.cos(math.radians(60)) # Adjacent faces meeting at more than 60 degrees keep a hard edge.
FLIP=True # Lightwave polygons face the side where their vertices wind clockwise; after the mirror below they wind the three.js way only when reversed.
# Lightwave is left-handed Y-up, +Z forward. The scene's station-local frame is X forward, Y starboard, Z zenith.
# three.js viewer frame: +Z forward (toward the camera in the front view), -X starboard, +Y zenith. Determinant -1, so this is the required mirror.
FRAME=np.array([[0,-1,0],[0,0,1],[1,0,0]],dtype=np.float64)*UNIT
ROOT='ISS PIVOT' # The scene's root null only poses the station for the reference renders; it is treated as identity.

def parse_scene(path):
 items=[];cur=None;chan=None
 for raw in path.read_text(errors='replace').splitlines():
  s=raw.strip()
  if s.startswith('LoadObjectLayer '):
   _,layer,hid,file=s.split(' ',3);cur={'id':hid,'layer':int(layer),'file':file.strip(),'ch':[None]*9,'parent':None,'pivot':None};items.append(cur);chan=None
  elif s.startswith('AddNullObject '):
   _,hid,name=s.split(' ',2);cur={'id':hid,'null':name,'ch':[None]*9,'parent':None,'pivot':None};items.append(cur);chan=None
  elif s.startswith('AddCamera') or s.startswith('AddLight'):cur=None
  elif cur is None:continue
  elif s.startswith('Channel '):chan=int(s.split()[1])
  elif s.startswith('Key ') and chan is not None and cur['ch'][chan] is None:
   v=s.split();cur['ch'][chan]=float(v[1]);assert float(v[2])==0,f'first key not at time 0: {s}'
  elif s.startswith('ParentItem '):cur['parent']=s.split()[1]
  elif s.startswith('PivotPosition '):cur['pivot']=tuple(map(float,s.split()[1:4]))
  elif s.startswith('PivotRotation '):raise SystemExit(f'PivotRotation is not supported: {s}')
 for it in items:
  if any(c is None for c in it['ch']):it['ch']=[c if c is not None else d for c,d in zip(it['ch'],[0,0,0,0,0,0,1,1,1])]
 return items

def rotation(h,p,b):
 ch,sh,cp,sp,cb,sb=math.cos(h),math.sin(h),math.cos(p),math.sin(p),math.cos(b),math.sin(b)
 ry=np.array([[ch,0,sh],[0,1,0],[-sh,0,ch]]);rx=np.array([[1,0,0],[0,cp,-sp],[0,sp,cp]]);rz=np.array([[cb,-sb,0],[sb,cb,0],[0,0,1]])
 return ry@rx@rz # heading about Y, then pitch about X, then bank about Z, each in the parent's frame

def local_matrix(it,layer_pivot):
 c=it['ch'];r=rotation(c[3],c[4],c[5])*np.array(c[6:9]);pivot=np.array(it['pivot'] if it['pivot'] is not None else layer_pivot)
 m=np.eye(4);m[:3,:3]=r;m[:3,3]=np.array(c[:3])-r@pivot;return m

def read_lwo(path):
 d=path.read_bytes();assert d[:4]==b'FORM' and d[8:12]==b'LWO2',f'{path.name}: not an LWO2 file'
 pos=12;tags=[];layers=[];layer=None
 def vx(b,o):
  if b[o]==0xFF:return struct.unpack_from('>I',b,o)[0]&0xFFFFFF,o+4
  return struct.unpack_from('>H',b,o)[0],o+2
 while pos+8<=len(d):
  tag=d[pos:pos+4];n=struct.unpack_from('>I',d,pos+4)[0];body=d[pos+8:pos+8+n];pos+=8+n+(n&1)
  if tag==b'TAGS':
   o=0
   while o<len(body):
    e=body.index(b'\0',o);tags.append(body[o:e].decode('latin1'));o=e+1;o+=o&1
  elif tag==b'LAYR':
   number,flags=struct.unpack_from('>HH',body,0);pivot=struct.unpack_from('>3f',body,4);name=body[16:body.index(b'\0',16)].decode('latin1')
   layer={'number':number,'hidden':bool(flags&1),'pivot':pivot,'name':name,'points':np.zeros((0,3),np.float32),'polys':[],'surface':[]};layers.append(layer)
  elif tag==b'PNTS':
   if layer is None:layer={'number':0,'hidden':False,'pivot':(0,0,0),'name':'','points':None,'polys':[],'surface':[]};layers.append(layer)
   layer['points']=np.frombuffer(body,dtype='>f4').astype(np.float32).reshape(-1,3)
  elif tag==b'POLS' and body[:4]==b'FACE':
   o=4;polys=layer['polys']
   while o<len(body):
    count=struct.unpack_from('>H',body,o)[0]&0x3FF;o+=2;poly=[]
    for _ in range(count):v,o=vx(body,o);poly.append(v)
    polys.append(poly)
   layer['surface']=[-1]*len(polys)
  elif tag==b'PTAG' and body[:4]==b'SURF':
   o=4;surface=layer['surface']
   while o<len(body):
    p,o=vx(body,o);t=struct.unpack_from('>H',body,o)[0];o+=2;surface[p]=t
 return {'tags':tags,'layers':{l['number']:l for l in layers}}

def slug(s):return re.sub(r'-+','-',re.sub(r'[^a-z0-9]+','-',s.lower())).strip('-')
def clean(s):return re.sub(r'\s+',' ',s.replace('_',' ').replace('-',' ')).strip()

def build_mesh(points,polys):
 """Triangulate polygons, split vertices at hard edges, and return positions, int16 normals, and indices."""
 tris=[];polygon_ids=[]
 for pi,poly in enumerate(polys):
  for j in range(1,len(poly)-1):
   tris.append((poly[0],poly[j+1] if FLIP else poly[j],poly[j] if FLIP else poly[j+1]));polygon_ids.append(pi)
 tri=np.array(tris,dtype=np.int64).reshape(-1,3)
 a,b,c=points[tri[:,0]],points[tri[:,1]],points[tri[:,2]]
 face=np.cross(b-a,c-a);area=np.linalg.norm(face,axis=1)
 keep=area>1e-12;tri,face,area=tri[keep],face[keep],area[keep]
 if not len(tri):return None
 unit=face/area[:,None];t=len(tri)
 # Corners are 3t+k. Faces sharing an edge within the smoothing angle share their corner vertices.
 corner=np.arange(3*t).reshape(t,3);e0=np.stack([corner[:,0],corner[:,1],corner[:,2]],1).ravel();e1=np.stack([corner[:,1],corner[:,2],corner[:,0]],1).ravel()
 v0=tri.ravel()[e0];v1=tri.ravel()[e1]
 lo=np.where(v0<v1,v0,v1);hi=np.where(v0<v1,v1,v0);clo=np.where(v0<v1,e0,e1);chi=np.where(v0<v1,e1,e0)
 order=np.lexsort((hi,lo));lo,hi,clo,chi=lo[order],hi[order],clo[order],chi[order]
 same=(lo[1:]==lo[:-1])&(hi[1:]==hi[:-1])
 fa,fb=clo[:-1][same]//3,clo[1:][same]//3;smooth=np.einsum('ij,ij->i',unit[fa],unit[fb])>=SMOOTH
 pa=np.concatenate([clo[:-1][same][smooth],chi[:-1][same][smooth]]);pb=np.concatenate([clo[1:][same][smooth],chi[1:][same][smooth]])
 label=np.arange(3*t)
 while True:
  m=np.minimum(label[pa],label[pb]);new=label.copy();np.minimum.at(new,pa,m);np.minimum.at(new,pb,m);new=new[new]
  if np.array_equal(new,label):break
  label=new
 uniq,inverse=np.unique(label,return_inverse=True)
 positions=points[tri.ravel()[uniq]]
 normals=np.zeros((len(uniq),3));np.add.at(normals,inverse,np.repeat(face,3,axis=0))
 length=np.linalg.norm(normals,axis=1);length[length==0]=1;normals/=length[:,None]
 return positions.astype(np.float32),np.clip(np.round(normals*32767),-32767,32767).astype(np.int16),inverse.reshape(-1).astype(np.uint32),tri.ravel()[uniq],np.array(polygon_ids)[keep]

items=parse_scene(SCENE);by_id={it['id']:it for it in items}
files={};skipped=[]
for it in items:
 if 'file' in it and it['file'] not in files:
  path=work/it['file']
  try:
   files[it['file']]=read_lwo(path)
   files[it['file']]['materials'],files[it['file']]['uvmaps']=appearance.read_materials(path)
  except Exception as e:files[it['file']]=None;skipped.append(f"{it['file']}: {e}")
cache={}
def world(it):
 if it['id'] in cache:return cache[it['id']]
 if it.get('null')==ROOT:m=np.eye(4)
 else:
  lwo=files.get(it.get('file'));layer=lwo['layers'].get(it['layer']-1) if lwo else None
  m=local_matrix(it,layer['pivot'] if layer else (0,0,0));parent=by_id.get(it['parent'])
  if parent is not None:m=world(parent)@m
 cache[it['id']]=m;return m

parts=[];concepts={};blob=bytearray();chunks=[];chunk=0;total_triangles=0;scene_objects=[]
def append(values):
 global blob
 while len(blob)%4:blob.append(0)
 offset=len(blob);blob.extend(values.tobytes());return offset
def flush():
 global blob,chunk
 (out/f'station-{chunk}.bin').write_bytes(blob);chunks.append({'url':f'/models/station-{chunk}.bin','bytes':len(blob)});blob=bytearray();chunk+=1
modules=station['modules'];layer_overrides=station.get('layers',{});surface_systems=station.get('surfaces',{});concept_names=station['concepts'];part_stems={}
force_split=set(station.get('split',[]));no_split=set(station.get('nosplit',[]))
for it in items:
 if 'file' not in it:continue
 stem=Path(it['file']).stem;key=f"{stem}#{it['layer']}";lwo=files.get(it['file']);record={'id':it['id'],'file':it['file'],'layer':it['layer'],'parts':0};scene_objects.append(record)
 if lwo is None:continue
 layer=lwo['layers'].get(it['layer']-1)
 if layer is None or not layer['polys']:skipped.append(f'{key}: layer has no polygons');continue
 module=modules.get(stem);assert module,f'{stem}: add it to scripts/station.json'
 override=layer_overrides.get(key,{});concept_id=override.get('concept',module['concept']);assert concept_id in concept_names,f'{key}: concept {concept_id} has no name in station.json';name=override.get('name',module['name']);system=override.get('system',module['system'])
 if layer['name'] and key not in layer_overrides and len(lwo['layers'])>1:name=f"{module['name']}: {clean(layer['name'])}"
 m=world(it);m=np.vstack([FRAME@m[:3,:],[0,0,0,1]]);points=(layer['points'].astype(np.float64)@m[:3,:3].T+m[:3,3]).astype(np.float32)
 split=(key in force_split) or (len(lwo['layers'])==1 and key not in no_split)
 groups={}
 for pi,(poly,tag) in enumerate(zip(layer['polys'],layer['surface'])):
  if len(poly)<3:continue
  groups.setdefault(tag if split else -1,[]).append(pi)
 for tag,poly_ids in sorted(groups.items(),key=lambda g:-len(g[1])):
  subgroups={}
  for pi in poly_ids:subgroups.setdefault(layer['surface'][pi],[]).append(pi)
  pp=[];nn=[];ii=[];ss=[];uu=[];draws=[];vertex_total=0;index_total=0
  for subtag,subpolys in subgroups.items():
   mesh=build_mesh(points,[layer['polys'][pi] for pi in subpolys])
   if mesh is None:continue
   positions,normals,indices,source_indices,face_polys=mesh
   surfname=lwo['tags'][subtag] if 0<=subtag<len(lwo['tags']) else ''
   mat=json.loads(json.dumps(lwo['materials'].get(surfname,{'name':surfname,'color':[.78]*3,'layers':[]})))
   uvnames={x['uvMap'] for x in mat['layers'] if x['projection']==5};assert len(uvnames)<=1,f'{stem}/{surfname}: multiple UV maps unsupported'
   uv=np.zeros((len(positions),2),np.float32)
   if uvnames:
    uvmap=lwo['uvmaps'][layer['number']][next(iter(uvnames))];remap={};old=[];uvs=[];new=[]
    for corner,vi in enumerate(indices):
     point=int(source_indices[vi]);pi=subpolys[face_polys[corner//3]];value=uvmap['corners'].get((pi,point),uvmap['points'].get(point,(0,0)));k=(int(vi),*value)
     if k not in remap:remap[k]=len(old);old.append(vi);uvs.append(value)
     new.append(remap[k])
    positions=positions[old];normals=normals[old];source_indices=source_indices[old];indices=np.array(new,np.uint32);uv=np.array(uvs,np.float32)
   for tex in mat['layers']:
    image=tex.pop('image');tex['texture']=textures.export(image)
    if tex['texture'] is None:mat.setdefault('unsupported',[]).append('Missing image: '+image)
   mat['layers']=[tex for tex in mat['layers'] if tex['texture'] is not None]
   mat['sourceObject']=it['file'];mat['sourceWorld']=world(it).T.ravel().tolist()
   mk=json.dumps(mat,sort_keys=True)
   if mk not in material_ids:material_ids[mk]=len(materials);materials.append(mat)
   draws.append({'start':index_total,'count':len(indices),'material':material_ids[mk]})
   pp.append(positions);nn.append(normals);ii.append(indices+vertex_total);ss.append(layer['points'][source_indices]);uu.append(uv);vertex_total+=len(positions);index_total+=len(indices)
  if not pp:continue
  positions=np.concatenate(pp);normals=np.concatenate(nn);indices=np.concatenate(ii);source_positions=np.concatenate(ss);uv=np.concatenate(uu)
  surface=lwo['tags'][tag] if 0<=tag<len(lwo['tags']) else ''
  pid=slug(f"{stem}-{it['layer']}"+(f'-{surface}' if split and surface else ''))
  if any(p['id']==pid for p in parts):pid=f'{pid}-{len(parts)}'
  if len(blob)>7_000_000:flush()
  po=append(positions);no=append(normals);io=append(indices);so=append(source_positions.astype(np.float32));uo=append(uv)
  part_name=f'{name}: {clean(surface)}' if split and surface and clean(surface) else name
  part_system=surface_systems.get(surface,system) if split else system
  parts.append({'id':pid,'name':part_name,'conceptId':concept_id,'system':part_system,'item':it['id'],'chunk':chunk,'positions':po,'normals':no,'indices':io,'vertexCount':len(positions),'indexCount':len(indices),'bounds':[positions.min(0).tolist(),positions.max(0).tolist()]})
  parts[-1].update(sourcePositions=so,uvs=uo,draws=draws)
  concepts.setdefault(concept_id,{'id':concept_id,'name':concept_names[concept_id],'elements':[]})['elements'].append(pid);part_stems[pid]=stem
  total_triangles+=len(indices)//3;record['parts']+=1
 for number,other in lwo['layers'].items():
  note=f"{stem}#{number+1} ({other['name'] or 'unnamed'}): not loaded by the scene"
  if other['polys'] and note not in skipped and not any(o.get('file')==it['file'] and o['layer']==number+1 for o in items):skipped.append(note)
flush()
# Group concepts: the plan's named assemblies and module folders that hold several flight elements. Parts keep their element concept.
for g in station.get('groups',[]):
 assert g['id'] not in concepts,f"group {g['id']} collides with an element concept"
 for c in g.get('concepts',[]):assert c in concepts,f"group {g['id']}: unknown concept {c}"
 elements=[p['id'] for p in parts if p['conceptId'] in g.get('concepts',[]) or part_stems[p['id']] in g.get('stems',[])]
 assert elements,f"group {g['id']} is empty"
 concepts[g['id']]={'id':g['id'],'name':g['name'],'elements':elements}
unused=set(concept_names)-{p['conceptId'] for p in parts}
assert not unused,f'named concepts with no parts: {sorted(unused)}'
lo=np.min([p['bounds'][0] for p in parts],axis=0);hi=np.max([p['bounds'][1] for p in parts],axis=0);center=((lo+hi)/2).tolist()
# Center the station on the origin so the viewer can derive its stage from the manifest bounds.
for c in chunks:
 path=out/c['url'].split('/')[-1];data=bytearray(path.read_bytes())
 for p in parts:
  if p['chunk']!=chunks.index(c):continue
  pos=np.frombuffer(data,dtype=np.float32,count=p['vertexCount']*3,offset=p['positions']).reshape(-1,3)-np.array(center,np.float32)
  data[p['positions']:p['positions']+pos.nbytes]=pos.astype(np.float32).tobytes();p['bounds']=[pos.min(0).tolist(),pos.max(0).tolist()]
 path.write_bytes(data)
lo=(lo-center).tolist();hi=(hi-center).tolist()
manifest={'version':'ISS complete 2011','source':'NASA Johnson Space Center Visual Communications Lab','scope':f'International Space Station, projected 2011 configuration · {len(scene_objects)} scene layers','parts':parts,'chunks':chunks,'triangles':total_triangles,'concepts':list(concepts.values()),'bounds':[lo,hi],'scene':{'file':'Scenes/ISS complete_2011.lws','objects':scene_objects}}
manifest.update(materials=materials,geometryPolicy='Full source triangulation; no lossy simplification',sourceTriangles=total_triangles,appearance={'method':'Original surface colors and image color layers; legacy shading approximated','unsupportedEffects':sorted(set(e for mat in materials for e in mat.get('unsupported',[])))})
(out/'atlas.json').write_text(json.dumps(manifest,separators=(',',':')))
print(json.dumps({'parts':len(parts),'concepts':len(manifest['concepts']),'triangles':total_triangles,'bytes':sum(c['bytes'] for c in chunks),'chunks':len(chunks),'sceneObjects':len(scene_objects),'objectsWithoutParts':[o['file']+'#'+str(o['layer']) for o in scene_objects if not o['parts']],'systems':sorted(set(p['system'] for p in parts)),'extentMeters':[round(b-a,2) for a,b in zip(lo,hi)],'skipped':skipped},indent=1))
if '--stats' in flags:
 # Outwardness: fraction of faces whose normal points away from the part centroid. Closed hulls should score well above 0.5.
 for p in parts:
  if p['vertexCount']<5000:continue
  b=(out/chunks[p['chunk']]['url'].split('/')[-1]).read_bytes()
  pos=np.frombuffer(b,dtype=np.float32,count=p['vertexCount']*3,offset=p['positions']).reshape(-1,3);nrm=np.frombuffer(b,dtype=np.int16,count=p['vertexCount']*3,offset=p['normals']).reshape(-1,3).astype(np.float64)
  d=pos-pos.mean(0);print(f"{p['id']:40} outward={np.mean(np.einsum('ij,ij->i',d,nrm)>0):.2f} center={np.round(pos.mean(0),1).tolist()}")
