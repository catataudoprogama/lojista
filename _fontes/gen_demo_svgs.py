# Gera as ilustrações minimalistas das peças de exemplo (assets/img/demo/*.svg).
# Uso: python gen_demo_svgs.py   (as peças reais do lojista entram pelo painel, não por aqui)
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'img', 'demo')
os.makedirs(OUT, exist_ok=True)


def shade(hex_color, f):
    h = hex_color.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    if f < 0:
        r, g, b = (int(c * (1 + f)) for c in (r, g, b))
    else:
        r, g, b = (int(c + (255 - c) * f) for c in (r, g, b))
    return '#%02x%02x%02x' % (r, g, b)


def stroke(d, c, w=2.2, extra=''):
    return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'


def body(d, c):
    # contorno lilás suave: separa a peça do fundo escuro e dá o ar "neon" da identidade
    return (f'<path d="{d}" fill="{c}"/><path d="{d}" fill="url(#g)"/>'
            f'<path d="{d}" fill="none" stroke="#C4A1FF" stroke-opacity=".5" stroke-width="1.6" stroke-linejoin="round"/>')


def tee(c):
    d = 'M150 72 Q200 104 250 72 L322 100 L362 176 L312 198 L292 168 L292 428 Q200 438 108 428 L108 168 L88 198 L38 176 L78 100 Z'
    ln, sh = shade(c, -0.22), shade(c, -0.1)
    return (body(d, c) + stroke('M150 72 Q200 114 250 72', sh, 8) + stroke('M108 168 Q104 130 80 102', ln, 1.6)
            + stroke('M292 168 Q296 130 320 102', ln, 1.6) + stroke('M108 410 Q200 420 292 410', ln, 1.6)), 'translate(0 8)'


def oversized(c):
    d = 'M146 74 Q200 108 254 74 L332 98 L376 206 L324 222 L310 186 L310 446 Q200 458 90 446 L90 186 L76 222 L24 206 L68 98 Z'
    ln, sh = shade(c, -0.22), shade(c, -0.1)
    return (body(d, c) + stroke('M146 74 Q200 118 254 74', sh, 8) + stroke('M90 186 Q92 140 70 100', ln, 1.6)
            + stroke('M310 186 Q308 140 330 100', ln, 1.6) + stroke('M90 426 Q200 438 310 426', ln, 1.6)), 'translate(0 0)'


def tank(c):
    d = 'M146 38 L172 38 Q178 118 200 124 Q222 118 228 38 L254 38 Q262 120 282 160 L290 430 Q200 442 110 430 L118 160 Q138 120 146 38 Z'
    ln = shade(c, -0.14)
    ribs = ''.join(stroke(f'M{x} 150 L{x} 428', ln, 1.1, 'opacity=".55"') for x in range(132, 275, 13))
    return body(d, c) + ribs + stroke('M172 38 Q178 118 200 124 Q222 118 228 38', shade(c, -0.2), 3), 'translate(0 12)'


def shirt(c):
    d = 'M146 66 L200 104 L254 66 L326 96 L368 172 L318 194 L298 164 L298 430 L102 430 L102 164 L82 194 L32 172 L74 96 Z'
    ln, sh = shade(c, -0.22), shade(c, -0.08)
    btn = ''.join(f'<circle cx="200" cy="{y}" r="4" fill="{shade(c, -0.3)}"/>' for y in range(160, 420, 46))
    col = (f'<path d="M146 66 L200 104 L172 140 L128 92 Z" fill="{sh}" stroke="{ln}" stroke-width="1.6" stroke-linejoin="round"/>'
           f'<path d="M254 66 L200 104 L228 140 L272 92 Z" fill="{sh}" stroke="{ln}" stroke-width="1.6" stroke-linejoin="round"/>')
    return (body(d, c) + col + stroke('M200 104 L200 430', ln, 1.6) + btn
            + stroke('M222 206 h46 v54 h-46 z', ln, 1.6)), 'translate(0 8)'


