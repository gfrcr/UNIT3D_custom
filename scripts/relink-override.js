#!/usr/bin/env node
/*
 * Watcher: maintains the Chrome Local Overrides hardlink for capyppuccin.css.
 *
 * When VSCode/prettier/atomic-save replaces the real file (new inode), this
 * recreates the hardlink at the override path so Chrome keeps seeing live
 * edits without a refresh of the DevTools workspace.
 *
 * Usage:
 *   node scripts/relink-override.js          # run in background
 *   # or with auto-restart on crash:
 *   while true; do node scripts/relink-override.js; sleep 1; done
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REAL = path.join(ROOT, "capyppuccin.css");
const OVERRIDE = path.join(
  ROOT,
  "gfrcr.github.io/UNIT3D_custom/capyppuccin.css",
);

function ts() {
  return new Date().toISOString().slice(11, 19);
}

function relink() {
  let realStat;
  try {
    realStat = fs.statSync(REAL);
  } catch (e) {
    console.error(`[${ts()}] real file missing: ${REAL}`);
    return;
  }

  let overrideInode = null;
  try {
    overrideInode = fs.statSync(OVERRIDE).ino;
  } catch {
    /* override file doesn't exist — will create */
  }

  if (realStat.ino === overrideInode) return; // already linked

  try {
    if (overrideInode !== null) fs.unlinkSync(OVERRIDE);
    fs.mkdirSync(path.dirname(OVERRIDE), { recursive: true });
    fs.linkSync(REAL, OVERRIDE);
    console.log(
      `[${ts()}] re-linked (inode=${realStat.ino}, size=${realStat.size})`,
    );
  } catch (e) {
    console.error(`[${ts()}] relink failed: ${e.message}`);
  }
}

console.log(`watcher: ${REAL}`);
console.log(`override: ${OVERRIDE}`);
relink(); // ensure linked at startup

// fs.watch on parent dir — captures rename(tmp → real) which atomic saves do
fs.watch(ROOT, { persistent: true }, (event, filename) => {
  if (filename === "capyppuccin.css") {
    // Debounce: file is sometimes momentarily missing during rename
    setTimeout(relink, 50);
  }
});

// Keep alive (process won't exit on its own with fs.watch active, but be safe)
setInterval(() => {}, 1 << 30);

process.on("SIGINT", () => {
  console.log("\nwatcher: stopped");
  process.exit(0);
});
