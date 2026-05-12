# Capyppuccin — UNIT3D Theme

**Capyppuccin** is a custom theme override for UNIT3D-based trackers. It builds on the official Material Design v3 Dark theme and applies a yellow-dominant pastel palette (inspired by [Catppuccin Mocha](https://catppuccin.com)) over warm charcoal surfaces, with Outfit typography and softer radii/shadows.

## Files

- `capyppuccin.css` — the theme override (the only file you need to deploy).
- `material-design-v3-dark.css` — UNIT3D's base theme, included here as the reference target (do not deploy this file unless you're missing it upstream).
- `cbr.css` / `main-6Vf30Upt.css` — reference artifacts used during design (not deployed).
- `test/verify.html` — open in a browser to confirm the override took effect (computed-style assertions).
- `test/preview.html` — visual showcase of representative UNIT3D components with the override applied.

## Install

### Option A — GitHub Pages (recommended)

The override is published via GitHub Pages, which is allowed by UNIT3D's default Content Security Policy (`*.github.io`). If your tracker exposes an **External css stylesheet** field in the user settings (UNIT3D stock feature, "stacks on top of above theme"), just paste:

```
https://gfrcr.github.io/UNIT3D_custom/capyppuccin.css
```

Or, if you have access to the layout template, add it after the base theme:

```html
<link rel="stylesheet" href="/css/material-design-v3-dark.css">
<link rel="stylesheet" href="https://gfrcr.github.io/UNIT3D_custom/capyppuccin.css">
```

Pages serves whatever is on `main` — push a commit and the change propagates within ~1 minute.

### Option B — Self-hosted

If you prefer to ship the CSS yourself (no third-party dependency):

1. Copy `capyppuccin.css` into your UNIT3D fork's public CSS directory (typically `public/css/`).
2. Reference it in the layout:

   ```html
   <link rel="stylesheet" href="/css/material-design-v3-dark.css">
   <link rel="stylesheet" href="/css/capyppuccin.css">
   ```

### Verify

Hard-refresh the page. Open `test/verify.html` from a checkout of this repo to confirm the override resolves correctly (should report 34 assertions passing). To roll back the theme, remove the URL or `<link>` you added.

## Palette

| Role | Hex |
|------|-----|
| Yellow scale | `#fff8c5` soft · `#fce087` cream · `#f9e2af` **yellow** (brand) · `#e8c573` honey · `#caa55e` gold |
| Secondary warm | `#fab387` Mocha Peach |
| Tertiary | `#f5e0dc` Mocha Rosewater |
| Surfaces | `#161412` / `#0e0d0c` / `#221f1c` / `#2f2b27` (warm charcoal ramp) |
| Text | `#ebe2cf` / `#b8b1a0` / `#7d7869` (warm off-white scale) |
| Success / Seeders | `#a6e3a1` Mocha Green |
| Danger / Leechers | `#f38ba8` Mocha Red |
| Info / Links | `#89b4fa` Mocha Blue |
| Accent (premium) | `#cba6f7` Mocha Mauve |
| Accent (cool) | `#94e2d5` Mocha Teal |

## Self-hosting fonts (optional)

UNIT3D's default CSP allows `*.github.io` for stylesheets but only `'self'` for
fonts. As a result, the override ships **without** web fonts — UI falls back
to your platform's system font (San Francisco on macOS, Segoe UI on Windows,
the system default on Linux) plus `ui-monospace` for code/hash text.

If you want the original Outfit + JetBrains Mono typography:

1. Grab the four woff2 files from this repo's `fonts/` directory:
   - `outfit-latin.woff2`, `outfit-latin-ext.woff2`
   - `jetbrainsmono-latin.woff2`, `jetbrainsmono-latin-ext.woff2`
2. Copy them into your UNIT3D fork's `public/css/fonts/` (or wherever
   makes sense in your static-asset layout). After deploy they're
   reachable at `https://your-tracker/css/fonts/<filename>.woff2` —
   same origin as the tracker, so `font-src 'self'` permits them.
3. Add this block at the **very top** of `capyppuccin.css` (above `:root`),
   replacing `/css/fonts/` with whatever path you used:

   ```css
   @font-face {
     font-family: "Outfit"; font-style: normal; font-weight: 400 700;
     font-display: swap;
     src: url("/css/fonts/outfit-latin.woff2") format("woff2");
     unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
   }
   @font-face {
     font-family: "Outfit"; font-style: normal; font-weight: 400 700;
     font-display: swap;
     src: url("/css/fonts/outfit-latin-ext.woff2") format("woff2");
     unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
   }
   @font-face {
     font-family: "JetBrains Mono"; font-style: normal; font-weight: 400 500;
     font-display: swap;
     src: url("/css/fonts/jetbrainsmono-latin.woff2") format("woff2");
     unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
   }
   @font-face {
     font-family: "JetBrains Mono"; font-style: normal; font-weight: 400 500;
     font-display: swap;
     src: url("/css/fonts/jetbrainsmono-latin-ext.woff2") format("woff2");
     unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
   }
   ```

4. Hard-refresh. The font-family stacks already list Outfit/JetBrains Mono
   first, so they activate automatically once the @font-face URLs resolve.

## Light-mode variant

The override is built around a single `--cp-*` design-token layer, so a light-mode sister theme (Catppuccin Latte) can be produced by cloning this file and swapping just the token values — the per-component mappings carry over unchanged.

## License

The override file (`capyppuccin.css`) is released as-is, free to fork and modify. The bundled `material-design-v3-dark.css` and `main-6Vf30Upt.css` belong to the upstream UNIT3D project and retain their original UNIT3D license.
