/* extension.js */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class ImmichWallpaperExtension extends Extension {
    enable() {
        console.log('Enabling Immich Wallpaper extension');
        
        this._settings = this.getSettings();
        this._cacheDir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'immich-wallpaper']);
        this._timeoutId = null;
        this._session = null;
        this._accessToken = null;
        this._photoList = [];
        this._currentIndex = 0;
        
        let dir = Gio.File.new_for_path(this._cacheDir);
        if (!dir.query_exists(null)) {
            dir.make_directory_with_parents(null);
        }

        this._session = new Soup.Session();
        this._startRotation();
        
        this._settingsChangedId = this._settings.connect('changed', () => {
            this._restartRotation();
        });
    }

    disable() {
        console.log('Disabling Immich Wallpaper extension');
        
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
        
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
        
        if (this._session) {
            this._session.abort();
        }
        
        this._settings = null;
        this._session = null;
        this._accessToken = null;
        this._photoList = [];
        this._cacheDir = null;
    }

    _startRotation() {
        this._authenticate((success) => {
            if (success) {
                this._fetchPhotoList(() => {
                    this._changeWallpaper();
                    this._scheduleNextChange();
                });
            } else {
                console.log('Immich Wallpaper: Authentication failed');
            }
        });
    }

    _restartRotation() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
        
        this._accessToken = null;
        this._photoList = [];
        this._currentIndex = 0;
        
        this._startRotation();
    }

    _authenticate(callback) {
        let serverUrl = this._settings.get_string('server-url');
        let email = this._settings.get_string('email');
        let password = this._settings.get_string('password');
        
        if (!serverUrl || !email || !password) {
            console.log('Immich Wallpaper: Missing configuration');
            callback(false);
            return;
        }

        if (serverUrl.endsWith('/')) {
            serverUrl = serverUrl.slice(0, -1);
        }
        
        let authUrl = `${serverUrl}/api/auth/login`;
        let message = Soup.Message.new('POST', authUrl);
        
        let requestBody = JSON.stringify({
            email: email,
            password: password
        });
        
        message.set_request_body_from_bytes(
            'application/json',
            new GLib.Bytes(requestBody)
        );
        
        this._session.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null,
            (session, result) => {
                try {
                    let bytes = session.send_and_read_finish(result);
                    let data = bytes.get_data();
                    let responseText = new TextDecoder().decode(data);
                    
                    if (message.get_status() === 201 || message.get_status() === 200) {
                        let response = JSON.parse(responseText);
                        this._accessToken = response.accessToken;
                        console.log('Immich Wallpaper: Authentication successful');
                        console.log(`Immich Wallpaper: Token: ${this._accessToken.substring(0, 20)}...`);
                        callback(true);
                    } else {
                        console.log(`Immich Wallpaper: Auth failed with status ${message.get_status()}`);
                        console.log(`Immich Wallpaper: Response: ${responseText}`);
                        callback(false);
                    }
                } catch (e) {
                    console.log(`Immich Wallpaper: Error during authentication: ${e}`);
                    callback(false);
                }
            }
        );
    }

    _fetchPhotoList(callback) {
        let serverUrl = this._settings.get_string('server-url');
        console.log(`Immich Wallpaper: Server URL from settings: ${serverUrl}`);
        
        if (serverUrl.endsWith('/')) {
            serverUrl = serverUrl.slice(0, -1);
        }
        
        let albumId = this._settings.get_string('album-id');
        let apiUrl;
        
        if (albumId && albumId.trim() !== '') {
            // Use specific album
            apiUrl = `${serverUrl}/api/albums/${albumId.trim()}`;
            console.log(`Immich Wallpaper: Fetching photos from album ${albumId}`);
        } else {
            // Use random assets from all albums
            apiUrl = `${serverUrl}/api/assets/random?count=100`;
            console.log(`Immich Wallpaper: Fetching random photos from all albums`);
        }
        
        console.log(`Immich Wallpaper: API URL: ${apiUrl}`);
        console.log(`Immich Wallpaper: Using token: ${this._accessToken ? this._accessToken.substring(0, 20) + '...' : 'NULL'}`);
        
        let message = Soup.Message.new('GET', apiUrl);
        let headers = message.get_request_headers();
        headers.append('Authorization', `Bearer ${this._accessToken}`);
        
        this._session.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null,
            (session, result) => {
                try {
                    let bytes = session.send_and_read_finish(result);
                    let data = bytes.get_data();
                    let responseText = new TextDecoder().decode(data);
                    
                    if (message.get_status() === 200) {
                        let response = JSON.parse(responseText);
                        // Response from /api/assets/random is an array
                        // Response from /api/albums/{id} is {assets: [...]}
                        if (Array.isArray(response)) {
                            this._photoList = response.filter(asset => asset.type === 'IMAGE');
                        } else if (response.assets && Array.isArray(response.assets)) {
                            this._photoList = response.assets.filter(asset => asset.type === 'IMAGE');
                        } else {
                            console.log(`Immich Wallpaper: Unexpected response format`);
                            this._photoList = [];
                        }
                        
                        console.log(`Immich Wallpaper: Fetched ${this._photoList.length} photos`);
                        
                        if (this._photoList.length > 0) {
                            callback();
                        } else {
                            console.log('Immich Wallpaper: No photos available');
                        }
                    } else {
                        console.log(`Immich Wallpaper: Failed to fetch photos with status ${message.get_status()}`);
                        console.log(`Immich Wallpaper: Response: ${responseText.substring(0, 200)}`);
                    }
                } catch (e) {
                    console.log(`Immich Wallpaper: Error fetching photos: ${e}`);
                }
            }
        );
    }

    _changeWallpaper() {
        if (this._photoList.length === 0) {
            console.log('Immich Wallpaper: No photos available');
            return;
        }

        let photo = this._photoList[this._currentIndex];
        this._currentIndex = (this._currentIndex + 1) % this._photoList.length;
        
        this._downloadPhoto(photo, (filepath) => {
            if (filepath) {
                this._setWallpaper(filepath);
            }
        });
    }

    _downloadPhoto(photo, callback) {
        let serverUrl = this._settings.get_string('server-url');
        if (serverUrl.endsWith('/')) {
            serverUrl = serverUrl.slice(0, -1);
        }
        // Use the asset/thumbnail endpoint with Bearer token
        let photoUrl = `${serverUrl}/api/assets/${photo.id}/thumbnail?size=preview`;
        
        let message = Soup.Message.new('GET', photoUrl);
        let headers = message.get_request_headers();
        headers.append('Authorization', `Bearer ${this._accessToken}`);
        
        this._session.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null,
            (session, result) => {
                try {
                    let bytes = session.send_and_read_finish(result);
                    
                    if (message.get_status() === 200) {
                        let filename = `${photo.id}.jpg`;
                        let filepath = GLib.build_filenamev([this._cacheDir, filename]);
                        
                        let file = Gio.File.new_for_path(filepath);
                        let outputStream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
                        
                        // Write bytes directly to the output stream
                        outputStream.write_bytes(bytes, null);
                        outputStream.close(null);
                        
                        console.log(`Immich Wallpaper: Downloaded ${filename}`);
                        callback(filepath);
                    } else {
                        console.log(`Immich Wallpaper: Failed to download photo with status ${message.get_status()}`);
                        callback(null);
                    }
                } catch (e) {
                    console.log(`Immich Wallpaper: Error downloading photo: ${e}`);
                    callback(null);
                }
            }
        );
    }

    _setWallpaper(filepath) {
        try {
            let backgroundSettings = new Gio.Settings({
                schema: 'org.gnome.desktop.background'
            });
            
            let pictureOptions = this._settings.get_string('picture-options');
            let uri = `file://${filepath}`;
            
            backgroundSettings.set_string('picture-uri', uri);
            backgroundSettings.set_string('picture-uri-dark', uri);
            backgroundSettings.set_string('picture-options', pictureOptions);
            
            console.log(`Immich Wallpaper: Set wallpaper to ${filepath}`);
            console.log(`Immich Wallpaper: Picture options: ${pictureOptions}`);
        } catch (e) {
            console.log(`Immich Wallpaper: Error setting wallpaper: ${e}`);
        }
    }

    _scheduleNextChange() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
        
        let interval = this._settings.get_int('change-interval');
        
        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
            this._changeWallpaper();
            return GLib.SOURCE_CONTINUE;
        });
    }
}
