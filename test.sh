#!/bin/bash

# Script para verificar el estado de la extensión

EXTENSION_NAME="immich-wallpaper@nokichan.github.io"

echo "🔍 Estado de la extensión Immich Wallpaper"
echo "=========================================="
echo ""

# Verificar si está instalada
if gnome-extensions list | grep -q "$EXTENSION_NAME"; then
    echo "✅ Extensión instalada"
else
    echo "❌ Extensión NO instalada"
    exit 1
fi

# Verificar si está habilitada
if gnome-extensions list --enabled | grep -q "$EXTENSION_NAME"; then
    echo "✅ Extensión habilitada"
else
    echo "⚠️  Extensión deshabilitada"
    echo "   Ejecuta: gnome-extensions enable $EXTENSION_NAME"
fi

echo ""
echo "📁 Ubicación de archivos:"
echo "   ~/.local/share/gnome-shell/extensions/$EXTENSION_NAME"
echo ""
echo "💾 Caché de fotos:"
echo "   ~/.cache/immich-wallpaper/"
if [ -d ~/.cache/immich-wallpaper/ ]; then
    PHOTO_COUNT=$(ls -1 ~/.cache/immich-wallpaper/*.jpg 2>/dev/null | wc -l)
    echo "   Fotos en caché: $PHOTO_COUNT"
else
    echo "   Sin fotos en caché aún"
fi

echo ""
echo "⚙️  Comandos útiles:"
echo "   • Abrir preferencias: gnome-extensions prefs $EXTENSION_NAME"
echo "   • Ver logs: journalctl -f -o cat /usr/bin/gnome-shell | grep -i immich"
echo "   • Deshabilitar: gnome-extensions disable $EXTENSION_NAME"
echo "   • Reinstalar: ./install.sh"
echo ""
