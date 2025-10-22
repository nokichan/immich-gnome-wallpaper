# Configuración de Ejemplo

Para probar la extensión, configura estos valores en las preferencias:

## Servidor Immich
- **URL del servidor**: `https://demo.immich.app` (o tu servidor)
- **Email**: tu_email@example.com
- **Contraseña**: tu_contraseña
- **Intervalo de cambio**: 300 (5 minutos para pruebas rápidas)

## Notas importantes

1. **Autenticación**: La extensión usa la API de Immich para autenticarse. Asegúrate de que tu servidor esté accesible.

2. **API Endpoints usados**:
   - `POST /api/auth/login` - Autenticación
   - `GET /api/asset?take=100` - Obtener lista de fotos (máximo 100)
   - `GET /api/asset/thumbnail/{id}?format=JPEG` - Descargar miniatura

3. **Caché**: Las fotos se almacenan en `~/.cache/immich-wallpaper/` para evitar descargas repetidas.

4. **Logs**: Para ver los logs de la extensión en tiempo real:
   ```bash
   journalctl -f -o cat /usr/bin/gnome-shell | grep -i immich
   ```

5. **Compatibilidad**: Esta extensión ha sido actualizada para GNOME Shell 45+ usando ES6 modules.

## Solución de problemas comunes

### La extensión no se habilita
```bash
# Reinstalar la extensión
./install.sh

# Verificar errores
journalctl -f -o cat /usr/bin/gnome-shell
```

### No cambia el fondo
- Verifica que hayas configurado correctamente el servidor, email y contraseña
- Revisa los logs para ver si hay errores de autenticación
- Asegúrate de tener fotos en tu servidor Immich

### Errores de autenticación
- Verifica que la URL del servidor sea correcta (sin barra final)
- Comprueba que las credenciales sean válidas
- Asegúrate de que el servidor Immich esté accesible desde tu red
