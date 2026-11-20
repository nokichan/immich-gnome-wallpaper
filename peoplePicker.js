/* peoplePicker.js
 *
 * Preferences widget for one list of people (e.g. "Show Photos Of"):
 *
 *   - a searchable dropdown with the named people of the server, hidden
 *     people included and marked as such; picking one adds it to the list
 *   - an "Add by ID" entry for people without a name (a pasted Immich
 *     people URL works too)
 *   - one row per selected person with a remove button
 *
 * The selected ids are stored in a string-array GSettings key.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Extracts a person id from user input: a bare id or e.g. an Immich URL
 * like https://immich.example.com/people/<id>.
 *
 * @param {string} text - user input
 * @returns {string|null} the id in lower case, or null
 */
export function parsePersonId(text) {
    const match = UUID_RE.exec(text || '');
    return match ? match[0].toLowerCase() : null;
}

export class PeoplePicker {
    /**
     * @param {object} params
     * @param {Adw.ExpanderRow} params.expander - row the picker lives in
     * @param {Gio.Settings} params.settings - extension settings
     * @param {string} params.key - string-array key holding the ids
     * @param {string} params.emptyText - subtitle when nobody is selected
     * @param {Function} params.gettext - translation function
     */
    constructor({expander, settings, key, emptyText, gettext}) {
        const _ = gettext;
        this._ = _;
        this._expander = expander;
        this._settings = settings;
        this._key = key;
        this._emptyText = emptyText;
        this._people = new Map();    // id -> {id, name, isHidden}
        this._choices = [];          // ids aligned with the dropdown model
        this._personRows = [];
        this._updating = false;

        this._model = new Gtk.StringList();
        this._model.append(_('Select a person…'));
        this._choices.push(null);

        this.comboRow = new Adw.ComboRow({
            title: _('Add Person'),
            subtitle: _('Type to search'),
            model: this._model,
            enable_search: true,
            expression: Gtk.PropertyExpression.new(Gtk.StringObject, null, 'string'),
            selected: 0,
        });
        this.comboRow.connect('notify::selected', () => {
            if (this._updating)
                return;
            const id = this._choices[this.comboRow.selected];
            if (id)
                this.add(id);
            this._resetCombo();
        });
        expander.add_row(this.comboRow);

        this.idRow = new Adw.EntryRow({
            title: _('Add by ID (or paste a people URL)'),
            show_apply_button: true,
        });
        this.idRow.connect('apply', () => {
            const id = parsePersonId(this.idRow.text);
            if (!id) {
                this.idRow.add_css_class('error');
                return;
            }
            this.idRow.remove_css_class('error');
            this.idRow.text = '';
            this.add(id);
        });
        this.idRow.connect('changed', () => this.idRow.remove_css_class('error'));
        expander.add_row(this.idRow);

        this._sync();
    }

    /** @returns {string[]} the stored ids */
    get ids() {
        return this._settings.get_strv(this._key);
    }

    /**
     * Replaces the known people of the server.
     *
     * @param {object[]} people - people from /api/people (hidden included)
     */
    setPeople(people) {
        const _ = this._;
        this._people = new Map(people.map(p => [p.id, p]));

        const named = people.filter(p => p.name && p.name.trim() !== '');
        named.sort((a, b) => a.name.localeCompare(b.name));

        this._updating = true;
        try {
            this._model.splice(1, this._model.get_n_items() - 1,
                named.map(p => (p.isHidden ? `${p.name} (${_('hidden in Immich')})` : p.name)));
            this._choices = [null, ...named.map(p => p.id)];
            this.comboRow.selected = 0;
        } finally {
            this._updating = false;
        }

        this._sync();
    }

    /**
     * @param {string} id - person id to add
     */
    add(id) {
        const ids = this.ids;
        if (!ids.includes(id)) {
            ids.push(id);
            this._settings.set_strv(this._key, ids);
        }
        this._sync();
    }

    /**
     * @param {string} id - person id to remove
     */
    remove(id) {
        this._settings.set_strv(this._key, this.ids.filter(other => other !== id));
        this._sync();
    }

    _resetCombo() {
        this._updating = true;
        try {
            this.comboRow.selected = 0;
        } finally {
            this._updating = false;
        }
    }

    _describe(id) {
        const _ = this._;
        const person = this._people.get(id);
        const hasName = person && person.name && person.name.trim() !== '';

        if (this._people.size === 0)
            return {title: id, subtitle: ''};
        if (!person)
            return {title: id, subtitle: _('Not found on the server')};

        const notes = [];
        if (!hasName)
            notes.push(_('No name in Immich'));
        if (person.isHidden)
            notes.push(_('Hidden in Immich'));

        return {title: hasName ? person.name : id, subtitle: notes.join(' · ')};
    }

    _sync() {
        const _ = this._;

        for (const row of this._personRows)
            this._expander.remove(row);
        this._personRows = [];

        const ids = this.ids;
        const titles = [];

        for (const id of ids) {
            const {title, subtitle} = this._describe(id);
            titles.push(title);

            const row = new Adw.ActionRow({title, subtitle, use_markup: false});
            const removeButton = new Gtk.Button({
                icon_name: 'user-trash-symbolic',
                tooltip_text: _('Remove'),
                valign: Gtk.Align.CENTER,
                css_classes: ['flat'],
            });
            removeButton.connect('clicked', () => this.remove(id));
            row.add_suffix(removeButton);

            this._expander.add_row(row);
            this._personRows.push(row);
        }

        this._expander.subtitle = ids.length > 0 ? titles.join(', ') : this._emptyText;
    }
}
