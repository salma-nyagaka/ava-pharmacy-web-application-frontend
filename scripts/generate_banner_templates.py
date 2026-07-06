from pathlib import Path
import math

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "pdf"
LOGO = ROOT / "src" / "assets" / "images" / "logos" / "avalogo.jpg"
PRODUCT_VITAMIN = ROOT / "src" / "assets" / "images" / "remote" / "product-vitamin-c.jpg"
PRODUCT_SANITIZER = ROOT / "src" / "assets" / "images" / "remote" / "product-sanitizer.jpg"
PRODUCT_THERMOMETER = ROOT / "src" / "assets" / "images" / "remote" / "product-thermometer.jpg"
PRODUCT_OMEGA = ROOT / "src" / "assets" / "images" / "remote" / "product-omega3.jpg"
PRODUCT_PAIN = ROOT / "src" / "assets" / "images" / "remote" / "product-pain-relief.jpg"
PRODUCT_BABY = ROOT / "src" / "assets" / "images" / "remote" / "product-baby-diapers.jpg"
CATEGORY_PRESCRIPTION = ROOT / "src" / "assets" / "images" / "category-cards" / "prescription-medicines.jpg"
CATEGORY_BEAUTY = ROOT / "src" / "assets" / "images" / "category-cards" / "personal-care-beauty.jpg"
CATEGORY_VITAMINS = ROOT / "src" / "assets" / "images" / "category-cards" / "vitamins-supplements.jpg"
CATEGORY_DEVICES = ROOT / "src" / "assets" / "images" / "category-cards" / "medical-devices-home-diagnostics.jpg"
CATEGORY_BABY = ROOT / "src" / "assets" / "images" / "category-cards" / "baby-mother-family-care.jpg"
CATEGORY_HERBAL = ROOT / "src" / "assets" / "images" / "category-cards" / "herbal-alternative-medicine.jpg"
CATEGORY_NATURAL = ROOT / "src" / "assets" / "images" / "category-cards" / "natural-herbal-remedies.jpg"
CATEGORY_OTC = ROOT / "src" / "assets" / "images" / "category-cards" / "over-the-counter-medicines.jpg"
PHARMA_BG = ROOT / "src" / "assets" / "images" / "banner" / "background.jpg"

W, H = 1600, 900


PALETTE = {
    "primary": "#E81750",
    "primary_dark": "#991B1F",
    "primary_soft": "#FEF5F7",
    "navy": "#031B4E",
    "ink": "#334155",
    "muted": "#64748B",
    "faint": "#94A3B8",
    "surface": "#FFFFFF",
    "light": "#F8F9FC",
    "border": "#E8E8EF",
    "blue": "#2563EB",
    "blue_soft": "#EFF6FF",
    "teal": "#0D9488",
    "teal_soft": "#F0FDFA",
    "green": "#10B981",
    "green_soft": "#F0FDF4",
    "amber": "#F59E0B",
    "amber_soft": "#FEF3C7",
}


def hex_color(value, alpha=1):
    c = colors.HexColor(value)
    if alpha < 1:
        c = colors.Color(c.red, c.green, c.blue, alpha=alpha)
    return c


def lerp(a, b, t):
    return a + (b - a) * t


def gradient_rect(c, x, y, w, h, start, end, steps=120, vertical=False):
    s = colors.HexColor(start)
    e = colors.HexColor(end)
    for i in range(steps):
        t = i / max(steps - 1, 1)
        c.setFillColor(colors.Color(lerp(s.red, e.red, t), lerp(s.green, e.green, t), lerp(s.blue, e.blue, t)))
        if vertical:
            yy = y + h * i / steps
            c.rect(x, yy, w, h / steps + 1, stroke=0, fill=1)
        else:
            xx = x + w * i / steps
            c.rect(xx, y, w / steps + 1, h, stroke=0, fill=1)


def draw_logo(c, x=78, y=762, width=190):
    height = width * 0.42
    c.setFillColor(hex_color("#FFFFFF", 0.92))
    c.setStrokeColor(hex_color(PALETTE["border"]))
    c.roundRect(x, y, width, height, 16, fill=1, stroke=1)
    c.setFillColor(hex_color(PALETTE["primary"]))
    c.circle(x + 32, y + height / 2, 16, fill=1, stroke=0)
    c.setStrokeColor(hex_color("#FFFFFF"))
    c.setLineWidth(4)
    c.line(x + 22, y + height / 2, x + 42, y + height / 2)
    c.line(x + 32, y + height / 2 - 10, x + 32, y + height / 2 + 10)
    c.setLineWidth(1)
    c.setFillColor(hex_color(PALETTE["primary"]))
    c.setFont("Helvetica-Bold", 26)
    c.drawString(x + 58, y + height - 34, "AVA")
    c.setFillColor(hex_color(PALETTE["navy"]))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(x + 110, y + height - 30, "Pharmacy")
    c.setFillColor(hex_color(PALETTE["muted"]))
    c.setFont("Helvetica", 8)
    c.drawString(x + 58, y + 16, "For health, beauty, and well-being")


def shadow_card(c, x, y, w, h, radius=34, fill="#FFFFFF", stroke="#FFFFFF"):
    c.setFillColor(hex_color("#031B4E", 0.08))
    c.roundRect(x + 14, y - 16, w, h, radius, fill=1, stroke=0)
    c.setFillColor(hex_color(fill))
    c.setStrokeColor(hex_color(stroke, 0.9))
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1)


