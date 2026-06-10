# Build Young — marketing flyer

A print- and Peachjar-ready one-page flyer (PDF, 8.5×11 portrait), generated from `build.py`.
Icon-driven, low-text design; QR points to https://www.build-young.com.

## Regenerate
Requires Python with WeasyPrint + qrcode:

```bash
pip install weasyprint "qrcode[pil]"
python3 build.py          # → build-young-flyer.pdf
```

`build-young-flyer.pdf` is the artifact to upload (Peachjar requires PDF, ≤4 pages, 8.5×11).
Edit copy/design in `build.py` (system Liberation Sans + inline lucide-style SVG icons).
