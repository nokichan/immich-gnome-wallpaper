#!/bin/bash

# Script to verify extension status

EXTENSION_NAME="immich-wallpaper@nokichan.github.io"

echo "🔍 Immich Wallpaper Extension Status"
echo "=========================================="
echo ""

# Check if installed
if gnome-extensions list | grep -q "$EXTENSION_NAME"; then
    echo "✅ Extension installed"
else
    echo "❌ Extension NOT installed"
    exit 1
fi

# Check if enabled
if gnome-extensions list --enabled | grep -q "$EXTENSION_NAME"; then
    echo "✅ Extension enabled"
else
    echo "⚠️  Extension disabled"
    echo "   Run: gnome-extensions enable $EXTENSION_NAME"
fi

echo ""
echo "📁 File location:"
echo "   ~/.local/share/gnome-shell/extensions/$EXTENSION_NAME"
echo ""
echo "💾 Photo cache:"
echo "   ~/.cache/immich-wallpaper/"
if [ -d ~/.cache/immich-wallpaper/ ]; then
    PHOTO_COUNT=$(ls -1 ~/.cache/immich-wallpaper/*.jpg 2>/dev/null | wc -l)
    echo "   Cached photos: $PHOTO_COUNT"
else
    echo "   No photos cached yet"
fi

echo ""
echo "⚙️  Useful commands:"
echo "   • Open preferences: gnome-extensions prefs $EXTENSION_NAME"
echo "   • View logs: journalctl -f -o cat /usr/bin/gnome-shell | grep -i immich"
echo "   • Disable: gnome-extensions disable $EXTENSION_NAME"
echo "   • Reinstall: ./install.sh"
echo ""