def image_cover(c, image_path, x, y, w, h):
    if not Path(image_path).exists():
        return
    c.drawImage(ImageReader(str(image_path)), x, y, width=w, height=h, preserveAspectRatio=True, anchor="c")


def framed_image(c, image_path, x, y, w, h, radius=34, label_text=None):
    shadow_card(c, x, y, w, h, radius)
    c.saveState()
    p = c.beginPath()
    p.rect(x + 18, y + 18, w - 36, h - 36)
    c.clipPath(p, stroke=0, fill=0)
    image_cover(c, image_path, x + 18, y + 18, w - 36, h - 36)
    c.restoreState()
    if label_text:
        c.setFillColor(hex_color("#FFFFFF", 0.92))
        c.roundRect(x + 36, y + 34, w - 72, 48, 24, fill=1, stroke=0)
        label(c, label_text, x + 58, y + 50, PALETTE["navy"], 18, True)


def product_tile(c, image_path, x, y, size, accent):
    shadow_card(c, x, y, size, size, 28)
    c.setFillColor(hex_color(accent, 0.12))
    c.circle(x + size * 0.5, y + size * 0.5, size * 0.36, fill=1, stroke=0)
    c.saveState()
    p = c.beginPath()
    p.rect(x + 22, y + 22, size - 44, size - 44)
    c.clipPath(p, stroke=0, fill=0)
    image_cover(c, image_path, x + 22, y + 22, size - 44, size - 44)
    c.restoreState()


def product_card(c, image_path, x, y, w, h, title, subtitle, accent):
    shadow_card(c, x, y, w, h, 26)
    c.saveState()
    p = c.beginPath()
    p.rect(x + 18, y + 74, w - 36, h - 92)
    c.clipPath(p, stroke=0, fill=0)
    image_cover(c, image_path, x + 18, y + 74, w - 36, h - 92)
    c.restoreState()
    c.setFillColor(hex_color(accent, 0.12))
    c.roundRect(x + 18, y + 18, w - 36, 48, 14, fill=1, stroke=0)
    label(c, title, x + 34, y + 42, PALETTE["navy"], 14, True)
    label(c, subtitle, x + 34, y + 24, PALETTE["muted"], 10, False)


def category_chip(c, x, y, text, accent, width=180):
    c.setFillColor(hex_color("#FFFFFF", 0.92))
    c.setStrokeColor(hex_color(accent, 0.22))
    c.roundRect(x, y, width, 44, 22, fill=1, stroke=1)
    c.setFillColor(hex_color(accent))
    c.circle(x + 24, y + 22, 6, fill=1, stroke=0)
    label(c, text, x + 42, y + 15, PALETTE["navy"], 14, True)


def offer_badge(c, x, y, r, top, main, bottom, fill, main_size=56):
    c.setFillColor(hex_color(fill))
    c.circle(x, y, r, fill=1, stroke=0)
    c.setFillColor(hex_color("#FFFFFF"))
    c.setFont("Helvetica-Bold", 17)
    c.drawCentredString(x, y + r * 0.48, top)
    c.setFont("Helvetica-Bold", main_size)
    c.drawCentredString(x, y - main_size * 0.28, main)
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(x, y - r * 0.52, bottom)


def stat_card(c, x, y, w, h, number, text, accent):
    c.setFillColor(hex_color("#FFFFFF", 0.94))
    c.setStrokeColor(hex_color("#E8E8EF"))
    c.roundRect(x, y, w, h, 22, fill=1, stroke=1)
    label(c, number, x + 24, y + h - 36, accent, 28, True)
    label(c, text, x + 24, y + 24, PALETTE["ink"], 15, True)


def decorative_plus(c, x, y, size, color):
    c.setStrokeColor(hex_color(color, 0.55))
    c.setLineWidth(max(2, size / 12))
    c.line(x - size, y, x + size, y)
    c.line(x, y - size, x, y + size)
    c.setLineWidth(1)


def pill(c, x, y, w, h, fill, text, text_color="#FFFFFF", fs=24, bold=True, stroke=None):
    c.setFillColor(hex_color(fill))
    c.setStrokeColor(hex_color(stroke or fill))
    c.roundRect(x, y, w, h, h / 2, fill=1, stroke=1 if stroke else 0)
    c.setFillColor(hex_color(text_color))
    c.setFont("Helvetica-Bold" if bold else "Helvetica", fs)
    c.drawCentredString(x + w / 2, y + h / 2 - fs * 0.34, text)


def label(c, text, x, y, color="#64748B", fs=22, bold=False):
    c.setFillColor(hex_color(color))
    c.setFont("Helvetica-Bold" if bold else "Helvetica", fs)
    c.drawString(x, y, text)


def draw_text_stack(c, eyebrow, title_lines, body_lines, x, y, accent):
    pill(c, x, y + 310, 230, 48, "#FFFFFF", eyebrow.upper(), accent, fs=18, stroke="#E8E8EF")
    c.setFillColor(hex_color(PALETTE["navy"]))
    c.setFont("Helvetica-Bold", 68)
    for idx, line in enumerate(title_lines):
        c.drawString(x, y + 230 - idx * 76, line)
    c.setFillColor(hex_color(PALETTE["ink"]))
    c.setFont("Helvetica", 27)
    for idx, line in enumerate(body_lines):
        c.drawString(x, y + 82 - idx * 38, line)


