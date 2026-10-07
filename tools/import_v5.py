from pathlib import Path
from PIL import Image
import json,shutil
import numpy as np
from scipy.ndimage import label,binary_dilation
root=Path(__file__).resolve().parents[1]
source=root/'originales-v5';dest=root/'assets/sprites';meta={}
def frames(name,file,boxes,anchors=None):
 im=Image.open(source/file).convert('RGBA');out=[]
 for i,b in enumerate(boxes):
  crop=im.crop(b)
  if name not in ('bossRay','bossCast'):
   a=np.array(crop); labels,n=label(a[:,:,3]>70); sizes=np.bincount(labels.ravel());sizes[0]=0
   keep=binary_dilation(labels==sizes.argmax(),iterations=2);a[:,:,3]=np.where(keep,a[:,:,3],0);crop=Image.fromarray(a)
  if name=='bossCharge' and i in (0,1):
   a=np.array(crop); yy,xx=np.indices(a.shape[:2]);gx=xx+b[0];gy=yy+b[1]
   if i==0: a[((gy>500)&(gx>210))|((gy>560)&(gx>208)),3]=0
   else: a[(gy>500)&((gx<214)|(gx>467)),3]=0
   crop=Image.fromarray(a)
  crop.save(dest/f'{name}-{i}.png');out.append({'w':crop.width,'h':crop.height,'anchorX':(anchors[i] if anchors else crop.width/2),'anchorY':crop.height})
 meta[name]=out
frames('bossWalk','ENEMIGO FINAL 1.png',[(i*256,65,(i+1)*256,660) for i in range(8)])
frames('bossCharge','ENEMIGO FINAL 1 GOLPEANDO.png',[(0,130,245,620),(205,130,505,620),(505,130,765,620),(765,130,1025,620),(1025,130,1325,620)])
frames('bossCast','ENEMIGO FINAL 1 GOLPEANDO RAYO.png',[(0,110,680,800)],[360])
frames('bossRay','ENEMIGO FINAL 1 GOLPEANDO RAYO.png',[(710,260,1808,560)])
frames('chocoShoot','BOTELLA CHOCOLATADA DISPARO.png',[(437,150,694,550),(1116,150,1410,550),(1412,150,1668,550)])
frames('chocoBall','BOTELLA CHOCOLATADA DISPARO.png',[(1740,280,2005,412)])
(root/'js/assets-v5.js').write_text('Object.assign(window.ASSET_META,'+json.dumps(meta)+');\n')
