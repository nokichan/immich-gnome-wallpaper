/* test-album-selection.js
 *
 * Regression test for issue #10: the selected album used to be overwritten
 * with "All Photos" whenever the album list was rebuilt.
 *
 * The test uses the real GTK4 widgets and the real AlbumSelection module,
 * so it also catches changes in Gtk.ComboRow signal behaviour.
 *
 * Run with:  xvfb-run -a gjs -m tests/test-album-selection.js
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw?version=1';
import System from 'system';

import {AlbumSelection} from '../albumSelection.js';

const ALBUMS = [
    {albumName: 'Camera', id: 'camera-id'},
    {albumName: 'Travel', id: 'travel-id'},
    {albumName: 'Family', id: 'family-id'},
];

let failures = 0;

function ok(condition, message) {
    if (condition) {
        print(`ok - ${message}`);
    } else {
        failures++;
        print(`not ok - ${message}`);
    }
}

function makeRow() {
    const model = new Gtk.StringList();
    model.append('All Photos (no filter)');

    const row = new Adw.ComboRow({
        title: 'Select Album',
        model,
        selected: 0,
    });

    const albumIds = [''];
    const stored = {value: ''};

    const selection = new AlbumSelection({
        row,
        albumIds,
        onChange: (albumId) => {
            stored.value = albumId;
        },
    });

    return {row, model, albumIds, stored, selection};
}

/* Simulates _refreshAlbums(): rebuild the model and restore the stored album. */
function reloadAlbums({model, albumIds, selection, stored}) {
    selection.update(() => {
        while (model.get_n_items() > 1)
            model.remove(1);
        albumIds.length = 1;

        for (const album of ALBUMS) {
            model.append(`${album.albumName} (10 photos)`);
            albumIds.push(album.id);
        }

        if (!selection.select(stored.value)) {
            selection.select('');
            stored.value = '';
        }
    });
}

const app = new Adw.Application({
    application_id: 'org.gnome.shell.extensions.immich-wallpaper.test',
});

app.connect('activate', () => {
    /* 1. Initial load does not store anything */
    const first = makeRow();
    reloadAlbums(first);
    ok(first.stored.value === '', 'initial load keeps the stored album empty');
    ok(first.row.selected === 0, 'initial load selects "All Photos"');

    /* 2. The user selects an album and it is stored */
    first.row.selected = 2; // Travel
    ok(first.stored.value === 'travel-id', 'user selection is stored');

    /* 3. Rebuilding the list (Test Connection / Refresh) keeps the selection */
    reloadAlbums(first);
    ok(first.stored.value === 'travel-id', 'rebuilding the list keeps the stored album');
    ok(first.row.selected === 2, 'rebuilding the list restores the selection');

    /* 4. Reopening the dialog restores the stored album */
    const second = makeRow();
    second.stored.value = 'camera-id';
    reloadAlbums(second);
    ok(second.row.selected === 1, 'reopening restores the stored album');
    ok(second.stored.value === 'camera-id', 'reopening keeps the stored album');

    /* 5. Selecting "All Photos" stores an empty string */
    second.row.selected = 0;
    ok(second.stored.value === '', 'selecting "All Photos" stores an empty album id');

    /* 6. An album deleted on the server falls back to "All Photos" */
    const third = makeRow();
    third.stored.value = 'deleted-id';
    reloadAlbums(third);
    ok(third.row.selected === 0, 'missing album falls back to "All Photos"');
    ok(third.stored.value === '', 'missing album resets the stored album');

    /* 7. select() reports when the album is not in the list */
    ok(!third.selection.select('deleted-id'), 'select() returns false for unknown albums');

    print(failures === 0 ? 'PASS: album selection tests' : `FAIL: ${failures} check(s) failed`);
    System.exit(failures === 0 ? 0 : 1);
});

app.run([]);
