
# Interactive Annual Calendar

This repository includes a standalone `index.html` that can be served directly by GitHub Pages.

## GitHub Pages

Use the repository root as the Pages source. GitHub Pages will load `index.html` directly, without needing a build step.

The standalone page reads the generated photo manifest embedded in `index.html`. Photos with EXIF creation metadata matching their folder year are placed in their real month. Photos without usable metadata, or with metadata whose year does not match the folder year, are kept in the folder year and distributed with a stable random month/position.

If you prefer a Vite build later, the project is configured to emit relative assets into `docs/` with:

```sh
npm install
npm run build
```

Then choose `/docs` as the Pages source.

## Development

The original React/Vite source is kept under `src/`.
