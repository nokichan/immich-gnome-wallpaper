#!/bin/bash

# Script to create a distributable package for GNOME Extensions

EXTENSION_NAME="immich-wallpaper@nokichan.github.io"
BUILD_DIR="build"
PACKAGE_DIR="$BUILD_DIR/$EXTENSION_NAME"

echo "📦 Creating distributable package for GNOME Extensions..."

# Clean previous builds
rm -rf "$BUILD_DIR"
mkdir -p "$PACKAGE_DIR"

# Copy main files
echo "📋 Copying files..."
cp extension.js "$PACKAGE_DIR/"
cp prefs.js "$PACKAGE_DIR/"
cp metadata.json "$PACKAGE_DIR/"

# Copy schemas (without compiling - not needed for GNOME 45+)
echo "� Copying schemas..."
mkdir -p "$PACKAGE_DIR/schemas"
cp schemas/*.xml "$PACKAGE_DIR/schemas/"

# Compile translations
if [ -d "po" ]; then
    echo "🌍 Compiling translations..."
    mkdir -p "$PACKAGE_DIR/locale"
    for po_file in po/*.po; do
        if [ -f "$po_file" ]; then
            locale=$(basename "$po_file" .po)
            mkdir -p "$PACKAGE_DIR/locale/$locale/LC_MESSAGES"
            msgfmt "$po_file" -o "$PACKAGE_DIR/locale/$locale/LC_MESSAGES/immich-wallpaper.mo"
        fi
    done
fi

# Create zip package
cd "$BUILD_DIR" || exit
echo "🗜️  Creating zip archive..."
zip -r "$EXTENSION_NAME.zip" "$EXTENSION_NAME"

echo ""
echo "✅ Package created successfully!"
echo "📦 Package location: $BUILD_DIR/$EXTENSION_NAME.zip"
echo ""
echo "📤 To upload to GNOME Extensions:"
echo "   1. Go to https://extensions.gnome.org/upload/"
echo "   2. Upload the file: $BUILD_DIR/$EXTENSION_NAME.zip"
echo "   3. Fill in the required information"
echo ""
echo "🧪 To test locally before uploading:"
echo "   gnome-extensions install $BUILD_DIR/$EXTENSION_NAME.zip"
