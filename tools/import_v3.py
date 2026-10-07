from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,json
from scipy.ndimage import label,find_objects,binary_dilation
r=Path(__file__).resolve().parents[1];src=r/'originales';m=json.loads((r/'js/assets.js').read_text().split(' = ')[1].rstrip(';\n'))
def save(kind,frames):
 m[kind]=[]
 for i,fr in enumerate(frames):
  fr.save(r/f'assets/sprites/{kind}-{i}.png');m[kind].append({'w':fr.width,'h':fr.height})
def components(name,white=False):
 im=Image.open(src/name).convert('RGBA');a=np.array(im)
 if white:
  bg=(a[:,:,:3].min(axis=2)>230);lb,n=label(bg);ids=np.unique(np.r_[lb[0],lb[-1],lb[:,0],lb[:,-1]]);a[:,:,3][np.isin(lb,ids[ids>0])]=0
 lb,n=label(a[:,:,3]>110);obs=find_objects(lb);cs=[(i+1,s) for i,s in enumerate(obs) if (lb[s]==i+1).sum()>18000];cs.sort(key=lambda c:c[1][1].start);out=[]
 for idx,s in cs:
  b=a.copy();b[:,:,3]=np.where(binary_dilation(lb==idx,iterations=2),a[:,:,3],0);out.append(Image.fromarray(b).crop((max(0,s[1].start-3),max(0,s[0].start-3),min(im.width,s[1].stop+3),min(im.height,s[0].stop+3))))
 return out
for kind,name,white in [('toxicWalk','BOTELLA INTOXICADA.png',False),('toxicRun','BOTELLA CORRIENDO INTOXICADA.png',False),('toxicCrouch','BOTELLA AGACHADA INTOXICADA.png',True),('toxicShoot','BOTELLA INTOXICADA DISPARA.png',False)]:
 f=components(name,white);print(kind,len(f),[(i.size) for i in f]);save(kind,f)
for kind,name,cols,rows in [('blockWalk','ENEMIGO 2 CAMINANDO.png',4,2),('blockPose','ENEMIGO 2.png',4,2),('blockDeath','ENEMIGO 2 EXPLOTA.png',5,2)]:
 im=Image.open(src/name);frames=[]
 for j in range(rows):
  for i in range(cols):
   fr=im.crop((round(i*im.width/cols),round(j*im.height/rows),round((i+1)*im.width/cols),round((j+1)*im.height/rows)));box=fr.getbbox();frames.append(fr.crop(box) if box else fr)
 save(kind,frames)
im=Image.open(src/'BOTELLA ROMPIENDOSE.png');a=np.array(im);lb,n=label(a[:,:,3]>110);cs=[(i+1,s) for i,s in enumerate(find_objects(lb)) if (lb[s]==i+1).sum()>30000];cs.sort(key=lambda c:c[1][1].start);frames=[]
for idx,s in cs:
 b=a.copy();b[:,:,3]=np.where(binary_dilation(lb==idx,iterations=2),a[:,:,3],0);frames.append(Image.fromarray(b).crop((max(0,s[1].start-3),s[0].start-3,s[1].stop+3,s[0].stop+3)))
for l,rr in [(1218,1488),(1488,1760),(1760,2048)]:frames.append(im.crop((l,70,rr,682)))
save('damage',frames)
for i,f in enumerate(m['damage']):f['anchorY']=f['h'] if i<5 else 525

im=Image.open(src/'BOTELLA INTOXICADA DISPARA.png');save('toxicBall',[im.crop((1680,240,2048,425))])
(r/'js/assets.js').write_text('window.ASSET_META = '+json.dumps(m)+';\n')
