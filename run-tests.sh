#!/bin/bash
#
# Test suite for the Immich Wallpaper GNOME Shell extension.
#
# Runs:
#   1. JavaScript syntax checks (node --check)
#   2. metadata.json / gschema validation (tests/validate-metadata.py)
#   3. Shell script syntax checks (bash -n)
#   4. GSettings schema compilation (glib-compile-schemas --strict)
#   5. Translation checks (msgfmt)
#   6. Static analysis with shexli on the packaged zip (optional)
#   7. GTK regression tests in tests/ (gjs, uses xvfb-run when needed)
#
# Missing optional tools are reported as "skip", never as failures.
#
# SPDX-License-Identifier: GPL-2.0-or-later

set -u

cd "$(dirname "$0")" || exit 1

PASS=0
FAIL=0
SKIP=0

ok()   { echo "ok - $1"; PASS=$((PASS + 1)); }
fail() { echo "not ok - $1"; FAIL=$((FAIL + 1)); }
skip() { echo "skip - $1"; SKIP=$((SKIP + 1)); }

JS_FILES=(extension.js prefs.js albumSelection.js)

# ---------------------------------------------------------------- JS syntax
if command -v node >/dev/null 2>&1; then
    tmpdir=$(mktemp -d)
    trap 'rm -rf "$tmpdir"' EXIT

    for file in "${JS_FILES[@]}"; do
        cp "$file" "$tmpdir/${file%.js}.mjs"
        if node --check "$tmpdir/${file%.js}.mjs" >/dev/null 2>&1; then
            ok "syntax: $file"
        else
            fail "syntax: $file"
        fi
    done
else
    skip "JS syntax checks (node not installed)"
fi

# ------------------------------------------------------- metadata + schemas
if command -v python3 >/dev/null 2>&1; then
    if python3 tests/validate-metadata.py; then
        PASS=$((PASS + 1))
    else
        FAIL=$((FAIL + 1))
    fi
else
    skip "metadata validation (python3 not installed)"
fi

# ------------------------------------------------------------ shell scripts
for file in run-tests.sh install.sh package.sh reload.sh test.sh \
            debug-immich.sh list-albums.sh; do
    if [ -f "$file" ]; then
        if bash -n "$file" 2>/dev/null; then
            ok "shell syntax: $file"
        else
            fail "shell syntax: $file"
        fi
    fi
done

# ------------------------------------------------------------ GSettings schema
if command -v glib-compile-schemas >/dev/null 2>&1; then
    if glib-compile-schemas --strict --dry-run schemas/ >/dev/null 2>&1; then
        ok "gschema compiles"
    else
        fail "gschema compiles"
    fi
else
    skip "gschema compilation (glib-compile-schemas not installed)"
fi

# ---------------------------------------------------------------- translations
if command -v msgfmt >/dev/null 2>&1; then
    for po in po/*.po; do
        if msgfmt --check -o /dev/null "$po" 2>/dev/null; then
            ok "translation: $po"
        else
            fail "translation: $po"
        fi
    done
else
    skip "translation checks (msgfmt not installed)"
fi

# ------------------------------------------------------------------- shexli
# Static analysis against the EGO review guidelines. The package layout is
# what extensions.gnome.org receives, so only build the zip and check that.
# shexli always exits 0 (even with findings), so the JSON report is parsed
# by tests/check-shexli.py instead of trusting the exit code.
# Install with: pip install shexli==0.2.1 tree-sitter==0.25.0
# (tree-sitter 0.26 makes shexli crash with a segmentation fault)
if command -v shexli >/dev/null 2>&1 && command -v python3 >/dev/null 2>&1; then
    if ./package.sh >/dev/null 2>&1; then
        report=$(mktemp)
        shexli --format json build/immich-wallpaper@nokichan.github.io.zip > "$report" 2>/dev/null
        if python3 tests/check-shexli.py "$report"; then
            ok "shexli static analysis"
        else
            fail "shexli static analysis"
            shexli --format text build/immich-wallpaper@nokichan.github.io.zip || true
        fi
        rm -f "$report"
    else
        fail "package.sh (needed for shexli)"
    fi
else
    skip "shexli static analysis (shexli or python3 not installed)"
fi

# -------------------------------------------------------------- GTK tests
GJS_TEST=(gjs -m tests/test-album-selection.js)

if ! command -v gjs >/dev/null 2>&1; then
    skip "GTK regression tests (gjs not installed)"
elif command -v xvfb-run >/dev/null 2>&1; then
    if xvfb-run -a "${GJS_TEST[@]}"; then
        PASS=$((PASS + 1))
    else
        FAIL=$((FAIL + 1))
    fi
elif [ -n "${WAYLAND_DISPLAY:-}${DISPLAY:-}" ]; then
    if "${GJS_TEST[@]}"; then
        PASS=$((PASS + 1))
    else
        FAIL=$((FAIL + 1))
    fi
else
    skip "GTK regression tests (no display and xvfb-run not installed)"
fi

# ------------------------------------------------------------------ summary
echo
echo "passed: $PASS, failed: $FAIL, skipped: $SKIP"

if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
exit 0
