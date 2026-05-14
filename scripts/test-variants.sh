#!/usr/bin/env bash
# Validation for palette variants and the shared core.
# Run locally before pushing, or via CI on every PR.
#
# Catches:
#   - drift between palettes (missing vars, extra vars, different selector count)
#   - palette literals leaking into _core.css (must be parameterized as vars)
#   - vars referenced in core but not declared in some palette (build would still
#     succeed but render falls back to UA defaults)
#   - palette files containing non-:root selectors (palette must be tokens only)
#   - any palette failing to minify

set -euo pipefail

CORE="src/_core.css"
CANONICAL="src/_palette-capyppuccin.css"
PALETTES=(src/_palette-*.css)
FAIL=0

err() { printf '  \033[31mFAIL\033[0m %s\n' "$1" >&2; FAIL=1; }
ok() { printf '  \033[32mOK\033[0m   %s\n' "$1"; }
section() { printf '\n\033[1m%s\033[0m\n' "$1"; }

section "1. structure"
[ -f "$CORE" ] || { err "missing $CORE"; exit 1; }
ok "found $CORE"
[ -f "$CANONICAL" ] || { err "missing $CANONICAL (canonical palette)"; exit 1; }
ok "found $CANONICAL (canonical)"
[ -f "${PALETTES[0]}" ] || { err "no _palette-*.css files matched"; exit 1; }
ok "found ${#PALETTES[@]} palette(s)"

# Strip C-style block comments (multi-line aware) and attribute selector
# contents (which legitimately contain hex/rgb to match base-injected inline
# styles). Anything that remains and looks like a color in a property value
# is a leak.
strip_for_lint() {
  perl -0777 -pe 's|/\*.*?\*/||gs; s|\[[^\]]*\]||g' "$1"
}

section "2. _core.css is palette-agnostic"
clean=$(strip_for_lint "$CORE")
if echo "$clean" | grep -qE '^\s*[a-z-]+:[^;{]*#[0-9a-fA-F]{3,6}\b'; then
  err "$CORE has hex literal in a property value (move to palette as var)"
  echo "$clean" | grep -nE '^\s*[a-z-]+:[^;{]*#[0-9a-fA-F]{3,6}\b' | head -5 >&2
else
  ok "no hex literals in property values"
fi
if echo "$clean" | grep -qE '^\s*[a-z-]+:[^;{]*rgba?\('; then
  err "$CORE has rgba/rgb literal in a property value (move to palette as var)"
  echo "$clean" | grep -nE '^\s*[a-z-]+:[^;{]*rgba?\(' | head -5 >&2
else
  ok "no rgba literals in property values"
fi

section "3. palette files contain only :root tokens"
for p in "${PALETTES[@]}"; do
  body=$(strip_for_lint "$p")
  # Count selector-opening braces; should be exactly 1 (the :root)
  brace_count=$(echo "$body" | grep -cE '^\s*[^/{}]+\{$' || true)
  if [ "$brace_count" -ne 1 ]; then
    err "$(basename "$p") has $brace_count top-level rule(s), expected 1 (:root only)"
  else
    ok "$(basename "$p") is a single :root block"
  fi
done

section "4. var set parity across palettes"
expected_vars=$(grep -oE '^\s*--[a-z0-9-]+\s*:' "$CANONICAL" | sed 's/[: ]//g' | sort -u)
for p in "${PALETTES[@]}"; do
  [ "$p" = "$CANONICAL" ] && continue
  actual_vars=$(grep -oE '^\s*--[a-z0-9-]+\s*:' "$p" | sed 's/[: ]//g' | sort -u)
  if missing=$(comm -23 <(echo "$expected_vars") <(echo "$actual_vars")) && [ -n "$missing" ]; then
    err "$(basename "$p") missing vars (declared in $(basename "$CANONICAL")):"
    echo "$missing" | sed 's/^/    /' >&2
  fi
  if extra=$(comm -13 <(echo "$expected_vars") <(echo "$actual_vars")) && [ -n "$extra" ]; then
    err "$(basename "$p") has extra vars not in $(basename "$CANONICAL"):"
    echo "$extra" | sed 's/^/    /' >&2
  fi
  if [ -z "${missing:-}" ] && [ -z "${extra:-}" ]; then
    ok "$(basename "$p") var set matches canonical"
  fi
done

section "5. every var referenced in core is declared in every palette"
core_refs=$(grep -oE 'var\(--[a-z0-9-]+' "$CORE" | sed 's/var(//' | sort -u)
for p in "${PALETTES[@]}"; do
  declared=$(grep -oE '^\s*--[a-z0-9-]+\s*:' "$p" | sed 's/[: ]//g' | sort -u)
  if missing=$(comm -23 <(echo "$core_refs") <(echo "$declared")) && [ -n "$missing" ]; then
    err "$(basename "$p") missing vars used in core:"
    echo "$missing" | sed 's/^/    /' >&2
  else
    ok "$(basename "$p") covers all core var refs"
  fi
done

section "6. each variant builds and selector count is stable"
ref_count=""
for p in "${PALETTES[@]}"; do
  variant=$(basename "$p" .css | sed 's/^_palette-//')
  out=/tmp/cap-test-${variant}.min.css
  if ! cat "$p" "$CORE" | npx --yes csso-cli@4.0.1 -o "$out" >/dev/null 2>&1; then
    err "$variant: csso minify failed"
    continue
  fi
  count=$(grep -oE '[^{}]+\{' "$out" | wc -l)
  if [ -z "$ref_count" ]; then
    ref_count=$count
    ok "$variant builds: $count selectors (reference)"
  elif [ "$count" -ne "$ref_count" ]; then
    err "$variant: $count selectors, expected $ref_count (selector count drift)"
  else
    ok "$variant builds: $count selectors"
  fi
done

echo
if [ $FAIL -eq 0 ]; then
  printf '\033[32mall tests passed\033[0m\n'
  exit 0
else
  printf '\033[31mtests failed\033[0m\n' >&2
  exit 1
fi
