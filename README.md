# Immich Wallpaper - GNOME Shell Extension

A GNOME Shell extension that automatically sets your desktop wallpaper using photos from your Immich server, with configurable rotation intervals.

## Features

- 🖼️ **Automatic wallpapers**: Automatically changes your desktop wallpaper with photos from your Immich server
- 🎨 **Picture adjustment options**: Choose how images are displayed (zoom, centered, scaled, stretched, etc.)
- 📁 **Album selection**: Use photos from a specific album or all your albums
- 🔄 **Random rotation**: Photos are displayed in random order
- ⏱️ **Configurable interval**: Set how often to change the wallpaper (minimum 60 seconds)
- 🔐 **Secure authentication**: Secure connection to your Immich server using email and password
- 💾 **Local cache**: Photos are cached locally for better performance
- 🌍 **Multilingual**: Supports English, Spanish, and Catalan

## Requirements

- GNOME Shell 45 or higher
- A configured and accessible Immich server
- Immich access credentials (email and password)

## Installation

### Method 1: From GNOME Extensions Website

Visit [extensions.gnome.org](https://extensions.gnome.org/) and search for "Immich Wallpaper" to install with one click.

### Method 2: Manual Installation

1. Clone or download this repository
2. Copy the extension folder to GNOME's extensions directory:

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/immich-wallpaper@nokichan.github.io
cp -r * ~/.local/share/gnome-shell/extensions/immich-wallpaper@nokichan.github.io/
```

3. Compile the configuration schema:

```bash
cd ~/.local/share/gnome-shell/extensions/immich-wallpaper@nokichan.github.io/schemas
glib-compile-schemas .
```

4. Restart GNOME Shell:
   - On Xorg: Press `Alt+F2`, type `r` and press Enter
   - On Wayland: Log out and log back in

5. Enable the extension:

```bash
gnome-extensions enable immich-wallpaper@nokichan.github.io
```

Or use the **Extensions** application from the application menu.

### Method 3: Using the Installation Script

```bash
./install.sh
```

## Configuration

1. Open the **Extensions** application or run:

```bash
gnome-extensions prefs immich-wallpaper@nokichan.github.io
```

2. Configure the following parameters:

   - **Server URL**: Your Immich server URL (e.g., `https://immich.example.com`)
     - ⚠️ **Important**: Don't include the trailing slash `/`
   - **Email**: Your Immich login email
   - **Password**: Your Immich password
   - **Change Interval**: Interval in seconds between wallpaper changes (default: 1800 = 30 minutes, minimum: 60)
   - **Picture Options**: How to adjust the image to the background
     - **Zoom**: Zoom the image to fill the screen (default)
     - **Centered**: Center the image without resizing
     - **Scaled**: Scale while maintaining aspect ratio
     - **Stretched**: Stretch to fill the entire screen
     - **Spanned**: Span across multiple monitors
     - **Wallpaper**: Tile mode
   - **Select Album**: Choose a specific album from the dropdown or use "All Photos"
     - The extension will automatically load your available albums
     - Select "All Photos (no filter)" to use random photos from all albums
     - Select any specific album to only use photos from that album

3. Save the configuration and the extension will start working automatically.

## Usage

Once configured, the extension will:

1. Authenticate with your Immich server
2. Fetch a list of available photos
3. Download and set a random photo as your wallpaper
4. Automatically change the wallpaper according to the configured interval

Photos are cached in: `~/.cache/immich-wallpaper/`

## Troubleshooting

### The extension doesn't work

1. Check GNOME Shell logs:

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

2. Verify the extension is enabled:

```bash
gnome-extensions list --enabled | grep immich-wallpaper
```

### Authentication error

- Verify that the server URL is correct and accessible
- Check that the credentials (email and password) are correct
- Make sure your Immich server is running

### Wallpaper doesn't change

- Check the interval configuration
- Verify you have photos available on your Immich server
- Check cache folder permissions

## Development

### Project Structure

```
immich-wallpaper@nokichan.github.io/
├── extension.js          # Main extension logic
├── prefs.js             # Preferences interface
├── metadata.json        # Extension metadata
├── schemas/
│   └── org.gnome.shell.extensions.immich-wallpaper.gschema.xml
├── po/                  # Translations
│   ├── es.po           # Spanish
│   ├── ca.po           # Catalan
│   ├── LINGUAS
│   └── POTFILES
└── README.md
```

### Making Changes and Updating

If you make changes to the code:

1. **Edit the files** in the project directory
2. **Reinstall** the extension:
   ```bash
   ./install.sh
   ```
3. **Reload GNOME Shell**:
   - On Xorg: `Alt+F2` → type `r` → Enter
   - On Wayland: Log out and log back in

### Debugging

To see logs in real-time:

```bash
journalctl -f -o cat /usr/bin/gnome-shell | grep -i immich
```

Or to see all GNOME Shell logs:

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

## Immich API Used

The extension uses the following Immich API endpoints:

- `POST /api/auth/login` - Authentication
- `GET /api/assets/random` - Get random photos list
- `GET /api/albums` - Get user's albums
- `GET /api/albums/{id}` - Get photos from specific album
- `GET /api/assets/{id}/thumbnail` - Download photo

## License

GPL-2.0-or-later

## Contributing

Contributions are welcome. Please open an issue or pull request on the repository.

## Credits

- Developed for GNOME Shell
- Integration with [Immich](https://immich.app/) - Self-hosted photo and video backup solution

## Changelog

### Version 1.0 (October 23, 2025)
- ✅ Initial release with modern GNOME Shell syntax (ES6 modules)
- ✅ Authentication with Immich server using REST API
- ✅ Automatic wallpaper rotation
- ✅ Modern configuration interface using Adwaita (Adw)
- ✅ Album selection dropdown with automatic loading
- ✅ Picture adjustment options (zoom, centered, scaled, etc.)
- ✅ Local photo caching
- ✅ Compatible with GNOME Shell 45-49
- ✅ Support for Xorg and Wayland
- ✅ Multilingual support (English, Spanish, Catalan)

### Technical Changes
- Migration from `imports.gi` to `import from 'gi://'`
- Use of `ExtensionPreferences` instead of global functions
- Replacement of `log()` with `console.log()`
- Implementation of `fillPreferencesWindow()` for modern configuration
- Callback-based async operations for better compatibility
