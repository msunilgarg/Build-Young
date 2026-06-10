import io, base64, os, qrcode
from weasyprint import HTML

# --- QR (www = canonical host) ---
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=16, border=1)
qr.add_data("https://www.build-young.com"); qr.make(fit=True)
b=io.BytesIO(); qr.make_image(fill_color="#0b2942", back_color="white").save(b, format="PNG")
QR=base64.b64encode(b.getvalue()).decode()

BLUE="#0067b8"; BLUED="#0b3b66"; TEAL="#0a7d85"; GREEN="#178045"; PURPLE="#5c2e91"
INK="#242424"; INK2="#424242"; MUTED="#5c5a58"; LINE="#e6e4e2"; SPARK="#34d3c2"

ICONS={
"rocket":'<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09"/><path d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05"/>',
"trending":'<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
"grad":'<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
"users":'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
"sparkles":'<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>',
"cal":'<path d="M16 14v2.2l1.6 1"/><path d="M16 2v4"/><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M3 10h5"/><path d="M8 2v4"/><circle cx="16" cy="16" r="6"/>',
"badge":'<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
"trophy":'<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>',
"arrow":'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
}
def ic(n,size,color,sw="2"):
    return f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{ICONS[n]}</svg>'

MARK=f'''<svg width="30" height="30" viewBox="0 -10 58 68" style="vertical-align:-6px">
<rect x="0" y="34" width="16" height="22" rx="3" fill="#fff" opacity="0.78"/><rect x="21" y="20" width="16" height="36" rx="3" fill="#fff" opacity="0.9"/><rect x="42" y="2" width="16" height="54" rx="3" fill="#fff"/><path d="M50 -8 l6 8 h-12 z" fill="{SPARK}"/></svg>'''
HEROMARK=f'''<svg width="1.45in" height="1.45in" viewBox="0 -10 58 68">
<rect x="0" y="34" width="16" height="22" rx="3" fill="{BLUE}" opacity="0.14"/><rect x="21" y="20" width="16" height="36" rx="3" fill="{TEAL}" opacity="0.14"/><rect x="42" y="2" width="16" height="54" rx="3" fill="{GREEN}" opacity="0.16"/><path d="M50 -8 l6 8 h-12 z" fill="{SPARK}" opacity="0.3"/></svg>'''

def jstep(color,icon,title,weeks):
    return f'<div class="jstep"><div class="jbadge" style="background:{color}">{ic(icon,"0.46in","#fff","2.1")}</div><div class="jtitle">{title}</div><div class="jweeks">{weeks}</div></div>'
ARROW=f'<div class="jarrow">{ic("arrow","0.26in",MUTED,"2.2")}</div>'
def feat(icon,color,label):
    return f'<div class="feat"><div class="featic" style="background:{color}1a">{ic(icon,"0.26in",color,"2.1")}</div><div class="featlabel">{label}</div></div>'
def quote(q,who):
    return f'<div class="qcol"><div class="q">&ldquo;{q}&rdquo;</div><div class="who">{who}</div></div>'

