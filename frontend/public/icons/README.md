# Icons

Place the following icon files here for PWA and visionOS support:

- `icon-512.png` — 512×512, purpose: "any" (transparent background allowed)
- `icon-1024-maskable.png` — 1024×1024, purpose: "maskable" (NO transparent background, will be cropped to circle on visionOS)

You can generate PNG icons from `icon.svg` using any SVG-to-PNG converter, or use the sample icons from the WebSpatial docs:
https://webspatial.dev/assets/guide/webspatial-icon-examples.zip

For development/simulator testing, WebSpatial Builder will use placeholder icons if these files are missing.
