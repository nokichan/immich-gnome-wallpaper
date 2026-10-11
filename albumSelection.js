/* albumSelection.js
 *
 * Keeps the album combo row in the preferences dialog in sync with the
 * `album-id` GSettings key.
 *
 * Gtk.ComboRow emits `notify::selected` whenever the album list is rebuilt:
 * removing the selected item makes the row clamp its selection, and those
 * intermediate emissions used to overwrite the stored album with an empty
 * or stale value (issue #10). Programmatic changes must therefore run
 * inside update() so they do not trigger the change callback.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

export class AlbumSelection {
    /**
     * @param {object} params
     * @param {Adw.ComboRow} params.row - combo row listing the albums
     * @param {string[]} params.albumIds - album ids, aligned with the row model
     * @param {Function} params.onChange - called with the album id on user changes
     */
    constructor({row, albumIds, onChange}) {
        this._row = row;
        this._albumIds = albumIds;
        this._onChange = onChange;
        this._updating = false;

        this._handlerId = row.connect('notify::selected', () => {
            if (this._updating)
                return;

            const albumId = this._albumIds[this._row.selected];
            if (albumId === undefined)
                return;

            this._onChange(albumId);
        });
    }

    /**
     * Runs func() with change notifications suppressed, so rebuilding the
     * album list cannot overwrite the stored selection.
     *
     * @param {Function} func - function mutating the row or its model
     */
    update(func) {
        this._updating = true;
        try {
            func();
        } finally {
            this._updating = false;
        }
    }

    /**
     * Selects the album with the given id without emitting onChange.
     *
     * @param {string} albumId - album id to select
     * @returns {boolean} false when the album is not in the list
     */
    select(albumId) {
        const index = this._albumIds.indexOf(albumId);
        if (index === -1)
            return false;

        this._row.selected = index;
        return true;
    }
}
