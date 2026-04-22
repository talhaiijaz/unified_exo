
# CNT–Einzel Lens Studio

This bundle contains a browser-side CNT forest + einzel lens study page and a separate theory page.

## Files

- `index.html` — interactive study page
- `theory.html` — theory and design notes
- `style.css` — shared styling
- `app.js` — frontend UI and plotting
- `py_worker.js` — Pyodide web worker
- `cnt_einzel_model.py` — browser-side electrostatic + trajectory model

## How to run

Because the site uses a web worker and fetches Python source at runtime, open it through a local web server instead of double-clicking the HTML file.

A simple option is:

```bash
cd cnt_site_bundle
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Notes

- The browser version keeps the core physics loop but does **not** reproduce the full publication notebook workflow.
- Larger grids and denser bundles can take a while in-browser.
- The trajectory plot always reflects the bundle across the axis for visual clarity.
