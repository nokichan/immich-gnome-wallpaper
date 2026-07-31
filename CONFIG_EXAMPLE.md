# Configuration Example

To test the extension, configure these values in the preferences:

## Immich Server
- **Server URL**: `https://demo.immich.app` (or your server)
- **Email**: your_email@example.com
- **Password**: your_password
- **Change Interval**: 300 (5 minutes for quick testing)

## Authentication Methods

### Option 1: Email + Password (Default)
Use your Immich credentials to authenticate:
- **Email**: your_email@example.com
- **Password**: your_password

### Option 2: API Key
You can also authenticate using an API key instead of email/password:
1. Go to your Immich server settings
2. Create an API key
   - Go to Account > API Keys > New API Key
   - Select:
     - `asset.read`, `asset.download`, `asset.view`
     - `album.read`
     - `user.read`
4. In the extension preferences, select "API Key" as the authentication type
5. Enter your API key

The extension validates the API key by calling `/api/users/me`.

## Important Notes

1. **Authentication**: The extension uses the Immich API for authentication. Make sure your server is accessible.

2. **API Endpoints Used**:
   - `POST /api/auth/login` - Authentication (password method)
   - `GET /api/users/me` - Validate API key
   - `GET /api/assets/random?count=100` - Get list of random photos (max 100)
   - `GET /api/albums` - Get user's albums
   - `GET /api/albums/{id}` - Get photos from specific album
   - `GET /api/assets/{id}/thumbnail?size=preview` - Download photo thumbnail

3. **Cache**: Photos are stored in `~/.cache/immich-wallpaper/` to avoid repeated downloads.

4. **Logs**: To see extension logs in real-time:
   ```bash
   journalctl -f -o cat /usr/bin/gnome-shell | grep -i immich
   ```

5. **Compatibility**: This extension requires GNOME Shell 45+ and uses modern ES6 modules.

## Common Troubleshooting

### Extension doesn't enable
```bash
# Check for errors
journalctl -f -o cat /usr/bin/gnome-shell
```

### Wallpaper doesn't change
- Verify that you have correctly configured the server, email and password
- Check the logs for authentication errors
- Make sure you have photos in your Immich server

### Authentication errors
- Verify that the server URL is correct (without trailing slash)
- Check that the credentials are valid
- Make sure the Immich server is accessible from your network
- If using API key, verify the key is still valid and has not expired