def trust_chip(c, x, y, text, accent):
    c.setFillColor(hex_color("#FFFFFF", 0.82))
    c.setStrokeColor(hex_color("#E8E8EF"))
    c.roundRect(x, y, 228, 46, 23, fill=1, stroke=1)
    c.setFillColor(hex_color(accent))
    c.circle(x + 28, y + 23, 7, fill=1, stroke=0)
    c.setFillColor(hex_color(PALETTE["ink"]))
    c.setFont("Helvetica-Bold", 16)
    c.drawString(x + 48, y + 17, text)


def image_placeholder(c, x, y, w, h, accent, label_text="PRODUCT IMAGE"):
    c.setFillColor(hex_color("#FFFFFF", 0.9))
    c.setStrokeColor(hex_color("#FFFFFF"))
    c.roundRect(x, y, w, h, 34, fill=1, stroke=0)
    c.setStrokeColor(hex_color(accent, 0.45))
    c.setDash(12, 10)
    c.roundRect(x + 28, y + 28, w - 56, h - 56, 26, fill=0, stroke=1)
    c.setDash()
    c.setFillColor(hex_color(accent, 0.10))
    c.circle(x + w / 2, y + h / 2 + 28, 112, fill=1, stroke=0)
    c.setStrokeColor(hex_color(accent))
    c.setLineWidth(5)
    c.line(x + w / 2 - 72, y + h / 2 + 16, x + w / 2 + 72, y + h / 2 + 16)
    c.line(x + w / 2, y + h / 2 - 56, x + w / 2, y + h / 2 + 88)
    c.setLineWidth(1)
    c.setFillColor(hex_color(PALETTE["muted"]))
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(x + w / 2, y + 86, label_text)
    c.setFont("Helvetica", 15)
    c.drawCentredString(x + w / 2, y + 58, "Replace in Canva")


def subtle_pattern(c, accent):
    c.setStrokeColor(hex_color(accent, 0.12))
    c.setLineWidth(2)
    for i in range(-120, 1700, 180):
        c.line(i, 80, i + 320, 820)
    c.setFillColor(hex_color(accent, 0.08))
    for i in range(10):
        x = 1220 + math.cos(i * 0.78) * 230
        y = 150 + i * 76
        c.circle(x, y, 8 + (i % 3) * 6, fill=1, stroke=0)


def soft_ellipse(c, x, y, w, h, color, alpha=0.18):
    c.setFillColor(hex_color(color, alpha))
    c.ellipse(x, y, x + w, y + h, fill=1, stroke=0)


def draw_podium(c, x, y, w, h, top="#FFFFFF", side="#F8DDE8", stroke="#FFFFFF"):
    c.setFillColor(hex_color(side))
    c.rect(x, y, w, h, fill=1, stroke=0)
    c.setFillColor(hex_color(top))
    c.ellipse(x, y + h - 42, x + w, y + h + 42, fill=1, stroke=0)
    c.setFillColor(hex_color(side, 0.92))
    c.ellipse(x, y - 42, x + w, y + 42, fill=1, stroke=0)
    c.setStrokeColor(hex_color(stroke, 0.62))
    c.setLineWidth(3)
    c.ellipse(x, y + h - 42, x + w, y + h + 42, fill=0, stroke=1)
    c.setLineWidth(1)


def draw_tube(c, x, y, w, h, label="", cap="#E5E7EB", fill="#FFFFFF", shadow=True):
    if shadow:
        soft_ellipse(c, x + 8, y - 22, w, 34, "#031B4E", 0.16)
    c.setFillColor(hex_color(fill))
    c.setStrokeColor(hex_color("#DDE3EA"))
    c.roundRect(x, y + 22, w, h - 22, 16, fill=1, stroke=1)
    c.setFillColor(hex_color(cap))
    c.roundRect(x + 8, y, w - 16, 36, 10, fill=1, stroke=0)
    c.setFillColor(hex_color("#F8FAFC", 0.72))
    c.rect(x + w * 0.58, y + 52, w * 0.20, h - 88, fill=1, stroke=0)
    if label:
        c.saveState()
        c.translate(x + w / 2, y + h * 0.50)
        c.rotate(90)
        c.setFillColor(hex_color(PALETTE["muted"]))
        c.setFont("Helvetica-Bold", max(10, int(w * 0.18)))
        c.drawCentredString(0, -5, label)
        c.restoreState()


