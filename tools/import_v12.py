"""V12 · Importa el arte del nivel 5 (Bajo la superficie).

Uso:  python tools/import_v12.py <carpeta con NIVEL 5 y las hojas de la botella>
Genera assets/level5/*.webp y js/level5-assets.js (cuadros, tamaños y anclas).
Los cortes se buscan en las franjas más transparentes cerca de la división ideal de cada hoja,
así ningún tentáculo ni burbuja queda cortado.
"""
import json, sys
from pathlib import Path
from PIL import Image
import numpy as np

root = Path(__file__).resolve().parents[1]
src = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'originales-v12'
dest = root / 'assets' / 'level5'
dest.mkdir(parents=True, exist_ok=True)
meta = {}


def cut(profile, n):
    """Divide un perfil de alfa en n tramos buscando el mínimo cerca de cada división ideal."""
    size = len(profile)
    cuts = [0]
    for k in range(1, n):
        ideal = size * k / n
        lo, hi = int(ideal - size / n * 0.3), int(ideal + size / n * 0.3)
        seg = profile[lo:hi]
        cuts.append(lo + int(np.argmin(seg)))
    cuts.append(size)
    return cuts


def sheet(name, file, rows, cols, scale, count=None):
    im = Image.open(src / file).convert('RGBA')
    a = np.asarray(im)[:, :, 3].astype(float)
    a[a < 14] = 0
    rcuts = cut(a.sum(1), rows)
    out = []
    for r in range(rows):
        band = a[rcuts[r]:rcuts[r + 1]]
        ccuts = cut(band.sum(0), cols)
        for c in range(cols):
            if count is not None and len(out) >= count:
                break
            box = (ccuts[c], rcuts[r], ccuts[c + 1], rcuts[r + 1])
            cell = a[box[1]:box[3], box[0]:box[2]]
            ys, xs = np.nonzero(cell > 20)
            if not len(xs):
                continue
            x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
            crop = im.crop((box[0] + x0, box[1] + y0, box[0] + x1, box[1] + y1))
            w, h = max(1, round(crop.width * scale)), max(1, round(crop.height * scale))
            crop = crop.resize((w, h), Image.LANCZOS)
            i = len(out)
            crop.save(dest / f'{name}-{i}.webp', 'WEBP', quality=86, method=4)
            # Centro del cuerpo: promedio ponderado del alfa (ignora un poco los halos).
            ca = np.asarray(crop)[:, :, 3].astype(float)
            ca[ca < 120] = 0
            tot = ca.sum() or 1
            yy, xx = np.indices(ca.shape)
            f = {'w': w, 'h': h, 'cx': round(float((xx * ca).sum() / tot), 1), 'cy': round(float((yy * ca).sum() / tot), 1)}
            rgba = np.asarray(crop).astype(int)
            if name in ('jefe', 'cria'):
                # Farolito: el punto más cálido y brillante del cuadro.
                m = (rgba[:, :, 0] > 200) & (rgba[:, :, 1] > 140) & (rgba[:, :, 2] < 140) & (rgba[:, :, 3] > 180)
                if m.sum() > 3:
                    ly, lx = np.nonzero(m)
                    f['lx'], f['ly'] = round(float(lx.mean()), 1), round(float(ly.mean()), 1)
            if name == 'morena':
                # Ojo de buey: centro del aro de bronce (franja izquierda del cuadro).
                strip = rgba[:, : max(8, int(w * 0.2)), 3].astype(float)
                strip[strip < 150] = 0
                ys2, xs2 = np.nonzero(strip)
                f['rx'], f['ry'] = round(float(xs2.mean()), 1), round(float(ys2.mean()), 1)
            out.append(f)
    meta[name] = out
    print(f'{name}: {len(out)} cuadros')


E = 'NIVEL 5/ENEMIGOS/'
sheet('medusa', E + 'ENEMIGO MEDUSA LAMPARA NIVEL 5.png', 1, 8, 0.5)
sheet('cangrejo', E + 'ENEMIGO CANGREJO HERMITA#U00d1O NIVEL 5.png', 1, 8, 0.5)
sheet('almeja', E + 'ENEMIGO ALMEJA NIVEL 5.png', 2, 4, 0.5)
sheet('morena', E + 'ENEMIGO MEDUSA NIVEL 5.png', 2, 4, 0.5)
sheet('globo', E + 'ENEMIGO GLOBO NIVEL 5.png', 2, 4, 0.5)
sheet('pulpo', E + 'ENEMIGO PULPO NIVEL 5.png', 2, 4, 0.5)
sheet('cria', E + 'ENEMIGO PEZ NIVEL 5.png', 2, 4, 0.45)
sheet('jefe', E + 'ENEMIGO FINAL NIVEL 5.png', 3, 4, 1.0)
sheet('cae', 'botella-cayendo.png', 1, 8, 0.6)
sheet('ahoga', 'botella-ahogandose.png', 1, 8, 0.6)
sheet('nada', 'botella-nadando.png', 1, 8, 0.6)
sheet('torbellino', 'botella-torbellino.png', 1, 8, 0.6)

for i in range(1, 13):
    bg = Image.open(src / f'NIVEL 5/FONDOS/NIVEL 5 FONDO {i}.png').convert('RGB').resize((1280, 720), Image.LANCZOS)
    bg.save(dest / f'bg-{i:02d}.webp', 'WEBP', quality=84, method=4)
print('fondos: 12')

(root / 'js' / 'level5-assets.js').write_text(
    '/* V12 · Generado por tools/import_v12.py: cuadros del nivel 5 (ancho, alto y centro del cuerpo). */\n'
    'window.MilkLevel5Assets = ' + json.dumps(meta, separators=(',', ':')) + ';\n', encoding='utf-8')