def hoodie(c):
    d = 'M138 82 L72 112 L34 336 L92 346 L112 196 L112 432 Q200 444 288 432 L288 196 L308 346 L366 336 L328 112 L262 82 Q200 124 138 82 Z'
    hood = 'M138 82 Q132 24 200 22 Q268 24 262 82 Q232 120 200 124 Q168 120 138 82 Z'
    ln, sh = shade(c, -0.24), shade(c, -0.12)
    return (body(d, c) + f'<path d="{hood}" fill="{sh}"/>'
            + f'<path d="M156 84 Q200 130 244 84 Q238 46 200 44 Q162 46 156 84 Z" fill="{shade(c, -0.34)}"/>'
            + stroke('M186 124 L184 190', shade(c, 0.5), 3) + stroke('M214 124 L216 190', shade(c, 0.5), 3)
            + stroke('M140 338 L260 338 L276 404 L124 404 Z', ln, 1.8) + stroke('M34 336 L92 346', ln, 5)
            + stroke('M366 336 L308 346', ln, 5) + stroke('M112 416 Q200 428 288 416', ln, 1.8)), 'translate(0 8)'


def pants(c):
    d = 'M128 44 L272 44 L292 450 L212 450 L200 186 L188 450 L108 450 Z'
    ln, sh = shade(c, -0.22), shade(c, -0.1)
    return (body(d, c) + f'<path d="M128 44 L272 44 L272 68 L128 68 Z" fill="{sh}"/>'
            + stroke('M200 68 L200 188', ln, 1.6) + f'<circle cx="200" cy="56" r="4" fill="{shade(c, -0.3)}"/>'
            + stroke('M142 68 Q150 112 170 126', ln, 1.6) + stroke('M258 68 Q250 112 230 126', ln, 1.6)
            + stroke('M152 170 L150 446', ln, 1.1, 'opacity=".6"') + stroke('M248 170 L250 446', ln, 1.1, 'opacity=".6"')), 'translate(0 0)'


def widelegs(c):
    d = 'M124 44 L276 44 L336 456 L214 456 L200 196 L186 456 L64 456 Z'
    ln, sh = shade(c, -0.22), shade(c, -0.1)
    return (body(d, c) + f'<path d="M124 44 L276 44 L276 68 L124 68 Z" fill="{sh}"/>'
            + stroke('M200 68 L200 196', ln, 1.6) + f'<circle cx="200" cy="56" r="4" fill="{shade(c, -0.3)}"/>'
            + stroke('M138 68 Q146 114 168 130', ln, 1.6) + stroke('M262 68 Q254 114 232 130', ln, 1.6)
            + stroke('M140 200 L108 452', ln, 1.1, 'opacity=".55"') + stroke('M260 200 L292 452', ln, 1.1, 'opacity=".55"')), 'translate(0 0)'


def shorts(c):
    d = 'M126 60 L274 60 L306 300 L214 300 L200 178 L186 300 L94 300 Z'
    ln, sh = shade(c, -0.22), shade(c, -0.1)
    return (body(d, c) + f'<path d="M126 60 L274 60 L274 84 L126 84 Z" fill="{sh}"/>'
            + stroke('M200 84 L200 180', ln, 1.6) + stroke('M140 84 Q148 122 166 134', ln, 1.6)
            + stroke('M260 84 Q252 122 234 134', ln, 1.6) + stroke('M96 284 L186 284', ln, 1.4)
            + stroke('M214 284 L304 284', ln, 1.4)), 'translate(0 78)'


def dress(c):
    d = 'M166 36 L180 36 L186 120 Q200 140 214 120 L220 36 L234 36 L250 130 L258 214 L342 470 Q200 486 58 470 L142 214 L150 130 Z'
    ln = shade(c, -0.22)
    return (body(d, c) + stroke('M144 214 L256 214', ln, 1.6) + stroke('M170 232 L120 466', ln, 1.1, 'opacity=".5"')
            + stroke('M200 228 L200 480', ln, 1.1, 'opacity=".5"') + stroke('M230 232 L280 466', ln, 1.1, 'opacity=".5"')
            + stroke('M186 120 Q200 140 214 120', shade(c, -0.3), 2)), 'translate(0 4)'


