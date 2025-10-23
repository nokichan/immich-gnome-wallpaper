# Immich Wallpaper v1.0 - Initial Release

A GNOME Shell extension that automatically sets your desktop wallpaper using photos from your Immich server.

## ✨ Features

- 🖼️ **Automatic wallpaper rotation** from your Immich server
- 🎨 **Picture display options**: zoom, centered, scaled, stretched, spanned, wallpaper
- 📁 **Album selection**: Choose specific albums or use all photos
- 🔄 **Random rotation**: Photos are displayed in random order
- ⏱️ **Configurable interval**: Set rotation from 60 seconds to 24 hours
- 🔐 **Secure authentication**: Uses Bearer token authentication
- 💾 **Local caching**: Photos are cached for better performance
- 🌍 **Multilingual**: English, Spanish, and Catalan

## 📋 Requirements

- GNOME Shell 45 or higher
- An Immich server (self-hosted photo management)
- Immich credentials (email and password)

## 📦 Installation

### From Release

1. Download `immich-wallpaper@nokichan.github.io.zip` from this release
2. Install the extension:
   ```bash
   gnome-extensions install immich-wallpaper@nokichan.github.io.zip
   ```
3. Restart GNOME Shell (Log out/in on Wayland, or Alt+F2 → r on Xorg)
4. Enable the extension

### Configuration

1. Open **Extensions** application or run:
   ```bash
   gnome-extensions prefs immich-wallpaper@nokichan.github.io
   ```
2. Enter your Immich server URL, email, and password
3. Configure your preferences (interval, picture options, album selection)

## 🔗 Links

- **Repository**: https://github.com/nokichan/immich-gnome-wallpaper
- **Immich Project**: https://immich.app/
- **Report Issues**: https://github.com/nokichan/immich-gnome-wallpaper/issues

## 📝 Technical Details

- Modern ES6 modules syntax
- Compatible with GNOME Shell 45-49
- Support for Xorg and Wayland
- Uses Immich REST API with Bearer token authentication
- Callback-based async operations for better stability

## 🙏 Credits

- Integration with [Immich](https://immich.app/) - Self-hosted photo and video backup solution
- Built for the GNOME community

## 📄 License

GPL-3.0-or-later
