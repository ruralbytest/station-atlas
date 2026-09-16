"""Compare all triangles against an independently retained pre-simplification conversion.
Usage: python scripts/validate-source-geometry.py work/audit/raw-model public/models
Vertex duplication at material/UV seams is allowed. Triangle positions and winding must match.
"""
import json,sys
from pathlib import Path
import numpy as np

def load(directory):
 base=Path(directory);a=json.loads((base/'atlas.json').read_text());buffers=[(base/c['url'].split('/')[-1]).read_bytes() for c in a['chunks']]
 return a,buffers
def triangles(p,buffers):
 b=buffers[p['chunk']];v=np.frombuffer(b,dtype='<f4',count=p['vertexCount']*3,offset=p['positions']).reshape(-1,3);i=np.frombuffer(b,dtype='<u4',count=p['indexCount'],offset=p['indices']).reshape(-1,3)
 t=v[i]
 # Choose lexicographically minimal cyclic corner rotation, preserving winding.
 options=np.stack([np.roll(t,-k,axis=1).reshape(-1,9) for k in range(3)],axis=1)
 keys=options.copy().view([('v'+str(i),'<f4') for i in range(9)]).reshape(-1,3)
 ordered=options[np.arange(len(options)),np.argsort(keys,axis=1)[:,0]]
 order=np.lexsort(ordered.T[::-1]);return np.ascontiguousarray(ordered[order])
old,ob=load(sys.argv[1]);new,nb=load(sys.argv[2]);by_id={p['id']:p for p in new['parts']}
assert len(old['parts'])==len(new['parts'])
for p in old['parts']:
 q=by_id[p['id']]
 for field in ('conceptId','system','item','indexCount','bounds'):assert p[field]==q[field],(p['id'],field)
 assert np.array_equal(triangles(p,ob),triangles(q,nb)),p['id']+': source triangles changed'
print(f"All {len(old['parts'])} parts and {old['triangles']:,} oriented triangles match the pre-simplification source conversion exactly. No geometric component can have been removed.")