def jacket(c):
    d = 'M142 76 L74 108 L38 340 L96 350 L114 190 L114 434 Q200 444 286 434 L286 190 L304 350 L362 340 L326 108 L258 76 L200 120 Z'
    ln, sh = shade(c, -0.24), shade(c, -0.1)
    btn = ''.join(f'<circle cx="200" cy="{y}" r="4" fill="{shade(c, -0.32)}"/>' for y in range(168, 430, 52))
    col = (f'<path d="M142 76 L200 120 L176 150 L122 96 Z" fill="{sh}" stroke="{ln}" stroke-width="1.6" stroke-linejoin="round"/>'
           f'<path d="M258 76 L200 120 L224 150 L278 96 Z" fill="{sh}" stroke="{ln}" stroke-width="1.6" stroke-linejoin="round"/>')
    return (body(d, c) + col + stroke('M200 120 L200 434', ln, 1.6) + btn
            + stroke('M132 204 h50 v44 h-50 z', ln, 1.6) + stroke('M218 204 h50 v44 h-50 z', ln, 1.6)
            + stroke('M124 360 L168 360', ln, 1.6) + stroke('M232 360 L276 360', ln, 1.6)
            + stroke('M38 340 L96 350', ln, 5) + stroke('M362 340 L304 350', ln, 5)), 'translate(0 6)'


def tote(c):
    d = 'M92 190 L308 190 L324 446 Q200 458 76 446 Z'
    ln, sh = shade(c, -0.22), shade(c, -0.14)
    return (stroke('M146 196 C146 92 254 92 254 196', sh, 10) + body(d, c)
            + stroke('M92 214 L308 214', ln, 1.6) + f'<rect x="176" y="300" width="48" height="30" rx="3" fill="none" stroke="{ln}" stroke-width="1.6"/>'), 'translate(0 8)'


# chave -> (função, cor da peça, fundo, fundo do detalhe, recorte do detalhe "x y w h")
PIECES = {
    'camiseta-essencial': (tee, '#ECE8DE', '#3B2070', '#2E1860', '96 56 208 260'),
    'camiseta-oversized': (oversized, '#3B3B4A', '#3A1F6E', '#2C1757', '84 52 232 290'),
    'regata-canelada': (tank, '#F1EEE6', '#34196C', '#291454', '104 38 192 240'),
    'camisa-linho': (shirt, '#C9B79A', '#3F2278', '#321A66', '96 66 208 260'),
    'moletom-canguru': (hoodie, '#A6A6B2', '#3C2074', '#2F1962', '84 20 232 290'),
    'calca-alfaiataria': (pants, '#35353F', '#33196A', '#281450', '104 36 192 240'),
    'calca-wide-leg': (widelegs, '#CDBFA6', '#3A1E70', '#2D1760', '92 36 216 270'),
    'bermuda-linho': (shorts, '#8AA3B4', '#38206E', '#2B165A', '88 124 224 280'),
    'short-alfaiataria': (shorts, '#F0EDE6', '#321868', '#271350', '88 124 224 280'),
    'vestido-slip': (dress, '#BFA98A', '#3E2276', '#311A64', '120 36 160 200'),
    'jaqueta-sarja': (jacket, '#B08052', '#3B2072', '#2E1860', '96 70 208 260'),
    'bolsa-tote': (tote, '#E3DCCB', '#341A6A', '#291452', '84 90 232 290'),
}


def svg(view, bg, inner, transform, floor_shadow):
    shadow = '<ellipse cx="200" cy="476" rx="118" ry="9" fill="#8B2CF5" opacity=".35"/>' if floor_shadow else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" preserveAspectRatio="xMidYMid slice">'
            '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
            '<stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity=".14"/>'
            '</linearGradient>'
            f'<radialGradient id="bgr" cx=".5" cy=".42" r=".8"><stop offset="0" stop-color="{bg}"/><stop offset="1" stop-color="#0A0618"/></radialGradient></defs>'
            f'<rect x="-200" y="-200" width="800" height="900" fill="url(#bgr)"/>{shadow}<g transform="{transform}">{inner}</g></svg>')


for key, (fn, color, bg1, bg2, crop) in PIECES.items():
    inner, tr = fn(color)
    open(os.path.join(OUT, f'{key}-1.svg'), 'w', encoding='utf-8').write(svg('0 0 400 500', bg1, inner, tr, True))
    open(os.path.join(OUT, f'{key}-2.svg'), 'w', encoding='utf-8').write(svg(crop, bg2, inner, tr, False))

print('ok', len(PIECES) * 2, 'svgs')
