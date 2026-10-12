"""V12.4 · Uniones suaves entre los fondos del nivel 5.

Los 12 fondos se pintaron por separado y al ponerlos uno al lado del otro quedaba un corte duro
(«escena pisada»). Para cada unión se genera una franja que funde el final de un fondo con el
comienzo del siguiente. Cada lado se extiende con su propio reflejo, así no aparecen fantasmas
de la otra imagen. En el agua la fusión es ancha (400 px; 600 px en la última). En el piso es angosta (120 px), para
que el borde del suelo siga coincidiendo con donde se pisa.

Uso:  python tools/seams_v12_4.py      (lee y escribe en assets/level5)
"""
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

root = Path(__file__).resolve().parents[1]
d = root / 'assets' / 'level5'
W, H = 1280, 720
WIDE, NARROW = 200, 60  # media franja en el agua y en el piso
# La última unión (barco hundido → playa luminosa) cambia mucho de luz: se funde más largo.
WIDE_BY_SEAM = {10: 300}
# Altura del piso (pies) al final y al comienzo de cada fondo; igual que js/level5-core.js.
FLOOR_END = [494, 496, 495, 480, 384, 509, 510, 510, 512, 497, 472, 521]
FLOOR_START = [494, 496, 495, 491, 383, 509, 510, 510, 512, 497, 472, 521]


def smooth(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


for i in range(11):
    ia_img = Image.open(d / f'bg-{i + 1:02d}.webp').convert('RGB')
    ib_img = Image.open(d / f'bg-{i + 2:02d}.webp').convert('RGB')
    a = np.asarray(ia_img).astype(np.float32)
    b = np.asarray(ib_img).astype(np.float32)
    # El reflejo se usa desenfocado (como agua turbia): así no se ven formas simétricas.
    ab = np.asarray(ia_img.filter(ImageFilter.GaussianBlur(16))).astype(np.float32)
    bb = np.asarray(ib_img.filter(ImageFilter.GaussianBlur(16))).astype(np.float32)
    wide = WIDE_BY_SEAM.get(i, WIDE)
    xs = np.arange(-wide, wide)  # posición relativa a la unión
    # Cada imagen se prolonga más allá de su borde con su reflejo.
    ia = np.where(xs < 0, W + xs, W - 1 - xs)
    ib = np.where(xs >= 0, xs, -1 - xs)
    A = np.where((xs < 0)[None, :, None], a[:, ia], ab[:, ia])
    B = np.where((xs >= 0)[None, :, None], b[:, ib], bb[:, ib])
    # Ancho de la fusión por fila: ancha arriba, angosta desde un poco antes del piso más alto.
    top_floor = min(FLOOR_END[i], FLOOR_START[i + 1]) - 40
    rows = np.arange(H)[:, None]
    k = smooth((rows - top_floor) / 40.0)  # 0 en el agua, 1 en el piso
    half = wide * (1 - k) + NARROW * k
    w = smooth((xs[None, :] + half) / (2 * half))  # 0 = fondo A, 1 = fondo B
    out = A * (1 - w[..., None]) + B * w[..., None]
    # Transparencia en los extremos de la franja donde ya coincide con cada fondo.
    alpha = np.where(np.abs(xs[None, :]) <= half, 255, 0).astype(np.uint8)
    img = np.dstack([out.clip(0, 255).astype(np.uint8), alpha])
    Image.fromarray(img, 'RGBA').save(d / f'seam-{i + 1:02d}.webp', 'WEBP', quality=88, method=4)
    print(f'unión {i + 1}|{i + 2} lista')
