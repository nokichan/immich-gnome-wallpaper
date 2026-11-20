/* test-people-filter.js
 *
 * Unit tests for the people filter (request building and result merging).
 *
 * Run with:  gjs -m tests/test-people-filter.js
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import System from 'system';

import {buildSearchBodies, mergeAssets} from '../peopleFilter.js';

let failures = 0;

function ok(condition, message) {
    if (condition) {
        print(`ok - ${message}`);
    } else {
        failures++;
        print(`not ok - ${message}`);
    }
}

function same(actual, expected, message) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    ok(a === e, a === e ? message : `${message} (got ${a}, expected ${e})`);
}

const image = (id, people = []) => ({id, type: 'IMAGE', people: people.map(p => ({id: p}))});

// ------------------------------------------------------------ request bodies
same(buildSearchBodies(),
    [{type: 'IMAGE', size: 100}],
    'no filter: one plain request');

same(buildSearchBodies({albumId: ' album-1 '}),
    [{type: 'IMAGE', size: 100, albumIds: ['album-1']}],
    'album id is trimmed and passed on');

same(buildSearchBodies({personIds: ['a']}),
    [{type: 'IMAGE', size: 100, personIds: ['a']}],
    'one person: one request');

same(buildSearchBodies({personIds: ['a', 'b']}),
    [
        {type: 'IMAGE', size: 100, personIds: ['a']},
        {type: 'IMAGE', size: 100, personIds: ['b']},
    ],
    'several people (any): one request per person');

same(buildSearchBodies({personIds: ['a', 'b'], requireAll: true}),
    [{type: 'IMAGE', size: 100, personIds: ['a', 'b']}],
    'several people (all): one request with all ids');

same(buildSearchBodies({personIds: ['a', 'a', '']}),
    [{type: 'IMAGE', size: 100, personIds: ['a']}],
    'duplicate and empty ids are dropped');

same(buildSearchBodies({excludedPersonIds: ['x']}),
    [{type: 'IMAGE', size: 100, withPeople: true}],
    'exclusions request the people of each asset');

same(buildSearchBodies({albumId: 'album-1', personIds: ['a', 'b'], excludedPersonIds: ['x']}),
    [
        {type: 'IMAGE', size: 100, albumIds: ['album-1'], withPeople: true, personIds: ['a']},
        {type: 'IMAGE', size: 100, albumIds: ['album-1'], withPeople: true, personIds: ['b']},
    ],
    'album, people and exclusions combine');

// ------------------------------------------------------------------- merging
same(mergeAssets([[image('1'), image('2')], [image('2'), image('3')]]).map(a => a.id),
    ['1', '2', '3'],
    'duplicates across requests are merged');

same(mergeAssets([[image('1'), {id: '2', type: 'VIDEO'}]]).map(a => a.id),
    ['1'],
    'non-images are dropped');

same(mergeAssets([[image('1', ['a']), image('2', ['a', 'x']), image('3')]], ['x']).map(a => a.id),
    ['1', '3'],
    'photos with an excluded person are dropped');

same(mergeAssets([[image('1', ['x'])]]).map(a => a.id),
    ['1'],
    'nothing is excluded without exclusions');

same(mergeAssets([[image('1')], [], undefined, null]).map(a => a.id),
    ['1'],
    'failed requests are ignored');

if (failures > 0) {
    print(`FAIL: ${failures} people filter test(s) failed`);
    System.exit(1);
}

print('PASS: people filter tests');