def draw_bottle(c, x, y, w, h, fill="#8B3E20", label="#FFFFFF", cap="#111827", pump=False):
    soft_ellipse(c, x + 8, y - 24, w, 36, "#031B4E", 0.18)
    c.setFillColor(hex_color(fill))
    c.setStrokeColor(hex_color("#1F2937", 0.24))
    c.roundRect(x, y, w, h, 26, fill=1, stroke=1)
    c.setFillColor(hex_color("#FFFFFF", 0.12))
    c.roundRect(x + w * 0.12, y + h * 0.08, w * 0.18, h * 0.82, 16, fill=1, stroke=0)
    c.setFillColor(hex_color(label))
    c.roundRect(x + w * 0.12, y + h * 0.26, w * 0.76, h * 0.34, 6, fill=1, stroke=0)
    c.setFillColor(hex_color(cap))
    c.roundRect(x + w * 0.28, y + h - 2, w * 0.44, 36, 8, fill=1, stroke=0)
    if pump:
        c.setFillColor(hex_color(cap))
        c.rect(x + w * 0.46, y + h + 30, w * 0.12, 54, fill=1, stroke=0)
        c.roundRect(x + w * 0.36, y + h + 78, w * 0.56, 18, 8, fill=1, stroke=0)
        c.roundRect(x + w * 0.78, y + h + 70, w * 0.34, 12, 6, fill=1, stroke=0)


def draw_jar(c, x, y, w, h, fill="#7C2D12"):
    soft_ellipse(c, x + 6, y - 18, w, 30, "#031B4E", 0.18)
    c.setFillColor(hex_color(fill))
    c.roundRect(x, y, w, h, 24, fill=1, stroke=0)
    c.setFillColor(hex_color("#FFFFFF"))
    c.roundRect(x + 14, y + h * 0.20, w - 28, h * 0.42, 8, fill=1, stroke=0)
    c.setFillColor(hex_color("#111827"))
    c.roundRect(x - 4, y + h - 2, w + 8, 32, 10, fill=1, stroke=0)


def draw_leaf(c, x, y, size, angle=0, color="#15803D", alpha=0.92):
    c.saveState()
    c.translate(x, y)
    c.rotate(angle)
    c.setFillColor(hex_color(color, alpha))
    p = c.beginPath()
    p.moveTo(0, 0)
    p.curveTo(size * 0.35, size * 0.32, size * 0.82, size * 0.20, size, 0)
    p.curveTo(size * 0.72, -size * 0.30, size * 0.28, -size * 0.26, 0, 0)
    c.drawPath(p, fill=1, stroke=0)
    c.setStrokeColor(hex_color("#0F5132", 0.38))
    c.line(size * 0.08, 0, size * 0.86, 0)
    c.restoreState()


def draw_water_pattern(c, color="#FFFFFF"):
    c.setStrokeColor(hex_color(color, 0.50))
    c.setLineWidth(2)
    for x in range(-120, 1760, 280):
        c.line(x, 0, x + 520, 900)
    for x in range(80, 1900, 280):
        c.line(x, 900, x - 520, 0)
    c.setStrokeColor(hex_color(color, 0.28))
    for i in range(18):
        cx = 120 + (i * 97) % 1460
        cy = 120 + (i * 151) % 700
        c.bezier(cx, cy, cx + 40, cy + 38, cx + 90, cy - 36, cx + 140, cy + 8)


def draw_frame(c, x, y, w, h, color="#8B5CF6", alpha=0.92, width=5, angle=0):
    c.saveState()
    c.translate(x + w / 2, y + h / 2)
    c.rotate(angle)
    c.setStrokeColor(hex_color(color, alpha))
    c.setLineWidth(width)
    c.rect(-w / 2, -h / 2, w, h, fill=0, stroke=1)
    c.restoreState()
    c.setLineWidth(1)


def draw_heart(c, x, y, size, color="#FFFFFF", alpha=0.7):
    c.saveState()
    c.translate(x, y)
    c.setFillColor(hex_color(color, alpha))
    p = c.beginPath()
    p.moveTo(0, -size * 0.28)
    p.curveTo(-size, size * 0.35, -size * 0.50, size, 0, size * 0.48)
    p.curveTo(size * 0.50, size, size, size * 0.35, 0, -size * 0.28)
    c.drawPath(p, fill=1, stroke=0)
    c.restoreState()


def product_feature():
    path = OUT_DIR / "ava-product-feature-banner-template.pdf"
    c = canvas.Canvas(str(path), pagesize=(W, H))
    gradient_rect(c, 0, 0, W, H, "#E8F5FF", "#F9FDFF")
    draw_water_pattern(c)
    c.setFillColor(hex_color("#FFFFFF", 0.72))
    c.circle(1210, 410, 390, fill=1, stroke=0)
    c.setFillColor(hex_color("#D9F7FF", 0.82))
    c.roundRect(928, 50, 580, 132, 66, fill=1, stroke=0)
    draw_leaf(c, 28, 804, 170, -26, "#15803D", 0.88)
    draw_leaf(c, 92, 712, 118, -12, "#166534", 0.86)
    draw_leaf(c, 1466, 104, 156, 146, "#15803D", 0.88)
    draw_leaf(c, 1398, 50, 118, 118, "#166534", 0.86)
    draw_logo(c, 78, 748, 210)
    c.setFillColor(hex_color(PALETTE["navy"]))
    c.setFont("Helvetica-BoldOblique", 124)
    c.drawString(206, 586, "Summer")
    c.setFillColor(hex_color("#F0440B"))
    c.setFont("Helvetica-BoldOblique", 112)
    c.drawString(392, 456, "Sale")
    c.setFillColor(hex_color(PALETTE["navy"]))
    c.setFont("Helvetica-Bold", 38)
    c.drawString(350, 360, "DISCOUNT UP TO 50% OFF")
    pill(c, 472, 214, 260, 72, "#F0440B", "SHOP NOW", fs=26)
    c.setFillColor(hex_color(PALETTE["navy"]))
    c.setFont("Helvetica", 24)
    c.drawCentredString(600, 152, "ava-pharmacy.co.ke")
    draw_podium(c, 1020, 96, 478, 210, top="#E9FAFF", side="#DDEBFF")
    draw_bottle(c, 1074, 290, 140, 320, fill="#8B3E20", pump=True)
    draw_bottle(c, 1260, 330, 92, 352, fill="#9A4A21", cap="#111827")
    draw_bottle(c, 1372, 298, 124, 300, fill="#8B3E20", pump=True)
    draw_jar(c, 1218, 192, 214, 156, fill="#7C2D12")
    draw_bottle(c, 1490, 190, 74, 210, fill="#6B2A13", cap="#111827")
    draw_leaf(c, 1472, 226, 94, -28, "#15803D", 0.86)
    draw_leaf(c, 1310, 746, 84, 18, "#16A34A", 0.80)
    decorative_plus(c, 118, 94, 14, PALETTE["green"])
    decorative_plus(c, 1514, 754, 14, PALETTE["green"])
    c.save()
    return path


