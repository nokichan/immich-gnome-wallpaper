/* test-people-picker.js
 *
 * Tests the people picker with real GTK4 widgets and an in-memory
 * GSettings backend.
 *
 * Run with:  xvfb-run -a gjs -m tests/test-people-picker.js
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw?version=1';
import System from 'system';

import {PeoplePicker, parsePersonId} from '../peoplePicker.js';

let failures = 0;

function ok(condition, message) {
    if (condition) {
        print(`ok - ${message}`);
    } else {
        failures++;
        print(`not ok - ${message}`);
    }
}

const ANNA = '11111111-1111-1111-1111-111111111111';
const BEN = '22222222-2222-2222-2222-222222222222';
const HIDDEN = '33333333-3333-3333-3333-333333333333';
const UNNAMED = '44444444-4444-4444-4444-444444444444';
const MISSING = '55555555-5555-5555-5555-555555555555';

const PEOPLE = [
    {id: BEN, name: 'Ben', isHidden: false},
    {id: ANNA, name: 'Anna', isHidden: false},
    {id: HIDDEN, name: 'Carla', isHidden: true},
    {id: UNNAMED, name: '', isHidden: false},
];

Adw.init();

// Compile the extension schema into a temporary directory
const schemaDir = GLib.dir_make_tmp('immich-wallpaper-XXXXXX');
const srcDir = GLib.build_filenamev([GLib.path_get_dirname(System.programPath), '..', 'schemas']);
const [compiled] = GLib.spawn_sync(null,
    ['glib-compile-schemas', `--targetdir=${schemaDir}`, srcDir], null,
    GLib.SpawnFlags.SEARCH_PATH, null);
ok(compiled, 'schema compiles');

const source = Gio.SettingsSchemaSource.new_from_directory(schemaDir, null, false);
const settings = new Gio.Settings({
    settings_schema: source.lookup('org.gnome.shell.extensions.immich-wallpaper', false),
    backend: Gio.memory_settings_backend_new(),
});

function makePicker() {
    const expander = new Adw.ExpanderRow({title: 'Show Photos Of'});
    const picker = new PeoplePicker({
        expander,
        settings,
        key: 'person-ids',
        emptyText: 'Everyone',
        gettext: s => s,
    });
    return {expander, picker};
}

// ------------------------------------------------------------- id parsing
ok(parsePersonId(ANNA) === ANNA, 'bare id is accepted');
ok(parsePersonId(`https://immich.example.com/people/${ANNA.toUpperCase()}?x=1`) === ANNA,
    'id is extracted from a people URL');
ok(parsePersonId('Anna') === null, 'text without id is rejected');

// --------------------------------------------------------------- dropdown
{
    settings.set_strv('person-ids', []);
    const {expander, picker} = makePicker();
    ok(expander.subtitle === 'Everyone', 'empty list shows the empty text');

    picker.setPeople(PEOPLE);
    const labels = [];
    for (let i = 0; i < picker.comboRow.model.get_n_items(); i++)
        labels.push(picker.comboRow.model.get_string(i));
    ok(JSON.stringify(labels.slice(1)) === JSON.stringify(['Anna', 'Ben', 'Carla (hidden in Immich)']),
        'dropdown lists named people sorted, hidden ones marked, unnamed ones left out');
    ok(settings.get_strv('person-ids').length === 0, 'loading people does not store anything');

    picker.comboRow.selected = 3;
    ok(JSON.stringify(settings.get_strv('person-ids')) === JSON.stringify([HIDDEN]),
        'picking a hidden person stores its id');
    ok(picker.comboRow.selected === 0, 'dropdown resets after picking');
    ok(expander.subtitle === 'Carla', 'subtitle shows the selected name');

    picker.comboRow.selected = 3;
    ok(settings.get_strv('person-ids').length === 1, 'picking the same person twice adds it once');

    picker.comboRow.selected = 1;
    ok(expander.subtitle === 'Carla, Anna', 'second person is appended');

    picker.setPeople(PEOPLE);
    ok(settings.get_strv('person-ids').length === 2, 'reloading people keeps the selection');
}

// ------------------------------------------------------------- add by id
{
    settings.set_strv('person-ids', []);
    const {expander, picker} = makePicker();
    picker.setPeople(PEOPLE);

    picker.idRow.text = 'not an id';
    picker.idRow.emit('apply');
    ok(settings.get_strv('person-ids').length === 0, 'invalid id is not stored');
    ok(picker.idRow.has_css_class('error'), 'invalid id is marked as error');

    picker.idRow.text = `https://immich.example.com/people/${UNNAMED}`;
    picker.idRow.emit('apply');
    ok(JSON.stringify(settings.get_strv('person-ids')) === JSON.stringify([UNNAMED]),
        'unnamed person can be added by URL');
    ok(picker.idRow.text === '', 'id entry is cleared after adding');
    ok(expander.subtitle === UNNAMED, 'unnamed person is shown by id');

    picker.add(MISSING);
    picker.remove(UNNAMED);
    ok(JSON.stringify(settings.get_strv('person-ids')) === JSON.stringify([MISSING]),
        'remove() drops only that person');
}

// ---------------------------------------------------------- stored before load
{
    settings.set_strv('person-ids', [ANNA]);
    const {expander, picker} = makePicker();
    ok(expander.subtitle === ANNA, 'before loading, stored ids are shown as ids');
    picker.setPeople(PEOPLE);
    ok(expander.subtitle === 'Anna', 'after loading, stored ids get their names');
}

if (failures > 0) {
    print(`FAIL: ${failures} people picker test(s) failed`);
    System.exit(1);
}

print('PASS: people picker tests');
