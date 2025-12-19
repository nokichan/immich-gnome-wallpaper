/* extension.js */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class ImmichWallpaperExtension extends Extension {
    enable() {
        console.log('Enabling Immich Wallpaper extension');
        
        this._settings = this.getSettings();
        this._cacheDir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'immich-wallpaper']);
        this._indexFilePath = GLib.build_filenamev([this._cacheDir, 'current-index']);
        this._timeoutId = null;
        this._session = null;
        this._accessToken = null;
        this._photoList = [];
        this._currentIndex = 0;
        this._notificationSource = null;
        this._indicator = null;
        this._currentPhotoMetadata = null;
        
        let dir = Gio.File.new_for_path(this._cacheDir);
        if (!dir.query_exists(null)) {
            dir.make_directory_with_parents(null);
        }
        
        // Load the current index from file
        this._loadCurrentIndex();

        this._session = new Soup.Session();
        this._createIndicator();
        this._startRotation();
        
        this._settingsChangedId = this._settings.connect('changed', (settings, key) => {
            if (key === 'show-panel-icon') {
                this._updateIndicatorVisibility();
            } else {
                this._restartRotation();
            }
        });
    }

    disable() {
        console.log('Disabling Immich Wallpaper extension');
        
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
        
        if (this._retryTimeoutId) {
            GLib.source_remove(this._retryTimeoutId);
            this._retryTimeoutId = null;
        }
        
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
        
        if (this._session) {
            this._session.abort();
        }
        
        if (this._notificationSource) {
            this._notificationSource.destroy();
            this._notificationSource = null;
        }
        
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        
        this._settings = null;
        this._session = null;
        this._accessToken = null;
        this._photoList = [];
        this._currentIndex = 0;
        this._cacheDir = null;
        this._currentPhotoMetadata = null;
    }

    _createIndicator() {
        this._indicator = new PanelMenu.Button(0.0, 'Immich Wallpaper', false);
        
        let icon = new St.Icon({
            icon_name: 'image-x-generic-symbolic',
            style_class: 'system-status-icon',
        });
        this._indicator.add_child(icon);
        
        // Menu items
        this._descriptionItem = new PopupMenu.PopupMenuItem('No photo loaded', {
            reactive: false,
            style_class: 'immich-description-item',
        });
        this._descriptionItem.label.clutter_text.set_line_wrap(true);
        this._descriptionItem.label.clutter_text.set_line_wrap_mode(0); // WORD
        this._descriptionItem.label.set_style('max-width: 300px;');
        this._indicator.menu.addMenuItem(this._descriptionItem);
        
        this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        
        this._locationItem = new PopupMenu.PopupMenuItem('No location available');
        this._locationItem.connect('activate', () => {
            if (this._currentPhotoMetadata && this._currentPhotoMetadata.exifInfo) {
                let exif = this._currentPhotoMetadata.exifInfo;
                if (exif.latitude && exif.longitude) {
                    let mapProvider = this._settings.get_string('map-provider');
                    let mapUrl = this._buildMapUrl(exif.latitude, exif.longitude, mapProvider);
                    Gio.AppInfo.launch_default_for_uri(mapUrl, null);
                }
            }
        });
        this._locationItem.setSensitive(false);
        this._indicator.menu.addMenuItem(this._locationItem);
        
        this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        
        // Next wallpaper button
        let nextItem = new PopupMenu.PopupMenuItem('Next Wallpaper');
        nextItem.connect('activate', () => {
            this._changeWallpaper();
        });
        this._indicator.menu.addMenuItem(nextItem);
        
        Main.panel.addToStatusArea('immich-wallpaper', this._indicator);
        
        this._updateIndicatorVisibility();
    }

    _updateIndicatorVisibility() {
        if (this._indicator) {
            let showIcon = this._settings.get_boolean('show-panel-icon');
            this._indicator.visible = showIcon;
        }
    }

    _updateIndicatorMenu(metadata) {
        if (!this._indicator) {
            return;
        }
        
        this._currentPhotoMetadata = metadata;
        
        // Update description
        if (metadata.exifInfo && metadata.exifInfo.description) {
            this._descriptionItem.label.text = metadata.exifInfo.description;
        } else if (metadata.originalFileName) {
            this._descriptionItem.label.text = metadata.originalFileName;
        } else {
            this._descriptionItem.label.text = 'No description available';
        }
        
        // Update location
        if (metadata.exifInfo) {
            let locationText = this._buildLocationText(metadata.exifInfo);
            if (locationText && metadata.exifInfo.latitude && metadata.exifInfo.longitude) {
                this._locationItem.label.text = `📍 ${locationText}`;
                this._locationItem.setSensitive(true);
            } else {
                this._locationItem.label.text = 'No location available';
                this._locationItem.setSensitive(false);
            }
        } else {
            this._locationItem.label.text = 'No location available';
            this._locationItem.setSensitive(false);
        }
    }

    _startRotation() {
        this._authenticate((success, errorMessage) => {
            if (success) {
                this._fetchPhotoList(() => {
                    this._changeWallpaper();
                    this._scheduleNextChange();
                });
            } else {
                console.log(`Immich Wallpaper: Authentication failed - ${errorMessage || 'Unknown error'}`);
                // Schedule a retry after 5 minutes
                this._scheduleRetry();
            }
        });
    }

    _scheduleRetry() {
        if (this._retryTimeoutId) {
            GLib.source_remove(this._retryTimeoutId);
            this._retryTimeoutId = null;
        }
        
        // Retry after 5 minutes
        this._retryTimeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 300, () => {
            this._retryTimeoutId = null;
            console.log('Immich Wallpaper: Retrying authentication...');
            this._startRotation();
            return GLib.SOURCE_REMOVE;
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
            callback(false, 'Missing configuration (server URL, email, or password)');
            return;
        }

        if (serverUrl.endsWith('/')) {
            serverUrl = serverUrl.slice(0, -1);
        }
        
        let authUrl = `${serverUrl}/api/auth/login`;
        let message;
        
        try {
            message = Soup.Message.new('POST', authUrl);
            if (!message) {
                console.log('Immich Wallpaper: Invalid server URL');
                callback(false, 'Invalid server URL');
                return;
            }
        } catch (e) {
            console.log(`Immich Wallpaper: Error creating request: ${e}`);
            callback(false, 'Invalid server URL format');
            return;
        }
        
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
                    
                    if (!data || data.length === 0) {
                        console.log('Immich Wallpaper: Empty response from server');
                        callback(false, 'Empty response from server');
                        return;
                    }
                    
                    let responseText = new TextDecoder().decode(data);
                    let status = message.get_status();
                    
                    if (status === 201 || status === 200) {
                        let response;
                        try {
                            response = JSON.parse(responseText);
                        } catch (parseError) {
                            console.log(`Immich Wallpaper: Invalid JSON response: ${parseError}`);
                            callback(false, 'Invalid response from server');
                            return;
                        }
                        
                        if (!response.accessToken) {
                            console.log('Immich Wallpaper: No access token in response');
                            callback(false, 'No access token received');
                            return;
                        }
                        
                        this._accessToken = response.accessToken;
                        console.log('Immich Wallpaper: Authentication successful');
                        console.log(`Immich Wallpaper: Token: ${this._accessToken.substring(0, 20)}...`);
                        callback(true, null);
                    } else if (status === 401) {
                        console.log('Immich Wallpaper: Invalid credentials');
                        callback(false, 'Invalid email or password');
                    } else if (status === 0) {
                        console.log('Immich Wallpaper: Could not connect to server');
                        callback(false, 'Could not connect to server');
                    } else {
                        console.log(`Immich Wallpaper: Auth failed with status ${status}`);
                        console.log(`Immich Wallpaper: Response: ${responseText}`);
                        callback(false, `Server error (status ${status})`);
                    }
                } catch (e) {
                    console.log(`Immich Wallpaper: Error during authentication: ${e}`);
                    callback(false, `Connection error: ${e.message || e}`);
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
                            // Validate index is within range after loading photos
                            this._validateCurrentIndex();
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
        // Select next wallpaper randomly
        this._currentIndex = Math.floor(this._getRandomInRange(0, this._photoList.length));
        this._saveCurrentIndex();
        
        this._downloadPhoto(photo, (filepath) => {
            if (filepath) {
                this._setWallpaper(filepath);
                
                // Always fetch metadata for the panel indicator
                // and show notification if location is enabled
                this._fetchPhotoMetadata(photo);
            }
        });
    }

    _getRandomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    _loadCurrentIndex() {
        try {
            let file = Gio.File.new_for_path(this._indexFilePath);
            if (file.query_exists(null)) {
                let [success, contents] = file.load_contents(null);
                if (success) {
                    let index = parseInt(new TextDecoder().decode(contents));
                    if (!isNaN(index) && index >= 0) {
                        this._currentIndex = index;
                        console.log(`Immich Wallpaper: Loaded index ${index} from file`);
                    }
                }
            }
        } catch (e) {
            console.log(`Immich Wallpaper: Error loading index from file: ${e}`);
        }
    }

    _validateCurrentIndex() {
        // Ensure current index is within valid range
        if (this._photoList.length > 0 && this._currentIndex >= this._photoList.length) {
            this._currentIndex = 0;
            this._saveCurrentIndex();
            console.log('Immich Wallpaper: Index out of range, reset to 0');
        }
    }

    _saveCurrentIndex() {
        try {
            let file = Gio.File.new_for_path(this._indexFilePath);
            let contents = this._currentIndex.toString();
            file.replace_contents(
                new TextEncoder().encode(contents),
                null,
                false,
                Gio.FileCreateFlags.REPLACE_DESTINATION,
                null
            );
        } catch (e) {
            console.log(`Immich Wallpaper: Error saving index to file: ${e}`);
        }
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
            let backgroundColor = this._settings.get_string('background-color');
            let uri = `file://${filepath}`;
            
            backgroundSettings.set_string('picture-uri', uri);
            backgroundSettings.set_string('picture-uri-dark', uri);
            backgroundSettings.set_string('picture-options', pictureOptions);
            backgroundSettings.set_string('primary-color', backgroundColor);
            
            console.log(`Immich Wallpaper: Set wallpaper to ${filepath}`);
            console.log(`Immich Wallpaper: Picture options: ${pictureOptions}`);
            console.log(`Immich Wallpaper: Background color: ${backgroundColor}`);
        } catch (e) {
            console.log(`Immich Wallpaper: Error setting wallpaper: ${e}`);
        }
    }

    _fetchPhotoMetadata(photo) {
        let serverUrl = this._settings.get_string('server-url');
        if (serverUrl.endsWith('/')) {
            serverUrl = serverUrl.slice(0, -1);
        }
        
        let metadataUrl = `${serverUrl}/api/assets/${photo.id}`;
        let message = Soup.Message.new('GET', metadataUrl);
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
                        let data = bytes.get_data();
                        let responseText = new TextDecoder().decode(data);
                        let metadata = JSON.parse(responseText);
                        
                        // Update panel indicator menu
                        this._updateIndicatorMenu(metadata);
                        
                        // Show notification if location display is enabled
                        if (this._settings.get_boolean('show-location') && metadata.exifInfo) {
                            this._showLocationNotification(metadata.exifInfo);
                        }
                    }
                } catch (e) {
                    console.log(`Immich Wallpaper: Error fetching metadata: ${e}`);
                }
            }
        );
    }

    _showLocationNotification(exifInfo) {
        // Check if we have location data
        if (!exifInfo.latitude || !exifInfo.longitude) {
            return;
        }
        
        let locationText = this._buildLocationText(exifInfo);
        if (!locationText) {
            return;
        }
        
        // Create notification source if it doesn't exist
        if (!this._notificationSource) {
            this._notificationSource = new MessageTray.Source({
                title: 'Immich Wallpaper',
                iconName: 'image-x-generic-symbolic'
            });
            Main.messageTray.add(this._notificationSource);
        }
        
        // Create notification
        let notification = new MessageTray.Notification({
            source: this._notificationSource,
            title: 'Photo Location',
            body: locationText,
            isTransient: true
        });
        
        // Add action to open map
        let mapProvider = this._settings.get_string('map-provider');
        let mapUrl = this._buildMapUrl(exifInfo.latitude, exifInfo.longitude, mapProvider);
        
        notification.addAction('Open in Map', () => {
            Gio.AppInfo.launch_default_for_uri(mapUrl, null);
        });
        
        this._notificationSource.addNotification(notification);
    }

    _buildLocationText(exifInfo) {
        let parts = [];
        
        if (exifInfo.city) {
            parts.push(exifInfo.city);
        }
        if (exifInfo.state) {
            parts.push(exifInfo.state);
        }
        if (exifInfo.country) {
            parts.push(exifInfo.country);
        }
        
        if (parts.length > 0) {
            return parts.join(', ');
        }
        
        // Fallback to coordinates if no location names available
        return `${exifInfo.latitude.toFixed(4)}, ${exifInfo.longitude.toFixed(4)}`;
    }

    _buildMapUrl(latitude, longitude, provider) {
        if (provider === 'googlemaps') {
            return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        } else {
            // OpenStreetMap
            return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=15`;
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