def promotion_discount():
    path = OUT_DIR / "ava-promotion-discount-banner-template.pdf"
    c = canvas.Canvas(str(path), pagesize=(W, H))
    gradient_rect(c, 0, 0, W, H, "#FDE8D9", "#FFEEDB")
    c.setFillColor(hex_color("#FFFFFF", 0.34))
    c.circle(1322, 596, 440, fill=1, stroke=0)
    c.setStrokeColor(hex_color("#EAB68F", 0.28))
    c.setLineWidth(16)
    c.bezier(916, 900, 1018, 650, 1150, 585, 1288, 900)
    c.bezier(1048, 900, 1110, 600, 1270, 628, 1418, 900)
    c.setLineWidth(1)
    draw_frame(c, 84, 318, 560, 430, PALETTE["follow_up"] if "follow_up" in PALETTE else "#8B5CF6", 0.9, 5, 0)
    draw_logo(c, 78, 756, 210)
    c.setFillColor(hex_color("#111111"))
    c.setFont("Helvetica-Bold", 96)
    c.drawString(90, 628, "pure,")
    c.drawString(90, 520, "natural")
    c.drawString(90, 412, "& clean.")
    c.setFillColor(hex_color("#111111"))
    c.setFont("Courier-Bold", 29)
    c.drawString(90, 270, "PHARMACY SKINCARE")
    c.setFillColor(hex_color(PALETTE["primary"]))
    c.roundRect(90, 170, 235, 68, 34, fill=1, stroke=0)
    label(c, "SHOP NOW", 132, 193, "#FFFFFF", 23, True)
    offer_badge(c, 702, 664, 100, "UP TO", "30%", "OFF", PALETTE["primary"], 48)
    draw_podium(c, 900, 72, 600, 176, top="#FFF8F2", side="#F6D8C6")
    draw_podium(c, 1070, 216, 410, 156, top="#FFF3E8", side="#EEC7B2")
    draw_bottle(c, 780, 104, 188, 430, fill="#7A2E14", pump=True)
    draw_bottle(c, 1054, 300, 120, 310, fill="#7A2E14", pump=True)
    draw_bottle(c, 1256, 360, 142, 350, fill="#5B1C12", cap="#111111")
    draw_bottle(c, 1452, 302, 98, 278, fill="#7A2E14", cap="#111111")
    draw_jar(c, 1240, 182, 186, 134, fill="#7A2E14")
    c.setFillColor(hex_color("#1F2937", 0.88))
    c.circle(148, 82, 78, fill=1, stroke=0)
    c.circle(206, 72, 24, fill=1, stroke=0)
    draw_leaf(c, 1358, 700, 70, 22, "#C47A43", 0.34)
    decorative_plus(c, 654, 756, 18, "#8B5CF6")
    c.save()
    return path


