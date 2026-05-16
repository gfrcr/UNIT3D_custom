#!/usr/bin/env node
/*
 * One-shot palette generator. Reads the canonical palette as template,
 * extracts the verbatim "COMPONENT MAPPINGS" section (all var refs, identical
 * across variants), and writes each configured variant's file with custom
 * tokens (top) + shared middle + palette-derived assets (bottom).
 *
 * Run: node scripts/gen-palettes.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
// Use teal as middle-section template (single-line section comments —
// canonical uses verbose block comments that complicate slicing).
const CANONICAL = path.join(ROOT, "src/_palette-teal.css");

// Read canonical, slice out the middle section (from "/* Buttons */" through
// to just before "/* Palette-derived assets" comment).
const src = fs.readFileSync(CANONICAL, "utf8");
const middleStart = src.indexOf("/* Buttons */");
const middleEnd = src.indexOf("/* Palette-derived assets");
if (middleStart < 0 || middleEnd < 0) {
  console.error("Could not slice canonical template");
  process.exit(1);
}
const MIDDLE = src.slice(middleStart, middleEnd);

// URL-encode a hex base color for the inline checkbox-check SVG.
const enc = (hex) => `%23${hex.replace("#", "")}`;
// rgba builder from #rrggbb + alpha.
const rgba = (hex, a) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const variants = [
  {
    name: "dracula",
    title: "Capyppuccin (dracula) — variant palette",
    desc: "Dracula: signature purple accent over dark slate.",
    soft: "#efe6ff",
    light: "#d4bdfb",
    accent: "#bd93f9",
    strong: "#9b6df5",
    peach: "#ffb86c",
    rosewater: "#ff79c6",
    base: "#282a36",
    mantle: "#1d1f2a",
    surface0: "#44475a",
    surface1: "#565973",
    text: "#f8f8f2",
    subtext: "#c9c8c2",
    overlay: "#6272a4",
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
    desc: "Tokyo Night Storm: blue-purple accent over navy surfaces.",
    soft: "#c0caf5",
    light: "#7dcfff",
    accent: "#7aa2f7",
    strong: "#bb9af7",
    peach: "#ff9e64",
    rosewater: "#f7768e",
    base: "#24283b",
    mantle: "#1f2335",
    surface0: "#292e42",
    surface1: "#3b4261",
    text: "#c0caf5",
    subtext: "#a9b1d6",
    overlay: "#565f89",
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
    desc: "Rosé Pine Moon: gold accent over deep purple surfaces.",
    soft: "#f9d49d",
    light: "#f6c177",
    accent: "#f6c177",
    strong: "#e9b770",
    peach: "#ea9a97",
    rosewater: "#f4dcd6",
    base: "#232136",
    mantle: "#191724",
    surface0: "#2a273f",
    surface1: "#393552",
    text: "#e0def4",
    subtext: "#908caa",
    overlay: "#6e6a86",
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
    desc: "Everforest Dark: sage green accent over forest charcoal.",
    soft: "#d3c6aa",
    light: "#a7c080",
    accent: "#a7c080",
    strong: "#83c092",
    peach: "#e69875",
    rosewater: "#e67e80",
    base: "#2d353b",
    mantle: "#232a2e",
    surface0: "#343f44",
    surface1: "#3d484d",
    text: "#d3c6aa",
    subtext: "#9da9a0",
    overlay: "#4f585e",
    green: "#a7c080",
    red: "#e67e80",
    blue: "#7fbbb3",
    mauve: "#d699b6",
    teal: "#83c092",
    pink: "#d699b6",
  },
];

function buildPalette(v) {
  const top = `/*!
 * ${v.title}
 * ${v.desc}
 * See _palette-capyppuccin.css for the annotated reference. */

:root {
  --cp-accent-soft: ${v.soft};
  --cp-accent-light: ${v.light};
  --cp-accent: ${v.accent};
  --cp-accent-strong: ${v.strong};
  --cp-peach: ${v.peach};
  --cp-rosewater: ${v.rosewater};

  --cp-base: ${v.base};
  --cp-mantle: ${v.mantle};
  --cp-surface-0: ${v.surface0};
  --cp-surface-1: ${v.surface1};

  --cp-text: ${v.text};
  --cp-subtext: ${v.subtext};
  --cp-overlay: ${v.overlay};

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
  --checkbox-check-svg: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='${enc(v.base)}'><path d='M6.173 11.591l-3.18-3.181 1.176-1.177 2.004 2.005 5.83-5.831 1.177 1.176z'/></svg>");
  --forum-tag-accent-strong-wash: ${rgba(v.strong, 0.22)};
  --forum-tag-green-wash: ${rgba(v.green, 0.18)};
  --forum-tag-pink-wash: ${rgba(v.pink, 0.18)};
  --forum-tag-red-wash: ${rgba(v.red, 0.18)};
  --forum-tag-mauve-wash: ${rgba(v.mauve, 0.18)};
  --forum-tag-subtext-wash: ${rgba(v.subtext, 0.18)};
  --forum-tag-red-wash-light: ${rgba(v.red, 0.12)};
}
`;
  return top + MIDDLE + bottom;
}

function buildBgWrapper(name) {
  return `/*!
 * Capyppuccin (${name}) — variant with capybara background pattern
 * https://github.com/gfrcr/UNIT3D_custom
 *
 * Thin wrapper: imports the ${name} theme and adds the cbr capybara SVG as
 * a repeating body background. Use this URL instead of capyppuccin-${name}.min.css
 * when you want the pattern.
 */

@import url("https://gfrcr.github.io/UNIT3D_custom/capyppuccin-${name}.min.css");

body {
  background-image: url("https://gfrcr.github.io/UNIT3D_custom/bg.svg");
  background-repeat: repeat;
  background-size: 120px;
  background-attachment: fixed;
}
`;
}

for (const v of variants) {
  const palette = path.join(ROOT, `src/_palette-${v.name}.css`);
  fs.writeFileSync(palette, buildPalette(v));
  console.log(`wrote ${palette}`);

  const bg = path.join(ROOT, `src/capyppuccin-${v.name}-bg.css`);
  fs.writeFileSync(bg, buildBgWrapper(v.name));
  console.log(`wrote ${bg}`);
}