html=f'''<!doctype html><html><head><meta charset="utf-8"><style>
@page {{ size: Letter; margin:0; }}
*{{box-sizing:border-box;}}
body{{margin:0;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;color:{INK};}}
.page{{width:8.5in;height:11in;display:flex;flex-direction:column;overflow:hidden;}}
.header{{background:linear-gradient(110deg,{BLUE},{BLUED});color:#fff;padding:0.30in 0.5in;display:flex;align-items:center;justify-content:space-between;}}
.brand{{font-size:24pt;font-weight:700;letter-spacing:-0.5px;}}
.tag{{font-size:11pt;font-style:italic;opacity:0.92;}}
.hero{{display:flex;align-items:center;padding:0.34in 0.5in 0.20in;gap:0.2in;}}
.hero-l{{flex:1;}}
.h1{{font-size:25pt;font-weight:700;line-height:1.1;letter-spacing:-0.5px;margin:0;}}
.h1 .ac{{color:{BLUE};}}
.chips{{margin-top:0.2in;display:flex;gap:0.12in;flex-wrap:wrap;}}
.chip{{font-size:9.5pt;font-weight:700;color:{BLUED};background:#eaf3fb;border:1px solid #d4e6f7;border-radius:999px;padding:5px 13px;letter-spacing:0.2px;}}
.heromark{{flex-shrink:0;}}
.section-h{{text-align:center;font-size:9.5pt;font-weight:700;color:{MUTED};letter-spacing:1.2px;text-transform:uppercase;margin:0.08in 0 0.04in;}}
.journey{{display:flex;align-items:flex-start;justify-content:center;padding:0.04in 0.4in 0.14in;}}
.jstep{{flex:0 0 auto;width:1.7in;text-align:center;}}
.jbadge{{width:0.86in;height:0.86in;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 7px;}}
.jtitle{{font-size:11.5pt;font-weight:700;color:{INK};line-height:1.1;}}
.jweeks{{font-size:9pt;font-weight:700;color:{MUTED};margin-top:2px;letter-spacing:0.3px;}}
.jarrow{{flex:0 0 auto;padding-top:0.30in;}}
.feats{{display:flex;justify-content:space-between;gap:0.12in;padding:0.10in 0.5in;}}
.feat{{flex:1;text-align:center;}}
.featic{{width:0.5in;height:0.5in;border-radius:11px;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;}}
.featlabel{{font-size:10pt;font-weight:600;color:{INK2};line-height:1.22;}}
.prize{{margin:0.06in 0.5in;background:#f6f1fb;border:1px solid #e3d6f2;border-radius:7px;padding:0.10in 0.16in;display:flex;align-items:center;gap:9px;}}
.prize .t{{font-size:10pt;color:{INK2};line-height:1.3;}}
.prize .t b{{color:{PURPLE};}}
.quotes{{flex:1;display:flex;align-items:center;gap:0.24in;padding:0.04in 0.5in;}}
.qcol{{flex:1;border-left:3px solid #cfe0f0;padding-left:0.12in;}}
.qcol .q{{font-size:9pt;font-style:italic;color:#3a3a3a;line-height:1.3;}}
.qcol .who{{font-size:7.5pt;font-weight:700;color:{BLUE};margin-top:5px;}}
.cta{{margin-top:auto;background:linear-gradient(110deg,{TEAL},{GREEN});color:#fff;padding:0.26in 0.5in;display:flex;align-items:center;justify-content:space-between;gap:0.3in;}}
.cta .big{{font-size:17pt;font-weight:700;}}
.cta .url{{font-size:15pt;font-weight:700;margin-top:3px;}}
.cta .sm{{font-size:10pt;opacity:0.95;margin-top:5px;}}
.qr{{background:#fff;border-radius:9px;padding:8px;text-align:center;flex-shrink:0;}}
.qr img{{width:1.15in;height:1.15in;display:block;}}
.qr .cap{{font-size:7.5pt;color:{INK2};font-weight:700;margin-top:3px;letter-spacing:0.3px;}}
</style></head><body>
<div class="page">
  <div class="header"><div class="brand">{MARK} Build Young</div><div class="tag">Raising builders, not consumers.</div></div>
  <div class="hero">
    <div class="hero-l">
      <div class="h1">AI just collapsed the barrier to building.<br>Now your high schooler can build <span class="ac">something real.</span></div>
      <div class="chips"><span class="chip">12 WEEKS</span><span class="chip">LIVE &middot; SMALL GROUPS</span><span class="chip">HIGH SCHOOLERS</span><span class="chip">BUILD WITH CLAUDE CODE</span></div>
    </div>
    <div class="heromark">{HEROMARK}</div>
  </div>
  <div class="section-h">The 12-week journey</div>
  <div class="journey">
    {jstep(BLUE,"rocket","Build &amp; Launch","WEEKS 1–7")}{ARROW}{jstep(TEAL,"trending","Learn to Grow","WEEKS 8–10")}{ARROW}{jstep(GREEN,"grad","Present It","WEEKS 11–12")}
  </div>
  <div class="feats">
    {feat("users",BLUE,"Live &amp; small-group")}{feat("sparkles",TEAL,"Build with Claude Code")}{feat("cal",PURPLE,"Twice a week, evenings")}{feat("badge",GREEN,"Certificate to share")}
  </div>
  <div class="prize">{ic("trophy","0.34in",PURPLE,"2")}<div class="t"><b>Builder Prize:</b> the first student in each cohort to land a real paying customer within a year gets tuition refunded.</div></div>
  <div class="quotes">
    {quote("The hottest new programming language is English.","Andrej Karpathy &middot; Anthropic")}
    {quote("A one-person billion-dollar company would have been unimaginable without AI — and now it will happen.","Sam Altman &middot; OpenAI")}
    {quote("Everyone is a programmer — now you just say something to the computer.","Jensen Huang &middot; NVIDIA")}
  </div>
  <div class="cta">
    <div><div class="big">Now enrolling — starts September</div><div class="url">www.build-young.com</div><div class="sm">See all dates &amp; enroll online &middot; Free 15-min intro call — talk to us.</div></div>
    <div class="qr"><img src="data:image/png;base64,{QR}"><div class="cap">SCAN TO LEARN MORE</div></div>
  </div>
</div></body></html>'''

out=os.path.join(os.path.dirname(os.path.abspath(__file__)),"build-young-flyer.pdf")
HTML(string=html).write_pdf(out)
open(os.path.join(os.path.dirname(os.path.abspath(__file__)),"flyer.html"),"w").write(html)
print("wrote",out)