def health_service():
    path = OUT_DIR / "ava-health-service-campaign-banner-template.pdf"
    c = canvas.Canvas(str(path), pagesize=(W, H))
    gradient_rect(c, 0, 0, W, H, "#FDECF6", "#F6B2D6")
    c.setFillColor(hex_color("#FFFFFF", 0.30))
    c.circle(110, 840, 170, fill=1, stroke=0)
    c.circle(1502, 118, 150, fill=1, stroke=0)
    soft_ellipse(c, 350, 760, 90, 44, "#FFFFFF", 0.42)
    soft_ellipse(c, 1118, 760, 120, 54, "#FFFFFF", 0.30)
    soft_ellipse(c, 655, 156, 94, 40, "#FFFFFF", 0.28)
    draw_logo(c, 78, 748, 210)
    c.setFillColor(hex_color(PALETTE["primary_dark"], 0.66))
    c.setFont("Times-Roman", 82)
    c.drawString(138, 548, "AVA")
    c.setFont("Helvetica", 28)
    c.drawString(206, 488, "BEAUTY SKINCARE")
    c.setFont("Helvetica", 25)
    c.drawString(150, 398, "Infused with pharmacy care to help")
    c.drawString(150, 360, "protect, brighten, and enrich your skin.")
    pill(c, 256, 226, 206, 60, "#FFFFFF", "SHOP NOW", PALETTE["primary"], fs=24, stroke="#FFFFFF")
    c.setFillColor(hex_color("#FFFFFF"))
    c.circle(804, 666, 86, fill=1, stroke=0)
    label(c, "UP TO", 762, 704, PALETTE["primary"], 20)
    c.setFillColor(hex_color(PALETTE["primary"]))
    c.setFont("Helvetica-Bold", 46)
    c.drawCentredString(804, 650, "10%")
    label(c, "OFF", 770, 612, PALETTE["primary"], 21, True)
    draw_podium(c, 790, 96, 528, 250, top="#FFF8FF", side="#F59AC4")
    draw_podium(c, 1078, 32, 510, 160, top="#FFF8FF", side="#F48DBD")
    draw_tube(c, 876, 352, 82, 250, label="AVA")
    draw_tube(c, 954, 346, 84, 264, label="CARE")
    draw_bottle(c, 1110, 376, 120, 344, fill="#FFFFFF", label="#FFFFFF", cap="#FFFFFF")
    draw_jar(c, 976, 314, 168, 98, fill="#FFFFFF")
    draw_bottle(c, 1286, 190, 82, 236, fill="#FFFFFF", label="#FFFFFF", cap="#FFFFFF")
    draw_tube(c, 1398, 178, 92, 314, label="")
    c.setFillColor(hex_color("#FDECF6", 0.92))
    c.rect(0, 0, W, 96, fill=1, stroke=0)
    category_chip(c, 60, 28, "Online shop", PALETTE["primary"], 190)
    category_chip(c, 306, 28, "Prescription care", PALETTE["primary"], 230)
    category_chip(c, 610, 28, "Store pickup", PALETTE["primary"], 190)
    decorative_plus(c, 1450, 462, 24, "#FFFFFF")
    decorative_plus(c, 742, 520, 18, "#FFFFFF")
    c.save()
    return path


def category_banner(config):
    path = OUT_DIR / config["filename"]
    c = canvas.Canvas(str(path), pagesize=(W, H))
    gradient_rect(c, 0, 0, W, H, config["bg_from"], config["bg_to"])
    c.setFillColor(hex_color(config["accent"], 0.10))
    c.circle(1330, 690, 420, fill=1, stroke=0)
    c.setFillColor(hex_color(config["soft"], 0.65))
    c.roundRect(780, 70, 760, 710, 70, fill=1, stroke=0)
    if config.get("botanical"):
        draw_leaf(c, 42, 780, 130, -24, config["accent"], 0.72)
        draw_leaf(c, 1444, 108, 134, 140, config["accent"], 0.72)
        draw_leaf(c, 1344, 718, 92, 18, config["accent"], 0.54)
    else:
        decorative_plus(c, 140, 132, 18, config["accent"])
        decorative_plus(c, 1448, 710, 22, config["accent"])
        soft_ellipse(c, 70, 710, 210, 92, "#FFFFFF", 0.28)
    draw_logo(c, 78, 748, 210)
    pill(c, 88, 640, config.get("eyebrow_w", 270), 52, "#FFFFFF", config["eyebrow"], config["accent"], fs=18, stroke="#FFFFFF")
    c.setFillColor(hex_color(config["title_color"]))
    c.setFont(config.get("title_font", "Helvetica-Bold"), config.get("title_size", 74))
    y = 548
    for line in config["title_lines"]:
        c.drawString(88, y, line)
        y -= config.get("title_gap", 82)
    c.setFillColor(hex_color(config["body_color"]))
    c.setFont("Helvetica", 27)
    c.drawString(92, 388, config["body_lines"][0])
    c.drawString(92, 350, config["body_lines"][1])
    pill(c, 90, 246, 236, 68, config["cta_fill"], config["cta"], config["cta_text"], fs=23, stroke=config.get("cta_stroke"))
    category_chip(c, 356, 262, config["chip_1"], config["accent"], config.get("chip_1_w", 180))
    category_chip(c, 560, 262, config["chip_2"], config["chip_accent"], config.get("chip_2_w", 190))
    offer_badge(c, 790, 620, 106, config["badge_top"], config["badge_main"], config["badge_bottom"], config["badge_fill"], config.get("badge_size", 48))
    draw_podium(c, 932, 92, 518, 190, top=config["podium_top"], side=config["podium_side"])
    framed_image(c, config["image"], 935, 260, 440, 380, 38, None)
    if config.get("product_mode") == "bottles":
        draw_bottle(c, 1248, 198, 114, 250, fill="#7A2E14", pump=True)
        draw_jar(c, 1086, 150, 172, 112, fill="#7C2D12")
        draw_tube(c, 1386, 170, 70, 238, label="")
    elif config.get("product_mode") == "baby":
        draw_tube(c, 1228, 178, 92, 278, label="BABY", fill="#FFFFFF")
        draw_bottle(c, 1360, 188, 92, 250, fill="#FFFFFF", label="#FFFFFF", cap="#FFFFFF")
        draw_jar(c, 1088, 154, 160, 104, fill="#FFFFFF")
    elif config.get("product_mode") == "devices":
        product_card(c, PRODUCT_THERMOMETER, 1222, 142, 206, 220, "Diagnostics", "Home checks", config["accent"])
        product_card(c, CATEGORY_DEVICES, 786, 118, 194, 206, "Devices", "Monitor care", config["chip_accent"])
    else:
        product_card(c, PRODUCT_VITAMIN, 1218, 124, 204, 218, config["card_title"], config["card_subtitle"], config["accent"])
        product_card(c, PRODUCT_PAIN, 790, 114, 190, 204, config["card_title_2"], config["card_subtitle_2"], config["chip_accent"])
    c.save()
    return path


