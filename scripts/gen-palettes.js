#!/usr/bin/env node
/*
 * Palette generator with OKLCH ladder.
 *
 * Each variant picks a `mode` (dark|light), a `hue` (0-360), and a `chroma`
 * (0-0.1, hint of color on neutrals). The surface ladder (mantle → base →
 * surface-0 → surface-1) and the text ladder (overlay → subtext → text) get
 * derived from those via OKLCH lightness steps — same math Catppuccin uses
 * internally. Accent ramp + semantic colors stay manual (per-variant taste).
 *
 * Reads src/_palette-teal.css as the middle-section template (verbatim var
 * mappings — identical across variants). Writes:
 *   - src/_palette-<name>.css     (full palette file)
 *   - src/capyppuccin-<name>-bg.css (capybara-bg wrapper)
 *
 * Run: node scripts/gen-palettes.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CANONICAL = path.join(ROOT, "src/_palette-teal.css");

const src = fs.readFileSync(CANONICAL, "utf8");
const middleStart = src.indexOf("/* Buttons */");
const middleEnd = src.indexOf("/* Palette-derived assets");
if (middleStart < 0 || middleEnd < 0) {
  console.error("Could not slice canonical template");
  process.exit(1);
}
const MIDDLE = src.slice(middleStart, middleEnd);

// ── color math ───────────────────────────────────────────────────────────

const enc = (hex) => `%23${hex.replace("#", "")}`;
const rgba = (hex, a) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

// OKLCH → sRGB hex. Standard pipeline: polar → OKLab → linear LMS → linear
// sRGB → gamma-corrected sRGB → 8-bit hex. Coefficients from Björn Ottosson's
// OKLab spec (https://bottosson.github.io/posts/oklab/).
function oklch(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3,
    m = m_ ** 3,
    s = s_ ** 3;
  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const toSrgb = (v) =>
    v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
  const r = Math.round(Math.max(0, Math.min(1, toSrgb(rLin))) * 255);
  const g = Math.round(Math.max(0, Math.min(1, toSrgb(gLin))) * 255);
  const bb = Math.round(Math.max(0, Math.min(1, toSrgb(bLin))) * 255);
  return "#" + [r, g, bb].map((v) => v.toString(16).padStart(2, "0")).join("");
}

// Derive the 7 surface/text levels from hue + chroma + mode + baseL anchor.
// Steps between layers are constant; baseL shifts the entire ladder up/down
// to differentiate Frappé from Macchiato from Mocha (etc) — Catppuccin
// separates its dark flavors by ~5% of lightness, not hue. Chroma is halved
// on text/subtext/overlay to keep them mostly neutral with a hue hint.
function deriveSurfaces(mode, hue, chroma, baseL) {
  if (mode === "dark") {
    // Surfaces shift with baseL (mantle/base/surface0/surface1) — that's the
    // dial that separates Frappé from Macchiato from Mocha. Overlay/subtext/
    // text stay anchored at absolute L's: legibility doesn't depend on how
    // dark the base is, and letting them ride baseL pushes text near-white
    // on lighter dark variants (was the Frappé bug).
    return {
      mantle: oklch(baseL - 0.05, chroma, hue),
      base: oklch(baseL, chroma, hue),
      surface0: oklch(baseL + 0.06, chroma, hue),
      surface1: oklch(baseL + 0.13, chroma, hue),
      overlay: oklch(0.6, chroma * 0.4, hue),
      subtext: oklch(0.8, chroma * 0.3, hue),
      text: oklch(0.87, chroma * 0.2, hue),
    };
  }
  // light: layers go darker as we descend from base; text/subtext/overlay
  // anchored absolute for the same legibility reason.
  return {
    base: oklch(baseL, chroma, hue),
    mantle: oklch(baseL - 0.03, chroma, hue),
    surface0: oklch(baseL - 0.1, chroma, hue),
    surface1: oklch(baseL - 0.15, chroma, hue),
    overlay: oklch(0.55, chroma * 0.4, hue),
    subtext: oklch(0.4, chroma * 0.3, hue),
    text: oklch(0.27, chroma * 0.2, hue),
  };
}

// ── variants ─────────────────────────────────────────────────────────────

