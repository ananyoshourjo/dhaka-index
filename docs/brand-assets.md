# Dhaka Index brand assets

The supplied logo files are available under `public/brand` in the main app and
are mirrored under `admin-portal/public/brand` because the admin portal is a
separately served Next.js application.

| Asset | Intended use |
| --- | --- |
| `di-logo-transparent.svg` | Primary UI mark on light or controlled backgrounds |
| `di-logo-transparent.png` | Raster brand asset for controlled light surfaces; not used as a favicon |
| `di-logo-white-background.svg` | Primary browser favicon, standalone vector, and legacy shortcut icon |
| `di-logo-white-background.png` | PNG favicon fallback, Apple touch icon, and raster contexts that require a guaranteed white canvas |

Keep the transparent SVG as the default in product UI. Use the white-background
versions when the surrounding surface cannot be controlled.
