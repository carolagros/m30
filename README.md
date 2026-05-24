
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

## Firebase images

The standalone calendar can use Firebase Storage for optimized photos while keeping
local images as a fallback until Firebase is ready.

1. Install ImageMagick once, then generate optimized upload files:

```sh
brew install imagemagick
node scripts/prepare-firebase-images.mjs --force
```

If you have `npm` available, `npm run prepare:firebase-images` does the same.
Use `--force` when regenerating after an earlier upload so existing optimized
files are replaced.

This writes outside the project by default:

```text
../firebase-upload/m30-calendar/thumbs/src/pics/...jpg
../firebase-upload/m30-calendar/large/src/pics/...jpg
```

2. Create Firebase Storage, publish rules equivalent to `firebase-storage.rules`,
and upload the generated `m30-calendar` folder to the root of the bucket.
With Google Cloud CLI, the upload command is:

```sh
gcloud storage cp -r ../firebase-upload/m30-calendar gs://YOUR_BUCKET/
```

3. In `index.html`, set:

```js
const firebaseImages = {
  bucket: "YOUR_BUCKET",
  root: "m30-calendar",
};
```

Until `bucket` is filled in, the page keeps using the local `src/pics` files.
After `bucket` is filled in, calendar stickers use `thumbs/...` and the modal
uses `large/...`.

Do not delete `src/pics` until the published page has been tested with Firebase.
