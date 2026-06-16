# Build Young — marketing flyers

Two print- and Peachjar-ready one-page flyers (PDF, 8.5×11 portrait). Both QR → https://www.build-young.com.

| File | Who it's for | Style |
|---|---|---|
| `build-young-flyer.pdf` (**v1**) | **Parents** | Dense: the 12-week journey, features, builder prize, founder/builder quotes |
| `build-young-flyer-v2.pdf` (**v2**) | **Students** (high schoolers) | Simple, to-the-point: one headline + a "what you'll do" checklist + one CTA; navy/orange/teal on a light-blue gradient |

## Regenerate

**v1** — requires Python with WeasyPrint + qrcode:
```bash
pip install weasyprint "qrcode[pil]"
python3 build.py            # → build-young-flyer.pdf
```

**v2** — Node, renders the HTML to PDF/PNG via headless Chrome (no WeasyPrint):
```bash
npm i puppeteer-core qrcode   # + a Chrome (e.g. the puppeteer cache)
NODE_PATH=<node_modules> PUPPETEER_EXECUTABLE_PATH=<chrome> \
  node build-v2.cjs          # → build-young-flyer-v2.{html,pdf,png}
```

Each PDF is the artifact to upload (Peachjar requires PDF, ≤4 pages, 8.5×11). Edit copy/design in
`build.py` (v1) or `build-v2.cjs` (v2) — both use system Liberation Sans + inline lucide-style SVG icons.
