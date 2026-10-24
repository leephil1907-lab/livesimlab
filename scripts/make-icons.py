"""Regenerate favicon / app icons / social preview from the logo.
Run after changing the logo or brand name:  python3 scripts/make-icons.py
Needs: pip install playwright pillow && python3 -m playwright install chromium-headless-shell
"""
import base64, json, pathlib, io
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
brand = json.loads((ROOT / "config/site.json").read_text())["brand"]
INK, LIME = "#11150a", "#c6f432"
GLYPH = f'''<circle cx="31" cy="34" r="15" fill="none" stroke="{INK}" stroke-width="4"/><path d="M31 19a15 15 0 0 1 0 30z" fill="{INK}"/><circle cx="25.5" cy="31" r="2.6" fill="{INK}"/><circle cx="36.5" cy="31" r="2.6" fill="{LIME}"/><path d="M24.5 39.2Q27.75 41.8 31 41.8" fill="none" stroke="{INK}" stroke-width="3"/><path d="M31 41.8Q34.25 41.8 37.5 39.2" fill="none" stroke="{LIME}" stroke-width="3"/><circle cx="24.5" cy="39.2" r="1.5" fill="{INK}"/><circle cx="37.5" cy="39.2" r="1.5" fill="{LIME}"/><path d="M50 9l1.9 4.6 4.6 1.9-4.6 1.9L50 22l-1.9-4.6-4.6-1.9 4.6-1.9z" fill="{INK}"/>'''

def svg(rounded=True, scale=1.0):
    rx = 'rx="16"' if rounded else ''
    t = (1 - scale) * 32
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" {rx} fill="{LIME}"/><g transform="translate({t} {t}) scale({scale})">{GLYPH}</g></svg>'

def font(w):
    f = ROOT / f'node_modules/@fontsource/instrument-sans/files/instrument-sans-latin-{w}-normal.woff2'
    return 'data:font/woff2;base64,' + base64.b64encode(f.read_bytes()).decode()

def data_uri(p):
    return "data:image/webp;base64," + base64.b64encode(p.read_bytes()).decode()

OG = f'''<html><head><style>
@font-face {{ font-family: IS; src: url("{font(600)}"); font-weight: 600; }}
@font-face {{ font-family: IS; src: url("{font(400)}"); font-weight: 400; }}
* {{ margin:0; box-sizing:border-box; }}
body {{ width:1200px; height:630px; background:#f5f5f2; font-family: IS, sans-serif; color:{INK}; display:grid; grid-template-columns: 560px 1fr; padding:56px; gap:40px; overflow:hidden; }}
.brand {{ display:flex; align-items:center; gap:14px; font-size:30px; font-weight:600; letter-spacing:-.03em; }}
.brand svg {{ width:56px; height:56px; }}
h1 {{ margin-top:70px; font-size:92px; line-height:.95; letter-spacing:-.055em; font-weight:600; }}
h1 span {{ color:#6f7270; background: linear-gradient(transparent 72%, rgba(198,244,50,.6) 72%, rgba(198,244,50,.6) 90%, transparent 90%); }}
p {{ margin-top:28px; font-size:25px; color:#55595c; line-height:1.4; }}
.pill {{ display:inline-block; margin-top:28px; padding:9px 16px; border-radius:8px; background:{LIME}; font-size:20px; font-weight:600; }}
.win {{ background:#1f2023; border-radius:22px; padding:10px; display:grid; grid-template-columns:1fr 1fr; gap:6px; height:518px; box-shadow:0 30px 60px -20px rgba(0,0,0,.35); }}
.win div {{ border-radius:14px; background-size:cover; background-position:center 30%; position:relative; }}
.win b {{ position:absolute; left:12px; bottom:12px; padding:5px 12px; border-radius:999px; background:rgba(17,21,10,.78); color:#fff; font-size:16px; font-weight:600; }}
.win .ai b {{ background:{LIME}; color:{INK}; }}
</style></head><body>
<div><div class="brand">{svg()}{brand.get("name")}</div>
<h1>A new face.<br><span>Same you.</span></h1>
<p>Your expressions drive an AI character, live, in your browser and your calls.</p>
<span class="pill">Preview free · Pay in naira</span></div>
<div class="win"><div style="background-image:url({data_uri(PUB/'demo/performer.webp')})"><b>You</b></div><div class="ai" style="background-image:url({data_uri(PUB/'characters/amara.webp')})"><b>AI character</b></div></div>
</body></html>'''

(PUB / "icons").mkdir(exist_ok=True)
(PUB / "favicon.svg").write_text(svg())
with sync_playwright() as p:
    b = p.chromium.launch()
    def render(markup, size, out, transparent=True):
        pg = b.new_page(viewport={"width": size, "height": size})
        pg.set_content(f'<html><body style="margin:0;background:transparent">{markup.replace("<svg ", f"<svg width={size} height={size} ", 1)}</body></html>')
        data = pg.screenshot(omit_background=transparent, clip={"x": 0, "y": 0, "width": size, "height": size})
        pg.close(); return data
    (PUB / "icons/icon-192.png").write_bytes(render(svg(), 192, None))
    (PUB / "icons/icon-512.png").write_bytes(render(svg(), 512, None))
    (PUB / "icons/icon-maskable-512.png").write_bytes(render(svg(False, 0.78), 512, None, False))
    (PUB / "apple-touch-icon.png").write_bytes(render(svg(False, 0.86), 180, None, False))
    ico = Image.open(io.BytesIO(render(svg(), 64, None))).convert("RGBA")
    ico.save(PUB / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    pg = b.new_page(viewport={"width": 1200, "height": 630})
    pg.set_content(OG); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(300)
    pg.screenshot(path=str(PUB / "og-image.png"))
    b.close()
print("icons written to", PUB)
