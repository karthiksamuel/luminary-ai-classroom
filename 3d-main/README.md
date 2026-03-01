# LUMINARY

WebSpatial VisionOS app built on the `3d-main` reference structure.

## Run locally

```bash
npm install
XR_ENV=avp npm run dev
```

Then launch the VisionOS runtime:

```bash
npx webspatial-builder run --base=http://localhost:5173/webspatial/avp
```

## Teacher assets

The teacher avatar animations are stored in `public/models/teacher/`:

- `idle-apple.usdz`
- `happy-idle-apple.usdz`
- `talking-apple.usdz`
- `talking2-apple.usdz`

The app defaults to `idle-apple.usdz` and swaps between the two talking clips
when `isTalking` is enabled.
