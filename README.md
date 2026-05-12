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
| Primary (brand) | `#f9e2af` Mocha Yellow |
| Secondary | `#fab387` Mocha Peach |
| Tertiary | `#f5e0dc` Mocha Rosewater |
| Surfaces | `#161412` / `#0e0d0c` / `#221f1c` / `#2f2b27` (warm charcoal ramp) |
| Text | `#cdd6f4` / `#a6adc8` / `#6c7086` |
| Success / Seeders | `#a6e3a1` Mocha Green |
| Danger / Leechers | `#f38ba8` Mocha Red |
| Info / Links | `#89b4fa` Mocha Blue |
| Accent (premium) | `#cba6f7` Mocha Mauve |
| Accent (cool) | `#94e2d5` Mocha Teal |

## Light-mode variant

The override is built around a single `--cp-*` design-token layer, so a light-mode sister theme (Catppuccin Latte) can be produced by cloning this file and swapping just the token values — the per-component mappings carry over unchanged.

## License

The override file (`capyppuccin.css`) is released as-is, free to fork and modify. The bundled `material-design-v3-dark.css` and `main-6Vf30Upt.css` belong to the upstream UNIT3D project and retain their original UNIT3D license.
