"""Read legacy LWO2 surfaces and image references without inventing replacement artwork.
Only image color layers are transferred; unsupported effects are recorded in the manifest.
TIFF/TGA assets are losslessly transcoded to PNG using Pillow.
"""
import struct, hashlib
from pathlib import Path
from PIL import Image

def chunks(b, size=2, start=0):
 p=start
 while p+4+size<=len(b):
  tag=b[p:p+4].decode('latin1');n=int.from_bytes(b[p+4:p+4+size],'big');p+=4+size
  yield tag,b[p:p+n]
  p+=n+(n&1)

def string(b,p=0):
 e=b.index(0,p);return b[p:e].decode('latin1'),e+1+((e+1-p)&1)

def vx(b,p=0):
 n=4 if b[p]==255 else 2
 return int.from_bytes(b[p:p+n],'big') & (0xffffff if n==4 else 0xffff),p+n

def floats(b,n=1):return list(struct.unpack_from('>'+str(n)+'f',b))
def integer(b):return int.from_bytes(b[:2],'big')

def read_materials(path):
 surfaces={};clips={};uvmaps={};layer=0
 for tag,b in chunks(path.read_bytes(),4,12):
  if tag=='LAYR':layer=integer(b)
  elif tag=='CLIP':
   clip=int.from_bytes(b[:4],'big');fields=dict(chunks(b,start=4))
   if 'STIL' in fields:clips[clip]=string(fields['STIL'])[0].replace('\\','/').split('/')[-1]
  elif tag in ('VMAP','VMAD') and b[:4]==b'TXUV':
   assert integer(b[4:])==2
   name,p=string(b,6);uv=uvmaps.setdefault(layer,{}).setdefault(name,{'points':{},'corners':{}})
   while p<len(b):
    point,p=vx(b,p)
    if tag=='VMAD':poly,p=vx(b,p)
    value=floats(b[p:],2);p+=8
    uv['corners' if tag=='VMAD' else 'points'][(poly,point) if tag=='VMAD' else point]=value
  elif tag=='SURF':
   name,p=string(b);parent,p=string(b,p);fields=list(chunks(b,start=p))
   surface={'name':name,'color':[.7843137]*3,'diffuse':1,'specular':0,'glossiness':.4,'reflection':0,'transparency':0,'luminosity':0,'layers':[],'unsupported':[]}
   for t,v in fields:
    if t=='COLR':surface['color']=floats(v,3)
    elif t in ('DIFF','SPEC','GLOS','REFL','TRAN','LUMI'):surface[dict(DIFF='diffuse',SPEC='specular',GLOS='glossiness',REFL='reflection',TRAN='transparency',LUMI='luminosity')[t]]=floats(v)[0]
    elif t=='BLOK':
     block=dict(chunks(v));kind=next(iter(block));ordinal,o=string(block[kind]);header=dict(chunks(block[kind],start=o))
     if integer(header.get('ENAB',b'\0\1'))==0:continue
     channel=header.get('CHAN',b'').decode('latin1')
     if kind!='IMAP' or channel!='COLR':
      surface['unsupported'].append(kind+':'+channel);continue
     tm=dict(chunks(block.get('TMAP',b'')));op=header.get('OPAC',b'\0\0?\x80\0\0')
     surface['layers'].append({'ordinal':ordinal,'clip':vx(block['IMAG'])[0],'projection':integer(block.get('PROJ',b'\0\0')),'axis':integer(block.get('AXIS',b'\0\2')),'center':floats(tm.get('CNTR',bytes(12)),3),'size':floats(tm.get('SIZE',struct.pack('>3f',1,1,1)),3),'rotation':floats(tm.get('ROTA',bytes(12)),3),'world':integer(tm.get('CSYS',b'\0\0'))==1,'wrap':list(struct.unpack('>2H',block.get('WRAP',b'\0\1\0\1'))),'repeat':[floats(block.get(k,struct.pack('>f',1)))[0] for k in ('WRPW','WRPH')],'uvMap':string(block['VMAP'])[0] if 'VMAP' in block else '', 'blend':integer(op),'opacity':floats(op[2:])[0],'negative':integer(header.get('NEGA',b'\0\0'))==1})
   surfaces[name]=surface
 for surface in surfaces.values():
  surface['layers'].sort(key=lambda x:x.pop('ordinal'))
  for layer in surface['layers']:layer['image']=clips[layer.pop('clip')]
 return surfaces,uvmaps

class TextureExporter:
 def __init__(self,work,out):
  self.files={p.name.lower():p for p in (work/'Textures').rglob('*') if p.is_file()};self.out=out/'textures';self.out.mkdir(exist_ok=True);self.cache={}
 def export(self,name):
  if name in self.cache:return self.cache[name]
  path=self.files.get(name.lower())
  if path is None:return None
  filename=hashlib.sha256(path.read_bytes()).hexdigest()[:16]+'.png'
  image=Image.open(path).convert('RGBA');image.save(self.out/filename,optimize=True)
  result={'url':'/models/textures/'+filename,'source':name,'width':image.width,'height':image.height}
  self.cache[name]=result;return result
