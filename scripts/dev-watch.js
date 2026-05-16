#!/usr/bin/env node
/*
 * Watcher: rebuilds capyppuccin*.css + capyppuccin*.min.css for every palette
 * on src/ changes. Pairs with relink-override.js (which maintains the Chrome
 * Local Overrides hardlinks). Together: edit src/ → outputs refresh → Chrome
 * serves new bytes with zero ceremony.
 *
 * Each capyppuccin-<variant>.{,min}.css = src/_palette-<variant>.css + src/_core.css.
 * Canonical capyppuccin lives at capyppuccin.{,min}.css (no -capyppuccin suffix).
 *
 * Usage:
 *   node scripts/dev-watch.js          # foreground
 *   node scripts/dev-watch.js &        # background
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "src");
const CORE = path.join(SRC_DIR, "_core.css");
const OVERRIDE_DIR = path.join(ROOT, "gfrcr.github.io/UNIT3D_custom");

const ts = () => new Date().toISOString().slice(11, 19);

// Atomic write: tmp + rename. Mints a new inode → Chrome Local Overrides
// detects the rename and live-reloads CSS without manual refresh.
function atomicWrite(target, content) {
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, target);
}

// Re-hardlink the override path to target's new inode (target was just
// rename-replaced, so override's old hardlink is now orphaned).
function relink(target, overridePath) {
  if (!fs.existsSync(path.dirname(overridePath))) return;
  try {
    fs.unlinkSync(overridePath);
  } catch {
    /* didn't exist; will create */
  }
  fs.linkSync(target, overridePath);
}

function palettes() {
  return fs
    .readdirSync(SRC_DIR)
    .filter((f) => f.startsWith("_palette-") && f.endsWith(".css"))
    .map((f) => ({
      name: f.replace(/^_palette-|\.css$/g, ""),
      file: path.join(SRC_DIR, f),
    }));
}

function outNames(variant) {
  const base =
    variant === "capyppuccin" ? "capyppuccin" : `capyppuccin-${variant}`;
  return {
    css: path.join(ROOT, `${base}.css`),
    min: path.join(ROOT, `${base}.min.css`),
  };
}

let inflight = false;
let pending = false;

function rebuildAll() {
  if (inflight) {
    pending = true;
    return;
  }
  inflight = true;

  const core = fs.readFileSync(CORE, "utf8");
  const tasks = palettes().map((p) => {
    const concat = fs.readFileSync(p.file, "utf8") + core;
    const { css, min } = outNames(p.name);
    atomicWrite(css, concat);
    relink(css, path.join(OVERRIDE_DIR, path.basename(css)));

    return new Promise((resolve) => {
      // csso writes to tmp via -o; we rename atomically after success so the
      // final path gets a new inode in one step (Chrome auto-reload trigger).
      const tmp = `${min}.tmp`;
      const proc = spawn("npx", ["--yes", "csso-cli@4.0.1", "-o", tmp]);
      proc.stdin.write(concat);
      proc.stdin.end();
      let stderr = "";
      proc.stderr.on("data", (d) => (stderr += d));
      proc.on("exit", (code) => {
        if (code === 0) {
          fs.renameSync(tmp, min);
          relink(min, path.join(OVERRIDE_DIR, path.basename(min)));
          const sz = fs.statSync(min).size;
          resolve(`${p.name} (${concat.length}b → ${sz}b)`);
        } else {
          try {
            fs.unlinkSync(tmp);
          } catch {
            /* tmp may not exist */
          }
          resolve(`${p.name} FAILED: ${stderr.trim()}`);
        }
      });
    });
  });

  Promise.all(tasks).then((results) => {
    console.log(`[${ts()}] rebuilt: ${results.join(", ")}`);
    inflight = false;
    if (pending) {
      pending = false;
      setTimeout(rebuildAll, 50);
    }
  });
}

console.log(`watching: ${SRC_DIR}`);
console.log(
  `palettes: ${palettes()
    .map((p) => p.name)
    .join(", ")}`,
);
rebuildAll();

let timer;
fs.watch(SRC_DIR, { persistent: true }, (_, filename) => {
  if (filename === "_core.css" || /^_palette-.+\.css$/.test(filename)) {
    clearTimeout(timer);
    timer = setTimeout(rebuildAll, 100); // debounce atomic saves (rename: tmp → real)
  }
});

setInterval(() => {}, 1 << 30);
process.on("SIGINT", () => {
  console.log("\nwatcher: stopped");
  process.exit(0);
});
