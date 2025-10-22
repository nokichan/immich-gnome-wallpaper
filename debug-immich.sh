#!/bin/bash

# Script para depurar la conexión a Immich

echo "🔍 Depurador de API de Immich"
echo "=============================="
echo ""

# Pedir credenciales
read -p "URL del servidor Immich (ej: https://immich.example.com): " SERVER_URL
read -p "Email: " EMAIL
read -sp "Password: " PASSWORD
echo ""
echo ""

# Remover barra final
SERVER_URL="${SERVER_URL%/}"

echo "1️⃣  Autenticando..."
AUTH_RESPONSE=$(curl -s -X POST "${SERVER_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.accessToken')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Error de autenticación"
    echo "Respuesta: $AUTH_RESPONSE"
    exit 1
fi

echo "✅ Autenticación exitosa"
echo "Token: ${ACCESS_TOKEN:0:20}..."
echo ""

# Probar diferentes endpoints
echo "2️⃣  Probando endpoints de la API..."
echo ""

endpoints=(
    "GET|/api/assets|Todos los assets"
    "GET|/api/asset|Assets (viejo endpoint)"
    "GET|/api/assets/random?count=10|Assets aleatorios"
    "POST|/api/search/smart|Búsqueda inteligente"
    "POST|/api/search/metadata|Búsqueda por metadata"
)

for endpoint_info in "${endpoints[@]}"; do
    IFS='|' read -r method path description <<< "$endpoint_info"
    echo "Probando: $description"
    echo "  Endpoint: $method $path"
    
    if [ "$method" == "GET" ]; then
        RESPONSE=$(curl -s -w "\nSTATUS_CODE:%{http_code}" \
          -H "Authorization: Bearer ${ACCESS_TOKEN}" \
          "${SERVER_URL}${path}")
    else
        RESPONSE=$(curl -s -w "\nSTATUS_CODE:%{http_code}" -X POST \
          -H "Authorization: Bearer ${ACCESS_TOKEN}" \
          -H "Content-Type: application/json" \
          -d '{"type":"IMAGE","size":10}' \
          "${SERVER_URL}${path}")
    fi
    
    STATUS=$(echo "$RESPONSE" | grep "STATUS_CODE:" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/STATUS_CODE:/d')
    
    echo "  Status: $STATUS"
    
    if [ "$STATUS" == "200" ]; then
        echo "  ✅ FUNCIONA"
        COUNT=$(echo "$BODY" | jq '. | if type=="array" then length elif .assets then (.assets | if type=="array" then length else .items | length end) elif .items then (.items | length) else 0 end' 2>/dev/null || echo "?")
        echo "  Elementos encontrados: $COUNT"
        echo "  Muestra de respuesta: $(echo "$BODY" | jq '.' 2>/dev/null | head -10)"
    else
        echo "  ❌ Error"
        echo "  Respuesta: $(echo "$BODY" | head -3)"
    fi
    echo ""
done

echo "3️⃣  Probando descarga de thumbnail..."
# Primero obtener un ID de asset usando search/metadata
SEARCH_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"type":"IMAGE","size":1}' \
  "${SERVER_URL}/api/search/metadata")

ASSET_ID=$(echo "$SEARCH_RESPONSE" | jq -r '.assets.items[0].id // .items[0].id // .[0].id // empty' 2>/dev/null)

if [ "$ASSET_ID" != "null" ] && [ -n "$ASSET_ID" ]; then
    echo "  ID de asset de prueba: $ASSET_ID"
    
    thumb_endpoints=(
        "/api/asset/thumbnail/${ASSET_ID}"
        "/api/assets/${ASSET_ID}/thumbnail"
        "/api/asset/thumbnail/${ASSET_ID}?format=JPEG"
        "/api/assets/${ASSET_ID}/thumbnail?size=preview"
    )
    
    for thumb_path in "${thumb_endpoints[@]}"; do
        echo "  Probando: $thumb_path"
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
          -H "Authorization: Bearer ${ACCESS_TOKEN}" \
          "${SERVER_URL}${thumb_path}")
        if [ "$STATUS" == "200" ]; then
            echo "    ✅ FUNCIONA (Status: $STATUS)"
        else
            echo "    ❌ Error (Status: $STATUS)"
        fi
    done
else
    echo "  ⚠️  No se pudo obtener un asset para probar"
fi

echo ""
echo "✅ Depuración completada"