const variants = [
  {
    name: "dracula",
    title: "Capyppuccin (dracula) — variant palette",
    desc: "Dracula: signature purple over slate.",
    mode: "dark",
    hue: 285,
    chroma: 0.04,
    baseL: 0.22,
    soft: "#efe6ff",
    light: "#d4bdfb",
    accent: "#bd93f9",
    strong: "#9b6df5",
    peach: "#ffb86c",
    rosewater: "#ff79c6",
    green: "#50fa7b",
    red: "#ff5555",
    blue: "#8be9fd",
    mauve: "#bd93f9",
    teal: "#8be9fd",
    pink: "#ff79c6",
  },
  {
    name: "tokyo-night",
    title: "Capyppuccin (tokyo night storm) — variant palette",
    desc: "Tokyo Night Storm: blue-purple over navy.",
    mode: "dark",
    hue: 250,
    chroma: 0.05,
    baseL: 0.24,
    soft: "#c0caf5",
    light: "#7dcfff",
    accent: "#7aa2f7",
    strong: "#bb9af7",
    peach: "#ff9e64",
    rosewater: "#f7768e",
    green: "#9ece6a",
    red: "#f7768e",
    blue: "#7aa2f7",
    mauve: "#bb9af7",
    teal: "#73daca",
    pink: "#ff9e64",
  },
  {
    name: "rose-pine",
    title: "Capyppuccin (rosé pine moon) — variant palette",
    desc: "Rosé Pine Moon: gold over deep purple.",
    mode: "dark",
    hue: 270,
    chroma: 0.03,
    baseL: 0.23,
    soft: "#f9d49d",
    light: "#f6c177",
    accent: "#f6c177",
    strong: "#e9b770",
    peach: "#ea9a97",
    rosewater: "#f4dcd6",
    green: "#9ccfd8",
    red: "#eb6f92",
    blue: "#3e8fb0",
    mauve: "#c4a7e7",
    teal: "#9ccfd8",
    pink: "#ea9a97",
  },
  {
    name: "everforest",
    title: "Capyppuccin (everforest dark) — variant palette",
    desc: "Everforest Dark: sage green over forest charcoal.",
    mode: "dark",
    hue: 130,
    chroma: 0.025,
    baseL: 0.25,
    soft: "#d3c6aa",
    light: "#a7c080",
    accent: "#a7c080",
    strong: "#83c092",
    peach: "#e69875",
    rosewater: "#e67e80",
    green: "#a7c080",
    red: "#e67e80",
    blue: "#7fbbb3",
    mauve: "#d699b6",
    teal: "#83c092",
    pink: "#d699b6",
  },
  // Catppuccin flavors — accent stays yellow (Capyppuccin identity).
  // Surfaces auto-derived via OKLCH ladder; semantic colors verbatim from
  // catppuccin/palette palette.json v1.8.0.
  {
    name: "latte",
    title: "Capyppuccin (latte) — light variant palette",
    desc: "Capyppuccin Light: yellow accent on warm cream (warm hue, not Catppuccin's cool blue-grey).",
    mode: "light",
    hue: 50,
    chroma: 0.03,
    baseL: 0.93,
    soft: "#fceedb",
    light: "#efb966",
    accent: "#df8e1d",
    strong: "#b87114",
    peach: "#fe640b",
    rosewater: "#dc8a78",
    green: "#40a02b",
    red: "#d20f39",
    blue: "#1e66f5",
    mauve: "#8839ef",
    teal: "#179299",
    pink: "#ea76cb",
  },
  {
    name: "frappe",
    title: "Capyppuccin (frappé) — medium warm variant",
    desc: "Capyppuccin trio: same warm family as canonical, mid-dark surfaces — sits between canonical (dark) and latte (light).",
    mode: "dark",
    hue: 70,
    chroma: 0.012,
    baseL: 0.28,
    soft: "#fff8c5",
    light: "#fce087",
    accent: "#f9e2af",
    strong: "#e8c573",
    peach: "#fab387",
    rosewater: "#f5e0dc",
    green: "#a6e3a1",
    red: "#f38ba8",
    blue: "#89b4fa",
    mauve: "#cba6f7",
    teal: "#94e2d5",
    pink: "#f5c2e7",
  },
];

// ── builders ─────────────────────────────────────────────────────────────

function buildPalette(v) {
  const s = deriveSurfaces(v.mode, v.hue, v.chroma, v.baseL);
  const top = `/*!
 * ${v.title}
 * ${v.desc}
 * Surfaces derived via OKLCH ladder (hue ${v.hue}deg, chroma ${v.chroma}, ${v.mode} mode).
 * See _palette-capyppuccin.css for the annotated reference. */

:root {
  --cp-accent-soft: ${v.soft};
  --cp-accent-light: ${v.light};
  --cp-accent: ${v.accent};
  --cp-accent-strong: ${v.strong};
  --cp-peach: ${v.peach};
  --cp-rosewater: ${v.rosewater};

  --cp-base: ${s.base};
  --cp-mantle: ${s.mantle};
  --cp-surface-0: ${s.surface0};
  --cp-surface-1: ${s.surface1};

  --cp-text: ${s.text};
  --cp-subtext: ${s.subtext};
  --cp-overlay: ${s.overlay};

  --cp-green: ${v.green};
  --cp-red: ${v.red};
  --cp-blue: ${v.blue};
  --cp-mauve: ${v.mauve};
  --cp-teal: ${v.teal};
  --cp-pink: ${v.pink};

  /* Shape + shadow scales */
  --cp-radius-xs: 3px;
  --cp-radius-sm: 6px;
  --cp-radius-md: 10px;
  --cp-radius-lg: 14px;
  --cp-radius-xl: 20px;

  --cp-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.18);
  --cp-shadow-md: 0 3px 10px rgba(0, 0, 0, 0.22);
  --cp-shadow-lg: 0 6px 24px rgba(0, 0, 0, 0.28);
  --cp-glow-soft: 0 0 12px ${rgba(v.accent, 0.45)};
  --shadow-glow: 0 0 0 3px ${rgba(v.soft, 0.55)};

  /* SweetAlert2 — backdrop dim + accent-tinted focus rings. */
  --swal-backdrop-bg: rgba(0, 0, 0, 0.55);
  --swal-focus-ring: 0 0 0 3px ${rgba(v.accent, 0.35)};
  --swal-input-focus-ring: 0 0 0 2px ${rgba(v.accent, 0.25)};

`;
  const bottom = `
  /* Palette-derived assets (hex/rgba baked into URLs or alpha washes) */
  --checkbox-check-svg: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='${enc(s.base)}'><path d='M6.173 11.591l-3.18-3.181 1.176-1.177 2.004 2.005 5.83-5.831 1.177 1.176z'/></svg>");
  --forum-tag-accent-strong-wash: ${rgba(v.strong, 0.22)};
  --forum-tag-green-wash: ${rgba(v.green, 0.18)};
  --forum-tag-pink-wash: ${rgba(v.pink, 0.18)};
  --forum-tag-red-wash: ${rgba(v.red, 0.18)};
  --forum-tag-mauve-wash: ${rgba(v.mauve, 0.18)};
  --forum-tag-subtext-wash: ${rgba(s.subtext, 0.18)};
  --forum-tag-red-wash-light: ${rgba(v.red, 0.12)};
}
`;
  return top + MIDDLE + bottom;
}

