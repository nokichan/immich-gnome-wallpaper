/* peopleFilter.js
 *
 * Builds the /api/search/random requests for the people filter and
 * post-processes their results. Kept free of GNOME Shell imports so it can
 * be unit tested with plain gjs.
 *
 * Semantics follow immich-kiosk:
 *   - people:          show photos of ANY of these people. Immich treats
 *                      `personIds` as "all of these", so every person gets
 *                      its own request and the results are merged.
 *   - require all:     show only photos with ALL of these people together
 *                      (a single request with all ids).
 *   - excluded people: never show photos containing one of these people.
 *                      Immich has no server-side exclusion, so assets are
 *                      requested with `withPeople` and filtered locally.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/**
 * @param {object} params
 * @param {string} [params.albumId] - album to restrict to ('' = all)
 * @param {string[]} [params.personIds] - people to show
 * @param {boolean} [params.requireAll] - require all people in one photo
 * @param {string[]} [params.excludedPersonIds] - people to hide
 * @param {number} [params.size] - assets per request
 * @returns {object[]} request bodies for POST /api/search/random
 */
export function buildSearchBodies({
    albumId = '',
    personIds = [],
    requireAll = false,
    excludedPersonIds = [],
    size = 100,
} = {}) {
    const base = {type: 'IMAGE', size};

    if (albumId && albumId.trim() !== '')
        base.albumIds = [albumId.trim()];

    if (excludedPersonIds.length > 0)
        base.withPeople = true;

    const people = [...new Set(personIds.filter(id => id))];

    if (people.length === 0)
        return [base];

    if (requireAll || people.length === 1)
        return [{...base, personIds: people}];

    return people.map(id => ({...base, personIds: [id]}));
}

/**
 * Merges the results of several searches, dropping duplicates (a photo of
 * two selected people is returned by both requests), non-images and photos
 * containing an excluded person.
 *
 * @param {Array<object[]>} results - one asset list per request
 * @param {string[]} [excludedPersonIds] - people to hide
 * @returns {object[]} assets usable as wallpapers
 */
export function mergeAssets(results, excludedPersonIds = []) {
    const excluded = new Set(excludedPersonIds);
    const seen = new Set();
    const assets = [];

    for (const list of results) {
        if (!Array.isArray(list))
            continue;

        for (const asset of list) {
            if (!asset || asset.type !== 'IMAGE' || seen.has(asset.id))
                continue;

            const people = Array.isArray(asset.people) ? asset.people : [];
            if (excluded.size > 0 && people.some(p => excluded.has(p.id)))
                continue;

            seen.add(asset.id);
            assets.push(asset);
        }
    }

    return assets;
}
