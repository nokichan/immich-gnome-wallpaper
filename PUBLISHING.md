# Publishing to GNOME Extensions - Checklist

## ✅ What's Ready

### Core Features Implemented
- ✅ Automatic wallpaper rotation from Immich server
- ✅ Secure authentication with email/password
- ✅ Album selection with dropdown (loads albums dynamically)
- ✅ Multiple picture display options (zoom, centered, scaled, stretched, spanned, wallpaper)
- ✅ Configurable interval (60 seconds to 24 hours)
- ✅ Local photo caching
- ✅ Modern Adwaita UI for preferences

### Internationalization (i18n)
- ✅ English (default)
- ✅ Spanish (es)
- ✅ Catalan (ca)
- ✅ All UI strings are translatable
- ✅ Translation files compiled automatically

### Documentation
- ✅ README.md in English
- ✅ Detailed installation instructions
- ✅ Configuration guide
- ✅ Troubleshooting section

### Scripts
- ✅ `install.sh` - Installs extension locally (development only)
- ✅ `package.sh` - Creates distributable .zip for GNOME Extensions

### Compatibility
- ✅ GNOME Shell 45-49
- ✅ Xorg and Wayland support
- ✅ Modern ES6 modules syntax

## 📋 Before Publishing

### 1. Update metadata.json
Check and update these fields:
- [ ] `version` - Set to 1
- [ ] `url` - Update with your GitHub repository URL
- [ ] `description` - Verify it's clear and concise

### 2. Test the Extension Thoroughly
```bash
# Install locally
./install.sh

# Log out and back in (Wayland) or restart GNOME Shell (Xorg)

# Test all features:
# - Authentication with Immich
# - Album dropdown loads correctly
# - Wallpaper changes work
# - All picture options work
# - Interval changes work
# - Test in different languages (change system language)
```

### 3. Create the Distribution Package
```bash
./package.sh
```

This will create: `build/immich-wallpaper@nokichan.github.io.zip`

### 4. Test the Package
```bash
# Install from the zip to test
gnome-extensions install build/immich-wallpaper@nokichan.github.io.zip --force

# Log out/in and test again
```

## 📤 Publishing Steps

### Option A: Publish on GNOME Extensions (extensions.gnome.org)

1. **Create an account** at https://extensions.gnome.org if you don't have one

2. **Go to upload page**: https://extensions.gnome.org/upload/

3. **Upload the zip file**: `build/immich-wallpaper@nokichan.github.io.zip`

4. **Fill in the information**:
   - Name: Immich Wallpaper
   - Description: Set desktop wallpaper from your Immich server photos with automatic rotation
   - URL: Your GitHub repository
   - License: GPL-2.0-or-later
   - Screenshots: Take screenshots of:
     - Extension in action (desktop with a nice photo)
     - Preferences window showing connection settings
     - Preferences window showing album dropdown
     - Preferences window showing picture options

5. **Submit for review**
   - The GNOME Extensions team will review your submission
   - They may request changes or improvements
   - Once approved, it will be published

### Option B: Distribute on GitHub

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add i18n support and prepare for distribution"
   git push origin main
   ```

2. **Create a Release**:
   - Go to your GitHub repository
   - Click "Releases" → "Create a new release"
   - Tag: v1.0
   - Title: Immich Wallpaper v1.0
   - Description: Copy from README.md (Features section)
   - Upload: `build/immich-wallpaper@nokichan.github.io.zip`
   - Click "Publish release"

3. **Update README.md** with installation instructions:
   ```markdown
   ### Install from GitHub Release
   
   Download the latest release from [Releases](https://github.com/YOUR_USERNAME/ShelllExtensions/releases)
   
   Then install:
   ```bash
   gnome-extensions install immich-wallpaper@nokichan.github.io.zip
   ```
   ```

## 📸 Screenshots to Take

For GNOME Extensions submission, take these screenshots:

1. **Desktop View** - Show the extension working with a beautiful Immich photo as wallpaper
2. **Preferences - Connection** - Show the Server URL, Email, Password fields
3. **Preferences - Wallpaper Settings** - Show interval and picture options
4. **Preferences - Album Selection** - Show the dropdown with loaded albums
5. **Extension Manager** - Show the extension enabled in GNOME Extensions app

Tips for good screenshots:
- Use a clean, attractive Immich photo as wallpaper
- Use 1920x1080 or higher resolution
- Show the extension working in English (default language)
- Make sure UI is clean and readable

## 🔧 Final Checks

Before publishing, verify:

- [ ] Extension UUID is unique: `immich-wallpaper@nokichan.github.io`
- [ ] All translations work (test by changing system language)
- [ ] No console errors in logs: `journalctl -f -o cat /usr/bin/gnome-shell`
- [ ] Extension works after fresh install from zip
- [ ] README.md is complete and clear
- [ ] GitHub repository is public (if using GitHub)
- [ ] Screenshots are high quality
- [ ] License file exists (GPL-2.0-or-later)

## 📧 Support Information

When published, users may contact you for:
- Bug reports
- Feature requests
- Translation contributions
- General questions

Consider:
- Enabling GitHub Issues
- Adding a CONTRIBUTING.md file
- Creating a CHANGELOG.md file
- Setting up GitHub Discussions for questions

## 🎉 After Publishing

1. **Monitor feedback** from users
2. **Fix bugs** promptly
3. **Consider new features**:
   - Multiple monitor support
   - Favorite photos
   - Photo metadata display
   - Time-based album selection (morning/afternoon/evening)
   - Integration with GNOME Backgrounds settings

## 📝 Notes

- The extension UUID includes your email domain for uniqueness
- GNOME Extensions team typically reviews submissions within 1-2 weeks
- You can update the extension by uploading a new version with incremented version number
- Keep the same UUID across versions
- Semantic versioning is recommended: 1.0, 1.1, 2.0, etc.

## 🌍 Adding More Languages

To add a new language (e.g., French):

1. Copy an existing .po file:
   ```bash
   cp po/es.po po/fr.po
   ```

2. Edit `po/fr.po` and translate all strings

3. Add the language to `po/LINGUAS`:
   ```bash
   echo "fr" >> po/LINGUAS
   ```

4. Rebuild:
   ```bash
   ./install.sh
   ```

## Good Luck! 🚀

Your extension is ready to be shared with the GNOME community!
