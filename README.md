# Immich Wallpaper - Extensión de GNOME Shell

Esta extensión de GNOME Shell te permite usar fotos de tu servidor Immich como fondo de pantalla en tu escritorio, cambiándolas automáticamente a intervalos configurables.

## Características

- 🖼️ **Fondos automáticos**: Cambia automáticamente el fondo de pantalla con fotos de tu servidor Immich
- 🎨 **Opciones de ajuste**: Elige cómo se ajusta la imagen (zoom, centrado, escalado, estirado, etc.)
- 📁 **Selección de álbum**: Usa fotos de un álbum específico o de todos tus álbumes
- 🔄 **Rotación aleatoria**: Las fotos se muestran en orden aleatorio
- ⏱️ **Intervalo configurable**: Define cada cuánto tiempo cambiar el fondo (mínimo 60 segundos)
- 🔐 **Autenticación segura**: Conexión segura con tu servidor Immich usando email y contraseña
- 💾 **Caché local**: Las fotos se almacenan en caché para mejorar el rendimiento

## Requisitos

- GNOME Shell 42 o superior
- Un servidor Immich configurado y accesible
- Credenciales de acceso a Immich (email y contraseña)

## Instalación

### Método 1: Instalación manual

1. Clona o descarga este repositorio
2. Copia la carpeta de la extensión al directorio de extensiones de GNOME:

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/immich-wallpaper@oscar.extensions.gnome-shell
cp -r * ~/.local/share/gnome-shell/extensions/immich-wallpaper@oscar.extensions.gnome-shell/
```

3. Compila el esquema de configuración:

```bash
cd ~/.local/share/gnome-shell/extensions/immich-wallpaper@oscar.extensions.gnome-shell/schemas
glib-compile-schemas .
```

4. Reinicia GNOME Shell:
   - En Xorg: Presiona `Alt+F2`, escribe `r` y presiona Enter
   - En Wayland: Cierra sesión y vuelve a iniciar

5. Habilita la extensión:

```bash
gnome-extensions enable immich-wallpaper@oscar.extensions.gnome-shell
```

O usa la aplicación **Extensiones** (Extensions) desde el menú de aplicaciones.

### Método 2: Usando el script de instalación

```bash
cd /home/oscar/Sync/Programacion/ShelllExtensions
./install.sh
```

## Configuración

1. Abre la aplicación **Extensiones** o ejecuta:

```bash
gnome-extensions prefs immich-wallpaper@oscar.extensions.gnome-shell
```

2. Configura los siguientes parámetros:

   - **Server URL**: La URL de tu servidor Immich (ej: `https://immich.example.com`)
     - ⚠️ **Importante**: No incluyas la barra final `/`
   - **Email**: Tu dirección de email para acceder a Immich
   - **Password**: Tu contraseña de Immich
   - **Change Interval**: Intervalo en segundos entre cambios de fondo (predeterminado: 1800 = 30 minutos, mínimo: 60)
   - **Picture Options**: Cómo ajustar la imagen al fondo
     - **Zoom**: Ampliar la imagen para llenar la pantalla (predeterminado)
     - **Centered**: Centrar la imagen sin redimensionar
     - **Scaled**: Escalar manteniendo proporciones
     - **Stretched**: Estirar para llenar toda la pantalla
     - **Spanned**: Expandir a través de múltiples monitores
     - **Wallpaper**: Modo mosaico
   - **Album ID**: ID del álbum específico a usar (vacío = todas las fotos)
     - Para obtener la lista de álbumes disponibles, ejecuta: `./list-albums.sh`
     - Copia el ID del álbum que quieras usar
     - Deja vacío para usar fotos aleatorias de todos tus álbumes

3. Guarda la configuración y la extensión comenzará a funcionar automáticamente.

### Verificar el estado

Puedes verificar el estado de la extensión ejecutando:

```bash
./test.sh
```

Este script te mostrará:
- Si la extensión está instalada y habilitada
- Cuántas fotos hay en caché
- Comandos útiles para gestionar la extensión

### Listar álbumes disponibles

Para ver todos tus álbumes de Immich y obtener sus IDs:

```bash
./list-albums.sh
```

Esto te mostrará una tabla con:
- ID del álbum (para copiar y pegar en la configuración)
- Nombre del álbum
- Cantidad de fotos en el álbum

## Uso

Una vez configurada, la extensión:

1. Se autentica con tu servidor Immich
2. Obtiene una lista de fotos disponibles
3. Descarga y establece una foto aleatoria como fondo de pantalla
4. Cambia el fondo automáticamente según el intervalo configurado

Las fotos se almacenan en caché en: `~/.cache/immich-wallpaper/`

## Solución de problemas

### La extensión no funciona

1. Verifica los logs de GNOME Shell:

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

2. Comprueba que la extensión esté habilitada:

```bash
gnome-extensions list --enabled | grep immich-wallpaper
```

### Error de autenticación

- Verifica que la URL del servidor sea correcta y esté accesible
- Comprueba que las credenciales (email y contraseña) sean correctas
- Asegúrate de que tu servidor Immich esté en funcionamiento

### No cambia el fondo

- Verifica la configuración del intervalo
- Comprueba que tengas fotos disponibles en tu servidor Immich
- Revisa los permisos de la carpeta de caché

## Desarrollo

### Estructura del proyecto

```
immich-wallpaper@oscar.extensions.gnome-shell/
├── extension.js          # Lógica principal de la extensión
├── prefs.js             # Interfaz de preferencias
├── metadata.json        # Metadatos de la extensión
├── schemas/
│   └── org.gnome.shell.extensions.immich-wallpaper.gschema.xml
├── install.sh           # Script de instalación
├── test.sh             # Script de verificación
└── README.md
```

### Realizar cambios y actualizar

Si realizas cambios en el código:

1. **Edita los archivos** en el directorio del proyecto
2. **Reinstala** la extensión:
   ```bash
   ./install.sh
   ```
3. **Recarga GNOME Shell**:
   - En Xorg: `Alt+F2` → escribe `r` → Enter
   - En Wayland: Cierra sesión y vuelve a iniciar
4. **Verifica** que no haya errores:
   ```bash
   ./test.sh
   ```

### Depuración

Para ver los logs en tiempo real:

```bash
journalctl -f -o cat /usr/bin/gnome-shell | grep -i immich
```

O para ver todos los logs de GNOME Shell:

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

## API de Immich utilizada

La extensión utiliza los siguientes endpoints de la API de Immich:

- `POST /api/auth/login` - Autenticación
- `GET /api/asset` - Obtener lista de fotos
- `GET /api/asset/thumbnail/{id}` - Descargar foto

## Licencia

GPL-2.0-or-later

## Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request en el repositorio.

## Créditos

- Desarrollado para GNOME Shell
- Integración con [Immich](https://immich.app/) - Self-hosted photo and video backup solution

## Changelog

### Versión 1.0 (22 de octubre de 2025)
- ✅ Versión inicial con sintaxis moderna de GNOME Shell (ES6 modules)
- ✅ Autenticación con servidor Immich usando API REST
- ✅ Cambio automático de fondos de pantalla
- ✅ Interfaz de configuración moderna usando Adwaita (Adw)
- ✅ Caché local de fotos
- ✅ Compatible con GNOME Shell 42-49
- ✅ Soporte para Xorg y Wayland

### Cambios técnicos
- Migración de `imports.gi` a `import from 'gi://'`
- Uso de `ExtensionPreferences` en lugar de funciones globales
- Reemplazo de `log()` por `console.log()`
- Implementación de `fillPreferencesWindow()` para configuración moderna
