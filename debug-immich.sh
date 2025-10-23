#!/bin/bash

# Debug script to test Immich API
# Useful to verify that endpoints work correctly

SERVER_URL="https://fotos.perkalnet.mooo.com"
EMAIL="oslopezaguilar@gmail.com"
PASSWORD="PalosEnCara"

echo "🔍 Testing Immich API..."
echo "Server: $SERVER_URL"
echo ""

# 1. Test authentication
echo "1️⃣  Testing authentication..."
AUTH_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "Response: $AUTH_RESPONSE"
TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Authentication error"
    exit 1
fi

echo "✅ Token obtained: ${TOKEN:0:20}..."
echo ""

# 2. Test getting random photos
echo "2️⃣  Testing random photos endpoint..."
RANDOM_RESPONSE=$(curl -s "$SERVER_URL/api/assets/random?count=10" \
    -H "Authorization: Bearer $TOKEN")

PHOTO_COUNT=$(echo "$RANDOM_RESPONSE" | jq '. | length')
echo "✅ Photos fetched: $PHOTO_COUNT"

if [ "$PHOTO_COUNT" -gt 0 ]; then
    FIRST_PHOTO_ID=$(echo "$RANDOM_RESPONSE" | jq -r '.[0].id')
    echo "   First photo ID: $FIRST_PHOTO_ID"
    echo ""
    
    # 3. Test downloading thumbnail
    echo "3️⃣  Testing thumbnail download..."
    THUMB_URL="$SERVER_URL/api/assets/$FIRST_PHOTO_ID/thumbnail?size=preview"
    echo "   URL: $THUMB_URL"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$THUMB_URL" \
        -H "Authorization: Bearer $TOKEN")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Thumbnail downloaded successfully (HTTP $HTTP_CODE)"
    else
        echo "❌ Error downloading thumbnail (HTTP $HTTP_CODE)"
    fi
fi

echo ""
echo "4️⃣  Testing albums endpoint..."
ALBUMS_RESPONSE=$(curl -s "$SERVER_URL/api/albums" \
    -H "Authorization: Bearer $TOKEN")

ALBUM_COUNT=$(echo "$ALBUMS_RESPONSE" | jq '. | length')
echo "✅ Albums fetched: $ALBUM_COUNT"

if [ "$ALBUM_COUNT" -gt 0 ]; then
    echo "   First 3 albums:"
    echo "$ALBUMS_RESPONSE" | jq -r '.[0:3] | .[] | "   - \(.albumName) (\(.assetCount) photos)"'
fi

echo ""
echo "✅ Tests completed"
