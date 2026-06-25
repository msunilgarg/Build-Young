# Build Young — marketing flyer

A print- and Peachjar-ready one-page flyer (PDF, 8.5×11 portrait) for **parents**. QR → https://www.build-young.com.

| File | Who it's for | Style |
|---|---|---|
| `build-young-flyer.pdf` | **Parents** | The 12-week journey, features, builder prize, scholarships, and industry quotes |

## Regenerate

Requires Python with WeasyPrint + qrcode:
```bash
pip install weasyprint "qrcode[pil]"
python3 build.py            # → build-young-flyer.pdf
```

The PDF is the artifact to upload (Peachjar requires PDF, ≤4 pages, 8.5×11). Edit copy/design in
`build.py` — it uses system Liberation Sans + inline lucide-style SVG icons.