def category_banners():
    configs = [
        {
            "filename": "ava-category-health-wellness-banner.pdf",
            "eyebrow": "HEALTH & WELLNESS",
            "eyebrow_w": 292,
            "title_lines": ["Daily wellness", "made simple"],
            "body_lines": ["Vitamins, immunity boosters, and daily", "essentials for the whole household."],
            "image": CATEGORY_VITAMINS,
            "bg_from": "#F0FDF4",
            "bg_to": "#FFFFFF",
            "soft": "#D1FAE5",
            "accent": PALETTE["green"],
            "chip_accent": PALETTE["blue"],
            "title_color": PALETTE["navy"],
            "body_color": PALETTE["ink"],
            "cta_fill": PALETTE["primary"],
            "cta_text": "#FFFFFF",
            "cta": "SHOP WELLNESS",
            "chip_1": "Vitamins",
            "chip_2": "Immunity",
            "badge_top": "SAVE",
            "badge_main": "20%",
            "badge_bottom": "TODAY",
            "badge_fill": PALETTE["amber"],
            "podium_top": "#FFFFFF",
            "podium_side": "#D1FAE5",
            "card_title": "Vitamin C",
            "card_subtitle": "Best seller",
            "card_title_2": "Pain relief",
            "card_subtitle_2": "OTC pick",
            "botanical": True,
        },
        {
            "filename": "ava-category-beauty-skincare-banner.pdf",
            "eyebrow": "BEAUTY & SKINCARE",
            "eyebrow_w": 294,
            "title_lines": ["Glow care", "for every day"],
            "body_lines": ["Dermatology-led skincare, body care,", "hair care, and clean beauty picks."],
            "image": CATEGORY_BEAUTY,
            "bg_from": "#FDECF6",
            "bg_to": "#F7B9D7",
            "soft": "#FCE7F3",
            "accent": PALETTE["primary"],
            "chip_accent": "#8B5CF6",
            "title_color": PALETTE["primary_dark"],
            "body_color": "#9F375F",
            "cta_fill": "#FFFFFF",
            "cta_text": PALETTE["primary"],
            "cta_stroke": "#FFFFFF",
            "cta": "SHOP BEAUTY",
            "chip_1": "Skincare",
            "chip_2": "Hair care",
            "badge_top": "UP TO",
            "badge_main": "10%",
            "badge_bottom": "OFF",
            "badge_fill": "#FFFFFF",
            "badge_size": 46,
            "podium_top": "#FFF8FF",
            "podium_side": "#F59AC4",
            "product_mode": "bottles",
            "card_title": "Skincare",
            "card_subtitle": "Routine pick",
            "card_title_2": "Personal care",
            "card_subtitle_2": "Daily use",
        },
        {
            "filename": "ava-category-mother-baby-care-banner.pdf",
            "eyebrow": "MOTHER & BABY",
            "eyebrow_w": 264,
            "title_lines": ["Gentle care", "for little ones"],
            "body_lines": ["Baby skincare, maternity wellness,", "diapers, wipes, and feeding essentials."],
            "image": CATEGORY_BABY,
            "bg_from": "#FFF7ED",
            "bg_to": "#FEF3C7",
            "soft": "#FFEDD5",
            "accent": "#EA580C",
            "chip_accent": PALETTE["primary"],
            "title_color": PALETTE["navy"],
            "body_color": PALETTE["ink"],
            "cta_fill": PALETTE["primary"],
            "cta_text": "#FFFFFF",
            "cta": "SHOP BABY",
            "chip_1": "Baby bath",
            "chip_2": "Maternity",
            "badge_top": "KSh",
            "badge_main": "300",
            "badge_bottom": "OFF",
            "badge_fill": "#EA580C",
            "podium_top": "#FFFFFF",
            "podium_side": "#FED7AA",
            "product_mode": "baby",
        },
        {
            "filename": "ava-category-self-care-lifestyle-banner.pdf",
            "eyebrow": "SELF-CARE",
            "eyebrow_w": 210,
            "title_lines": ["Rest, reset", "& recharge"],
            "body_lines": ["Aromatherapy, detox blends, fitness", "tools, and sustainable personal care."],
            "image": CATEGORY_NATURAL,
            "bg_from": "#F5F3FF",
            "bg_to": "#ECFEFF",
            "soft": "#EDE9FE",
            "accent": "#8B5CF6",
            "chip_accent": PALETTE["teal"],
            "title_color": PALETTE["navy"],
            "body_color": PALETTE["ink"],
            "cta_fill": "#8B5CF6",
            "cta_text": "#FFFFFF",
            "cta": "SHOP SELF-CARE",
            "chip_1": "Aromatherapy",
            "chip_1_w": 198,
            "chip_2": "Detox teas",
            "badge_top": "NEW",
            "badge_main": "KIT",
            "badge_bottom": "PICKS",
            "badge_fill": "#8B5CF6",
            "badge_size": 46,
            "podium_top": "#FFFFFF",
            "podium_side": "#DDD6FE",
            "product_mode": "bottles",
            "botanical": True,
        },
        {
            "filename": "ava-category-prescription-medicines-banner.pdf",
            "eyebrow": "PRESCRIPTION",
            "eyebrow_w": 238,
            "title_lines": ["Upload Rx.", "Get support."],
            "body_lines": ["Prescription medicines, pharmacist review,", "order tracking, and secure records."],
            "image": CATEGORY_PRESCRIPTION,
            "bg_from": "#EFF6FF",
            "bg_to": "#FFFFFF",
            "soft": "#DBEAFE",
            "accent": PALETTE["blue"],
            "chip_accent": PALETTE["green"],
            "title_color": PALETTE["navy"],
            "body_color": PALETTE["ink"],
            "cta_fill": PALETTE["primary"],
            "cta_text": "#FFFFFF",
            "cta": "UPLOAD RX",
            "chip_1": "Pharmacist",
            "chip_2": "Secure",
            "badge_top": "FREE",
            "badge_main": "RX",
            "badge_bottom": "HELP",
            "badge_fill": PALETTE["primary"],
            "badge_size": 48,
            "podium_top": "#FFFFFF",
            "podium_side": "#BFDBFE",
            "card_title": "Prescription",
            "card_subtitle": "Review",
            "card_title_2": "OTC support",
            "card_subtitle_2": "Ask us",
        },
        {
            "filename": "ava-category-over-the-counter-banner.pdf",
            "eyebrow": "OTC MEDICINES",
            "eyebrow_w": 252,
            "title_lines": ["Relief when", "you need it"],
            "body_lines": ["Pain relief, cough and cold care,", "digestive support, and first-aid picks."],
            "image": CATEGORY_OTC,
            "bg_from": "#FEF2F2",
            "bg_to": "#FFF7ED",
            "soft": "#FEE2E2",
            "accent": "#DC2626",
            "chip_accent": PALETTE["amber"],
            "title_color": PALETTE["navy"],
            "body_color": PALETTE["ink"],
            "cta_fill": "#DC2626",
            "cta_text": "#FFFFFF",
            "cta": "SHOP OTC",
            "chip_1": "Pain relief",
            "chip_2": "Cold care",
            "badge_top": "FAST",
            "badge_main": "CARE",
            "badge_bottom": "PICKS",
            "badge_fill": "#DC2626",
            "badge_size": 42,
            "podium_top": "#FFFFFF",
            "podium_side": "#FECACA",
            "card_title": "Pain relief",
            "card_subtitle": "Deal pick",
            "card_title_2": "Cold care",
            "card_subtitle_2": "Seasonal",
        },
        {
            "filename": "ava-category-medical-devices-banner.pdf",
            "eyebrow": "HOME DIAGNOSTICS",
            "eyebrow_w": 304,
            "title_lines": ["Monitor health", "from home"],
            "body_lines": ["Thermometers, BP monitors, glucose", "testing, and reliable home devices."],
            "image": CATEGORY_DEVICES,
            "bg_from": "#ECFEFF",
            "bg_to": "#EFF6FF",
            "soft": "#CFFAFE",
            "accent": "#0891B2",
            "chip_accent": PALETTE["blue"],
            "title_color": PALETTE["navy"],
            "body_color": PALETTE["ink"],
            "cta_fill": "#0891B2",
            "cta_text": "#FFFFFF",
            "cta": "SHOP DEVICES",
            "chip_1": "BP monitors",
            "chip_2": "Thermometers",
            "chip_2_w": 206,
            "badge_top": "HOME",
            "badge_main": "CARE",
            "badge_bottom": "READY",
            "badge_fill": "#0891B2",
            "badge_size": 42,
            "podium_top": "#FFFFFF",
            "podium_side": "#A5F3FC",
            "product_mode": "devices",
        },
        {
            "filename": "ava-category-herbal-remedies-banner.pdf",
            "eyebrow": "HERBAL REMEDIES",
            "eyebrow_w": 288,
            "title_lines": ["Natural support", "for daily care"],
            "body_lines": ["Herbal alternatives, natural remedies,", "wellness teas, and plant-based picks."],
            "image": CATEGORY_HERBAL,
            "bg_from": "#ECFDF5",
            "bg_to": "#FFF7ED",
            "soft": "#D1FAE5",
            "accent": "#15803D",
            "chip_accent": "#D97706",
            "title_color": PALETTE["navy"],
            "body_color": PALETTE["ink"],
            "cta_fill": "#15803D",
            "cta_text": "#FFFFFF",
            "cta": "SHOP HERBAL",
            "chip_1": "Herbal",
            "chip_2": "Tea blends",
            "badge_top": "PLANT",
            "badge_main": "CARE",
            "badge_bottom": "PICKS",
            "badge_fill": "#15803D",
            "badge_size": 42,
            "podium_top": "#FFFFFF",
            "podium_side": "#BBF7D0",
            "product_mode": "bottles",
            "botanical": True,
        },
    ]
    return [category_banner(config) for config in configs]


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for pdf in [product_feature(), promotion_discount(), health_service(), *category_banners()]:
        print(pdf)


if __name__ == "__main__":
    main()
