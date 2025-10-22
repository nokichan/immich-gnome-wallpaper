#!/bin/bash
# Script para forzar la recarga de la extensión

echo "🔄 Forzando recarga completa de la extensión..."

# Deshabilitar la extensión
echo "1. Deshabilitando extensión..."
gnome-extensions disable immich-wallpaper@oscar.extensions.gnome-shell

# Esperar un poco
sleep 2

# Eliminar el directorio compilado de GNOME Shell
echo "2. Limpiando caché de GNOME Shell..."
rm -rf ~/.cache/gnome-shell/extensions/*immich* 2>/dev/null

# Reinstalar
echo "3. Reinstalando..."
./install.sh > /dev/null 2>&1

# Esperar
sleep 2

# Habilitar de nuevo
echo "4. Habilitando extensión..."
gnome-extensions enable immich-wallpaper@oscar.extensions.gnome-shell

sleep 3

# Mostrar estado
echo ""
echo "📊 Estado actual:"
gnome-extensions info immich-wallpaper@oscar.extensions.gnome-shell | grep -E "Estado|State|Activado"

echo ""
echo "📝 Logs recientes:"
journalctl --user --since "10 seconds ago" | grep -i immich | tail -10

echo ""
echo "📁 Fotos en caché:"
ls -lh ~/.cache/immich-wallpaper/*.jpg 2>/dev/null | wc -l | xargs echo "Total:"

echo ""
echo "⚠️  Si sigue sin funcionar, necesitas:"
echo "   1. Cerrar sesión"
echo "   2. Volver a iniciar sesión"
echo "   3. La extensión se cargará con el código actualizado"
