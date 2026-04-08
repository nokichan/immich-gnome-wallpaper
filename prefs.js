/* prefs.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';
import Gdk from 'gi://Gdk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class ImmichWallpaperPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        
        // Create a preferences page
        const page = new Adw.PreferencesPage();
        window.add(page);

        // Create a group for connection settings
        const connectionGroup = new Adw.PreferencesGroup({
            title: _('Connection Settings'),
            description: _('Configure your Immich server connection'),
        });
        page.add(connectionGroup);

        // Server URL
        const serverRow = new Adw.EntryRow({
            title: _('Server URL'),
            text: settings.get_string('server-url'),
        });
        serverRow.connect('changed', (entry) => {
            settings.set_string('server-url', entry.text);
        });
        connectionGroup.add(serverRow);

        // Email
        const emailRow = new Adw.EntryRow({
            title: _('Email'),
            text: settings.get_string('email'),
        });
        emailRow.connect('changed', (entry) => {
            settings.set_string('email', entry.text);
        });
        connectionGroup.add(emailRow);

        // Password
        const passwordRow = new Adw.PasswordEntryRow({
            title: _('Password'),
            text: settings.get_string('password'),
        });
        passwordRow.connect('changed', (entry) => {
            settings.set_string('password', entry.text);
        });
        connectionGroup.add(passwordRow);

        // Test connection button
        const testConnectionRow = new Adw.ActionRow({
            title: _('Test Connection'),
            subtitle: _('Verify your server credentials'),
        });
        
        const testConnectionButton = new Gtk.Button({
            label: _('Test'),
            valign: Gtk.Align.CENTER,
            css_classes: ['suggested-action'],
        });
        
        const connectionStatusIcon = new Gtk.Image({
            icon_name: 'dialog-question-symbolic',
            valign: Gtk.Align.CENTER,
            margin_end: 8,
        });
        
        testConnectionRow.add_suffix(connectionStatusIcon);
        testConnectionRow.add_suffix(testConnectionButton);
        connectionGroup.add(testConnectionRow);

        // Create a group for wallpaper settings
        const wallpaperGroup = new Adw.PreferencesGroup({
            title: _('Wallpaper Settings'),
            description: _('Configure wallpaper rotation behavior'),
        });
        page.add(wallpaperGroup);

        // Change interval
        const intervalRow = new Adw.SpinRow({
            title: _('Change Interval (seconds)'),
            subtitle: _('Time between wallpaper changes'),
            adjustment: new Gtk.Adjustment({
                lower: 60,
                upper: 86400,
                step_increment: 60,
                page_increment: 300,
                value: settings.get_int('change-interval'),
            }),
        });
        intervalRow.connect('changed', (spin) => {
            settings.set_int('change-interval', spin.value);
        });
        wallpaperGroup.add(intervalRow);

        // Picture options
        const pictureOptionsRow = new Adw.ComboRow({
            title: _('Picture Options'),
            subtitle: _('How to display the wallpaper'),
            model: new Gtk.StringList({
                strings: [
                    'Zoom',
                    'Centered',
                    'Scaled',
                    'Stretched',
                    'Spanned',
                    'Wallpaper'
                ]
            })
        });
        
        // Map display names to internal values
        const optionsMap = ['zoom', 'centered', 'scaled', 'stretched', 'spanned', 'wallpaper'];
        const currentOption = settings.get_string('picture-options');
        pictureOptionsRow.selected = optionsMap.indexOf(currentOption);
        
        pictureOptionsRow.connect('notify::selected', (row) => {
            settings.set_string('picture-options', optionsMap[row.selected]);
        });
        wallpaperGroup.add(pictureOptionsRow);

        // Background color picker
        const colorRow = new Adw.ActionRow({
            title: _('Background Color'),
            subtitle: _('Color displayed around photos'),
        });
        
        const colorButton = new Gtk.ColorButton();
        const rgba = new Gdk.RGBA();
        rgba.parse(settings.get_string('background-color'));
        colorButton.set_rgba(rgba);
        colorButton.set_valign(Gtk.Align.CENTER);
        
        colorButton.connect('color-set', (button) => {
            const color = button.get_rgba();
            const hexColor = '#' + 
                ('0' + Math.round(color.red * 255).toString(16)).slice(-2) +
                ('0' + Math.round(color.green * 255).toString(16)).slice(-2) +
                ('0' + Math.round(color.blue * 255).toString(16)).slice(-2);
            settings.set_string('background-color', hexColor);
        });
        
        colorRow.add_suffix(colorButton);
        colorRow.set_activatable_widget(colorButton);
        wallpaperGroup.add(colorRow);

        // Create a group for location settings
        const locationGroup = new Adw.PreferencesGroup({
            title: _('Location Settings'),
            description: _('Display photo location from EXIF data'),
        });
        page.add(locationGroup);

        // Show location switch
        const locationRow = new Adw.SwitchRow({
            title: _('Show Location'),
            subtitle: _('Display location overlay if photo has geolocation data'),
        });
        locationRow.set_active(settings.get_boolean('show-location'));
        locationRow.connect('notify::active', (row) => {
            settings.set_boolean('show-location', row.active);
            mapProviderRow.set_sensitive(row.active);
        });
        locationGroup.add(locationRow);

        // Map provider selection
        const mapProviderRow = new Adw.ComboRow({
            title: _('Map Provider'),
            subtitle: _('Which map service to open when clicking location'),
            model: new Gtk.StringList({
                strings: [
                    'OpenStreetMap',
                    'Google Maps'
                ]
            }),
            sensitive: settings.get_boolean('show-location')
        });
        
        const mapProviderMap = ['openstreetmap', 'googlemaps'];
        const currentMapProvider = settings.get_string('map-provider');
        mapProviderRow.selected = mapProviderMap.indexOf(currentMapProvider);
        
        mapProviderRow.connect('notify::selected', (row) => {
            settings.set_string('map-provider', mapProviderMap[row.selected]);
        });
        locationGroup.add(mapProviderRow);

        // Create a group for panel icon settings
        const panelGroup = new Adw.PreferencesGroup({
            title: _('Panel Icon'),
            description: _('Show an icon in the top panel with photo information'),
        });
        page.add(panelGroup);

        // Show panel icon switch
        const panelIconRow = new Adw.SwitchRow({
            title: _('Show Panel Icon'),
            subtitle: _('Display an icon in the top panel with photo details'),
        });
        panelIconRow.set_active(settings.get_boolean('show-panel-icon'));
        panelIconRow.connect('notify::active', (row) => {
            settings.set_boolean('show-panel-icon', row.active);
        });
        panelGroup.add(panelIconRow);

        // Create a group for album selection
        const albumGroup = new Adw.PreferencesGroup({
            title: _('Album Selection'),
            description: _('Choose which album to use for wallpapers'),
        });
        page.add(albumGroup);

        // Album dropdown - will be populated after loading albums
        const albumModel = new Gtk.StringList();
        albumModel.append(_('All Photos (no filter)'));
        
        const albumRow = new Adw.ComboRow({
            title: _('Select Album'),
            subtitle: _('Loading albums...'),
            model: albumModel,
            selected: 0,
        });
        albumGroup.add(albumRow);

        // Refresh albums button
        const refreshAlbumsRow = new Adw.ActionRow({
            title: _('Refresh Albums'),
            subtitle: _('Reload the album list from server'),
        });
        
        const refreshAlbumsButton = new Gtk.Button({
            icon_name: 'view-refresh-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
        });
        
        refreshAlbumsRow.add_suffix(refreshAlbumsButton);
        albumGroup.add(refreshAlbumsRow);

        // Store album IDs (index 0 is empty for "All Photos")
        const albumIds = [''];
        
        // Connect test connection button
        testConnectionButton.connect('clicked', () => {
            testConnectionButton.sensitive = false;
            testConnectionButton.label = _('Testing...');
            connectionStatusIcon.icon_name = 'content-loading-symbolic';
            
            this._testConnection(settings, (success, message, token) => {
                testConnectionButton.sensitive = true;
                testConnectionButton.label = _('Test');
                
                if (success) {
                    connectionStatusIcon.icon_name = 'emblem-ok-symbolic';
                    testConnectionRow.subtitle = _('Connection successful!');
                    
                    // Automatically refresh albums on successful connection
                    this._refreshAlbums(settings, albumModel, albumRow, albumIds, token);
                } else {
                    connectionStatusIcon.icon_name = 'dialog-error-symbolic';
                    testConnectionRow.subtitle = message || _('Connection failed');
                }
            });
        });
        
        // Connect refresh albums button
        refreshAlbumsButton.connect('clicked', () => {
            refreshAlbumsButton.sensitive = false;
            albumRow.subtitle = _('Refreshing...');
            
            this._testConnection(settings, (success, message, token) => {
                refreshAlbumsButton.sensitive = true;
                
                if (success) {
                    this._refreshAlbums(settings, albumModel, albumRow, albumIds, token);
                } else {
                    albumRow.subtitle = message || _('Connection failed');
                }
            });
        });
        
        // Load albums asynchronously
        this._loadAlbums(settings, albumModel, albumRow, albumIds);
    }

    _testConnection(settings, callback) {
        const serverUrl = settings.get_string('server-url');
        const email = settings.get_string('email');
        const password = settings.get_string('password');
        
        if (!serverUrl || !email || !password) {
            callback(false, _('Please fill in all connection fields'), null);
            return;
        }

        const session = new Soup.Session();
        let authUrl = serverUrl;
        if (authUrl.endsWith('/')) {
            authUrl = authUrl.slice(0, -1);
        }
        authUrl = `${authUrl}/api/auth/login`;
        
        let authMessage;
        try {
            authMessage = Soup.Message.new('POST', authUrl);
            if (!authMessage) {
                callback(false, _('Invalid server URL'), null);
                return;
            }
        } catch (e) {
            callback(false, _('Invalid server URL format'), null);
            return;
        }
        
        const authData = {
            email: email,
            password: password,
        };
        
        authMessage.set_request_body_from_bytes(
            'application/json',
            new GLib.Bytes(JSON.stringify(authData))
        );

        session.send_and_read_async(authMessage, GLib.PRIORITY_DEFAULT, null, (session, result) => {
            try {
                const authBytes = session.send_and_read_finish(result);
                const status = authMessage.get_status();
                
                if (status === 0) {
                    callback(false, _('Could not connect to server'), null);
                    return;
                }
                
                if (status !== 200 && status !== 201) {
                    if (status === 401) {
                        callback(false, _('Invalid email or password'), null);
                    } else {
                        callback(false, _('Server error (status %d)').replace('%d', status), null);
                    }
                    return;
                }

                const data = authBytes.get_data();
                if (!data || data.length === 0) {
                    callback(false, _('Empty response from server'), null);
                    return;
                }

                const authResponse = JSON.parse(new TextDecoder().decode(data));
                
                if (!authResponse.accessToken) {
                    callback(false, _('No access token received'), null);
                    return;
                }
                
                callback(true, null, authResponse.accessToken);
            } catch (error) {
                console.error('Error testing connection:', error);
                callback(false, _('Connection error: %s').replace('%s', error.message || error), null);
            }
        });
    }

    _refreshAlbums(settings, albumModel, albumRow, albumIds, token) {
        let serverUrl = settings.get_string('server-url');
        if (serverUrl.endsWith('/')) {
            serverUrl = serverUrl.slice(0, -1);
        }
        
        // Clear existing albums (except "All Photos")
        while (albumModel.get_n_items() > 1) {
            albumModel.remove(1);
        }
        albumIds.length = 1; // Keep only the first empty string
        
        const session = new Soup.Session();
        const albumsUrl = `${serverUrl}/api/albums`;
        const albumsMessage = Soup.Message.new('GET', albumsUrl);
        albumsMessage.get_request_headers().append('Authorization', `Bearer ${token}`);

        session.send_and_read_async(albumsMessage, GLib.PRIORITY_DEFAULT, null, (session, result) => {
            try {
                const albumsBytes = session.send_and_read_finish(result);

                if (albumsMessage.get_status() !== 200) {
                    albumRow.subtitle = _('Failed to load albums');
                    return;
                }

                const albums = JSON.parse(new TextDecoder().decode(albumsBytes.get_data()));
                
                // Sort albums by name
                albums.sort((a, b) => a.albumName.localeCompare(b.albumName));
                
                // Add albums to the model
                for (const album of albums) {
                    const displayName = `${album.albumName} (${album.assetCount} photos)`;
                    albumModel.append(displayName);
                    albumIds.push(album.id);
                }

                // Set current selection
                const currentAlbumId = settings.get_string('album-id');
                const currentIndex = albumIds.indexOf(currentAlbumId);
                if (currentIndex !== -1) {
                    albumRow.selected = currentIndex;
                }

                // Update subtitle
                albumRow.subtitle = _('%d albums available').replace('%d', albums.length);

            } catch (error) {
                console.error('Error refreshing albums:', error);
                albumRow.subtitle = _('Error loading albums');
            }
        });
    }

    _loadAlbums(settings, albumModel, albumRow, albumIds) {
        // Use _testConnection to authenticate and then _refreshAlbums to load albums
        this._testConnection(settings, (success, message, token) => {
            if (success) {
                // Connect selection change handler before loading albums
                albumRow.connect('notify::selected', (row) => {
                    const selectedId = albumIds[row.selected];
                    settings.set_string('album-id', selectedId);
                });
                
                this._refreshAlbums(settings, albumModel, albumRow, albumIds, token);
            } else {
                albumRow.subtitle = message || _('Please configure server connection first');
            }
        });
    }
}
