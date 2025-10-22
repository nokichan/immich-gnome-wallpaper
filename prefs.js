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

        // Store album IDs (index 0 is empty for "All Photos")
        const albumIds = [''];
        
        // Load albums asynchronously
        this._loadAlbums(settings, albumModel, albumRow, albumIds);
    }

    async _loadAlbums(settings, albumModel, albumRow, albumIds) {
        try {
            const serverUrl = settings.get_string('server-url');
            const email = settings.get_string('email');
            const password = settings.get_string('password');
            
            if (!serverUrl || !email || !password) {
                albumRow.subtitle = _('Please configure server connection first');
                return;
            }

            // Authenticate to get token
            const session = new Soup.Session();
            const authUrl = `${serverUrl}/api/auth/login`;
            const authMessage = Soup.Message.new('POST', authUrl);
            
            const authData = {
                email: email,
                password: password,
            };
            
            authMessage.set_request_body_from_bytes(
                'application/json',
                new GLib.Bytes(JSON.stringify(authData))
            );

            const authBytes = await session.send_and_read_async(
                authMessage,
                GLib.PRIORITY_DEFAULT,
                null
            );
            
            if (authMessage.get_status() !== 200 && authMessage.get_status() !== 201) {
                albumRow.subtitle = _('Authentication failed. Check your credentials.');
                return;
            }

            const authResponse = JSON.parse(new TextDecoder().decode(authBytes.get_data()));
            const token = authResponse.accessToken;

            // Fetch albums
            const albumsUrl = `${serverUrl}/api/albums`;
            const albumsMessage = Soup.Message.new('GET', albumsUrl);
            albumsMessage.get_request_headers().append('Authorization', `Bearer ${token}`);

            const albumsBytes = await session.send_and_read_async(
                albumsMessage,
                GLib.PRIORITY_DEFAULT,
                null
            );

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
            albumRow.subtitle = _(`${albums.length} albums available`);

            // Connect selection change
            albumRow.connect('notify::selected', (row) => {
                const selectedId = albumIds[row.selected];
                settings.set_string('album-id', selectedId);
            });

        } catch (error) {
            console.error('Error loading albums:', error);
            albumRow.subtitle = _('Error loading albums. Check your connection.');
        }
    }
}
