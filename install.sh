#!/bin/bash

# Script de instalación para Immich Wallpaper Extension

EXTENSION_NAME="immich-wallpaper@oscar.extensions.gnome-shell"
EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_NAME"

echo "🚀 Instalando Immich Wallpaper Extension..."

# Crear directorio de la extensión
echo "📁 Creando directorio de extensión..."
mkdir -p "$EXTENSION_DIR"

# Copiar archivos
echo "📋 Copiando archivos..."
cp extension.js "$EXTENSION_DIR/"
cp prefs.js "$EXTENSION_DIR/"
cp metadata.json "$EXTENSION_DIR/"
cp -r schemas "$EXTENSION_DIR/"

# Compilar esquemas
echo "🔨 Compilando esquemas..."
cd "$EXTENSION_DIR/schemas" || exit
glib-compile-schemas .

echo "✅ Instalación completada!"
echo ""
echo "⚙️  Para completar la instalación:"
echo "1. Reinicia GNOME Shell:"
echo "   - En Xorg: Presiona Alt+F2, escribe 'r' y presiona Enter"
echo "   - En Wayland: Cierra sesión y vuelve a iniciar"
echo ""
echo "2. Habilita la extensión:"
echo "   gnome-extensions enable $EXTENSION_NAME"
echo ""
echo "3. Configura la extensión:"
echo "   gnome-extensions prefs $EXTENSION_NAME"
echo ""
echo "🎉 ¡Disfruta de tus fondos de Immich!"
