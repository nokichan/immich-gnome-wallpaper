#!/bin/bash

# Installation script for Immich Wallpaper Extension

EXTENSION_NAME="immich-wallpaper@nokichan.github.io"
EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_NAME"

echo "🚀 Installing Immich Wallpaper Extension..."

# Create extension directory
echo "📁 Creating extension directory..."
mkdir -p "$EXTENSION_DIR"

# Copy files
echo "📋 Copying files..."
cp extension.js "$EXTENSION_DIR/"
cp prefs.js "$EXTENSION_DIR/"
cp metadata.json "$EXTENSION_DIR/"
cp -r schemas "$EXTENSION_DIR/"
cp -r po "$EXTENSION_DIR/"

# Compile translations
echo "🌍 Compiling translations..."
mkdir -p "$EXTENSION_DIR/locale/es/LC_MESSAGES"
mkdir -p "$EXTENSION_DIR/locale/ca/LC_MESSAGES"
msgfmt po/es.po -o "$EXTENSION_DIR/locale/es/LC_MESSAGES/immich-wallpaper.mo"
msgfmt po/ca.po -o "$EXTENSION_DIR/locale/ca/LC_MESSAGES/immich-wallpaper.mo"

# Compile schemas
echo "🔨 Compiling schemas..."
cd "$EXTENSION_DIR/schemas" || exit
glib-compile-schemas .

echo "✅ Installation completed!"
echo ""
echo "⚙️  To complete the installation:"
echo "1. Restart GNOME Shell:"
echo "   - On Xorg: Press Alt+F2, type 'r' and press Enter"
echo "   - On Wayland: Log out and log back in"
echo ""
echo "2. Enable the extension:"
echo "   gnome-extensions enable $EXTENSION_NAME"
echo ""
echo "3. Configure the extension:"
echo "   gnome-extensions prefs $EXTENSION_NAME"
echo ""
echo "🎉 Enjoy your Immich wallpapers!"
