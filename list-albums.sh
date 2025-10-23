#!/bin/bash

# Script to get the list of Immich albums

echo "�� Getting Immich album list"
echo "=========================================="
echo ""

# Read configuration
SERVER_URL=$(dconf read /org/gnome/shell/extensions/immich-wallpaper/server-url | tr -d "'")
EMAIL=$(dconf read /org/gnome/shell/extensions/immich-wallpaper/email | tr -d "'")
PASSWORD=$(dconf read /org/gnome/shell/extensions/immich-wallpaper/password | tr -d "'")

if [ -z "$SERVER_URL" ] || [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
    echo "❌ Error: Configuration not found"
    echo "Please configure the extension first from preferences"
    exit 1
fi

# Remove trailing slash
SERVER_URL="${SERVER_URL%/}"

echo "🔐 Authenticating with ${SERVER_URL}..."
AUTH_RESPONSE=$(curl -s -X POST "${SERVER_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.accessToken')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Authentication error"
    exit 1
fi

echo "✅ Successfully authenticated"
echo ""

# Get album list
echo "📋 Fetching albums..."
ALBUMS=$(curl -s -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "${SERVER_URL}/api/albums")

if [ -z "$ALBUMS" ] || [ "$ALBUMS" == "null" ]; then
    echo "❌ Could not fetch albums"
    exit 1
fi

# Display albums in table format
echo ""
echo "ALBUM ID                              | NAME                      | PHOTOS"
echo "--------------------------------------|---------------------------|-------"

echo "$ALBUMS" | jq -r '.[] | "\(.id) | \(.albumName) | \(.assetCount)"' | while IFS='|' read -r id name count; do
    printf "%-37s | %-25s | %s\n" "$id" "$name" "$count"
done

echo ""
echo "📝 To use a specific album:"
echo "   1. Copy the ID of the album you want to use"
echo "   2. Open preferences: gnome-extensions prefs immich-wallpaper@nokichan.github.io"
echo "   3. Select the album from the dropdown"
echo "   4. Or select 'All Photos' to use all photos"