function buildBgWrapper(v) {
  // Canonical drops the variant suffix in both filename and import URL.
  const baseUrl =
    v.name === "capyppuccin"
      ? "https://gfrcr.github.io/UNIT3D_custom/capyppuccin.min.css"
      : `https://gfrcr.github.io/UNIT3D_custom/capyppuccin-${v.name}.min.css`;
  const wrapperOut =
    v.name === "capyppuccin"
      ? "capyppuccin-bg.min.css"
      : `capyppuccin-${v.name}-bg.min.css`;
  // Light variants float their cream cards on a medium-warm frame and recolor
  // the capybara silhouettes via CSS mask — body::before is filled with
  // accent-strong, masked through bg.svg so only the capybara shape shows.
  // Same SVG works for every variant; color follows the palette var. Dark
  // variants keep the simpler background-image path — capybara dark fill
  // already sits naturally on their dark surfaces.
  if (v.mode === "light") {
    return `/*!
 * Capyppuccin (${v.name}) — variant with capybara background pattern
 * https://github.com/gfrcr/UNIT3D_custom
 *
 * Thin wrapper: imports the ${v.name} theme and overlays the capybara
 * silhouettes recolored to --cp-accent-strong via CSS mask, on a darker
 * body frame so the cream cards stand out. Use this URL instead of
 * ${wrapperOut.replace(".min.css", ".min.css")} when you want the pattern.
 */

@import url("${baseUrl}");

body {
  background-color: #5a544e;
  position: relative;
}
body::before {
  content: "";
  position: fixed;
  inset: 0;
  background-color: var(--cp-accent-strong);
  opacity: 0.3;
  -webkit-mask-image: url("https://gfrcr.github.io/UNIT3D_custom/bg.svg");
  mask-image: url("https://gfrcr.github.io/UNIT3D_custom/bg.svg");
  -webkit-mask-repeat: repeat;
  mask-repeat: repeat;
  -webkit-mask-size: 120px;
  mask-size: 120px;
  z-index: -1;
  pointer-events: none;
}
`;
  }
  return `/*!
 * Capyppuccin (${v.name}) — variant with capybara background pattern
 * https://github.com/gfrcr/UNIT3D_custom
 *
 * Thin wrapper: imports the ${v.name} theme and adds the cbr capybara SVG as
 * a repeating body background. Use this URL instead of ${wrapperOut.replace("-bg", "")} when you want the pattern.
 */

@import url("${baseUrl}");

body {
  background-image: url("https://gfrcr.github.io/UNIT3D_custom/bg.svg");
  background-repeat: repeat;
  background-size: 120px;
  background-attachment: fixed;
}
`;
}

// Wrapper-only variants: palette files are hand-authored (canonical
// capyppuccin) or were authored before this generator existed (teal). We
// don't overwrite their palettes, but they still need bg wrappers — pure
// boilerplate, just an @import + body bg.
const wrapperOnly = [
  { name: "capyppuccin", mode: "dark" },
  { name: "teal", mode: "dark" },
];

for (const v of variants) {
  const palette = path.join(ROOT, `src/_palette-${v.name}.css`);
  fs.writeFileSync(palette, buildPalette(v));
  console.log(`wrote ${palette}`);
}

// Wrappers go directly to root as build artifacts (gitignored unminified;
// CI/dev-watch handle the .min.css). Same path the gh-pages URLs serve from.
for (const v of [...wrapperOnly, ...variants]) {
  const bgName =
    v.name === "capyppuccin" ? "capyppuccin-bg.css" : `capyppuccin-${v.name}-bg.css`;
  const bg = path.join(ROOT, bgName);
  fs.writeFileSync(bg, buildBgWrapper(v));
  console.log(`wrote ${bg}`);
}
