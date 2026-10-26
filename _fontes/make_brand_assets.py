# Gera os arquivos de identidade visual (SolucionaWeb) a partir do papel de parede neon da marca.
# Uso: PYLIBS=<pasta com numpy e opencv> python make_brand_assets.py
# Saídas em assets/img/: hero-bg.webp (fundo do hero sem o logo), logo-s.webp (marca com brilho),
# logo-solucionaweb.webp (marca + nome lado a lado, para o cabeçalho) e favicon.png.
import os, sys

sys.path.insert(0, os.environ.get('PYLIBS', ''))
import cv2
import numpy as np
from PIL import Image, ImageDraw

SRC = os.environ.get('WALLPAPER', r'C:\Users\Mathias\Desktop\SOLUCIONAWEB\Estetica\Papel de Parede Neon da SolucionaWeb.png')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'img')
os.makedirs(OUT, exist_ok=True)

wall = Image.open(SRC).convert('RGB')
W, H = wall.size
BG = np.array([2, 2, 9], np.float32) / 255  # preto levemente azulado do papel de parede


def keyed(img):
    """Tira o fundo escuro mantendo o brilho: resultado sobre fundo escuro fica igual ao original."""
    a = np.asarray(img).astype(np.float32) / 255
    a2 = np.clip(a - BG, 0, 1)
    alpha = a2.max(axis=2)
    rgb = np.where(alpha[..., None] > 1e-3, a2 / np.maximum(alpha[..., None], 1e-3), 0)
    return np.dstack([rgb, alpha])


def feather(rgba, px):
    h, w = rgba.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.minimum.reduce([xx, yy, w - 1 - xx, h - 1 - yy]).astype(np.float32)
    rgba[..., 3] *= np.clip(d / px, 0, 1)
    return rgba


def to_img(rgba):
    return Image.fromarray((np.clip(rgba, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA')


def tight(rgba, thr, pad):
    ys, xs = np.where(rgba[..., 3] > thr)
    return rgba[max(0, ys.min() - pad):ys.max() + 1 + pad, max(0, xs.min() - pad):xs.max() + 1 + pad]


# ---- marca S com o brilho
s_box = (700, 250, 960, 510)
s_rgba = feather(keyed(wall.crop(s_box)), 24)
to_img(s_rgba).resize((400, 400), Image.LANCZOS).save(os.path.join(OUT, 'logo-s.webp'), quality=92, alpha_quality=100, method=6)

# ---- nome "SolucionaWeb"
wm_rgba = keyed(wall.crop((570, 505, 1110, 590)))

# ---- composição horizontal (cabeçalho): S + nome, tamanho 2x
s_tight = to_img(tight(keyed(wall.crop(s_box)), 0.55, 4))
wm_tight = to_img(tight(wm_rgba, 0.45, 3))
s_h, w_h = 96, 58
s_img = s_tight.resize((round(s_tight.width * s_h / s_tight.height), s_h), Image.LANCZOS)
w_img = wm_tight.resize((round(wm_tight.width * w_h / wm_tight.height), w_h), Image.LANCZOS)
gap = 16
canvas = Image.new('RGBA', (s_img.width + gap + w_img.width, s_h), (0, 0, 0, 0))
canvas.alpha_composite(s_img, (0, 0))
canvas.alpha_composite(w_img, (s_img.width + gap, (s_h - w_img.height) // 2))
canvas.save(os.path.join(OUT, 'logo-solucionaweb.webp'), quality=92, alpha_quality=100, method=6)

# ---- favicon
fav = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
ImageDraw.Draw(fav).rounded_rectangle((0, 0, 63, 63), radius=15, fill=(11, 7, 22, 255))
s_fav = s_tight.resize((40, round(40 * s_tight.height / s_tight.width)), Image.LANCZOS)
fav.alpha_composite(s_fav, ((64 - s_fav.width) // 2, (64 - s_fav.height) // 2))
fav.save(os.path.join(OUT, 'favicon.png'))

# ---- fundo do hero: papel de parede sem o logo, nome e frase do centro
bgr = cv2.cvtColor(np.asarray(wall), cv2.COLOR_RGB2BGR)
mask = np.zeros((H, W), np.uint8)
for (x0, y0, x1, y1) in [(690, 235, 985, 525), (555, 495, 1125, 600), (585, 590, 1095, 635)]:
    mask[y0:y1, x0:x1] = 255
filled = cv2.inpaint(bgr, mask, 9, cv2.INPAINT_TELEA).astype(np.float32)
# a névoa do brilho do logo deixaria a área acinzentada: puxa para o preto azulado do fundo
core = cv2.GaussianBlur(mask, (0, 0), 10).astype(np.float32)[..., None] / 255
filled = filled * (1 - 0.65 * core) + np.array([9, 2, 2], np.float32) * 0.65 * core
# devolve a granulação do fundo na área preenchida (senão fica uma mancha lisa)
patch = bgr[60:200, 800:1000].astype(np.float32)
sigma = patch.std(axis=(0, 1))
rng = np.random.default_rng(7)
noise = rng.normal(0, 1, filled.shape).astype(np.float32) * sigma * 0.6
soft = cv2.GaussianBlur(mask, (0, 0), 6).astype(np.float32)[..., None] / 255
out = np.clip(filled + noise * soft, 0, 255).astype(np.uint8)
res = Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB))
res.save(os.path.join(OUT, 'hero-bg.webp'), quality=80, method=6)
for f in ('hero-bg.webp', 'logo-s.webp', 'logo-solucionaweb.webp', 'favicon.png'):
    print(f, os.path.getsize(os.path.join(OUT, f)) // 1024, 'KB')
