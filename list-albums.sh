#!/bin/bash

# Script para obtener la lista de álbumes de Immich

echo "📸 Obteniendo lista de álbumes de Immich"
echo "=========================================="
echo ""

# Leer configuración
SERVER_URL=$(dconf read /org/gnome/shell/extensions/immich-wallpaper/server-url | tr -d "'")
EMAIL=$(dconf read /org/gnome/shell/extensions/immich-wallpaper/email | tr -d "'")
PASSWORD=$(dconf read /org/gnome/shell/extensions/immich-wallpaper/password | tr -d "'")

if [ -z "$SERVER_URL" ] || [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
    echo "❌ Error: Configuración no encontrada"
    echo "Por favor, configura la extensión primero desde las preferencias"
    exit 1
fi

# Remover barra final
SERVER_URL="${SERVER_URL%/}"

echo "🔐 Autenticando con ${SERVER_URL}..."
AUTH_RESPONSE=$(curl -s -X POST "${SERVER_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.accessToken')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Error de autenticación"
    exit 1
fi

echo "✅ Autenticado correctamente"
echo ""

# Obtener lista de álbumes
echo "📋 Obteniendo álbumes..."
ALBUMS=$(curl -s -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "${SERVER_URL}/api/albums")

if [ -z "$ALBUMS" ] || [ "$ALBUMS" == "null" ]; then
    echo "❌ No se pudieron obtener los álbumes"
    exit 1
fi

# Mostrar álbumes en formato tabla
echo ""
echo "ID DEL ÁLBUM                          | NOMBRE                    | FOTOS"
echo "--------------------------------------|---------------------------|-------"

echo "$ALBUMS" | jq -r '.[] | "\(.id) | \(.albumName) | \(.assetCount)"' | while IFS='|' read -r id name count; do
    printf "%-37s | %-25s | %s\n" "$id" "$name" "$count"
done

echo ""
echo "📝 Para usar un álbum específico:"
echo "   1. Copia el ID del álbum que quieras usar"
echo "   2. Abre las preferencias: gnome-extensions prefs immich-wallpaper@oscar.extensions.gnome-shell"
echo "   3. Pega el ID en el campo 'Album ID'"
echo "   4. Deja el campo vacío para usar todas las fotos"
