#!/bin/bash
# Script to force reload the extension

echo "🔄 Forcing complete extension reload..."

# Disable extension
echo "Disabling extension..."
gnome-extensions disable immich-wallpaper@nokichan.github.io

# Wait a bit
sleep 2

# Clear GNOME Shell compiled directory
echo "2. Cleaning GNOME Shell cache..."
rm -rf ~/.cache/gnome-shell/extensions/*immich* 2>/dev/null

# Reinstall
echo "3. Reinstalling..."
./install.sh > /dev/null 2>&1

# Wait
sleep 2

# Enable extension
echo "Enabling extension..."
gnome-extensions enable immich-wallpaper@nokichan.github.io

sleep 3

# Show status
echo ""
echo "📊 Current status:"
gnome-extensions info immich-wallpaper@nokichan.github.io | grep -E "Estado|State|Enabled"

echo ""
echo "📝 Recent logs:"
journalctl --user --since "10 seconds ago" | grep -i immich | tail -10

echo ""
echo "📁 Cached photos:"
ls -lh ~/.cache/immich-wallpaper/*.jpg 2>/dev/null | wc -l | xargs echo "Total:"

echo ""
echo "⚠️  If it still doesn't work, you need to:"
echo "   1. Log out"
echo "   2. Log back in"
echo "   3. The extension will load with updated code"
