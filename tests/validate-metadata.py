#!/usr/bin/env python3
"""Validates metadata.json against the GNOME Shell extension requirements.

Checks performed:
  - metadata.json is valid JSON and contains the required keys
  - uuid has the form <name>@<domain>
  - version is a positive integer
  - shell-version is a non-empty list of version strings
  - settings-schema matches the id of an existing gschema file
  - gettext-domain is set when po/ translations exist

SPDX-License-Identifier: GPL-2.0-or-later
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

REQUIRED_KEYS = ('name', 'description', 'uuid', 'shell-version', 'version')
UUID_RE = re.compile(r'^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$')
VERSION_RE = re.compile(r'^\d+(\.\d+)?$')


def main() -> int:
    errors: list[str] = []

    metadata_path = ROOT / 'metadata.json'
    if not metadata_path.is_file():
        print('not ok - metadata.json not found')
        return 1

    try:
        metadata = json.loads(metadata_path.read_text(encoding='utf-8'))
    except json.JSONDecodeError as exc:
        print(f'not ok - metadata.json is not valid JSON: {exc}')
        return 1

    for key in REQUIRED_KEYS:
        if not metadata.get(key):
            errors.append(f'metadata.json is missing required key "{key}"')

    if not UUID_RE.match(str(metadata.get('uuid', ''))):
        errors.append('uuid must have the form <name>@<domain>')

    if not isinstance(metadata.get('version'), int) or metadata['version'] < 1:
        errors.append('version must be a positive integer (GNOME Extensions requirement)')

    shell_versions = metadata.get('shell-version')
    if not isinstance(shell_versions, list) or not shell_versions:
        errors.append('shell-version must be a non-empty list')
    else:
        for entry in shell_versions:
            if not VERSION_RE.match(str(entry)):
                errors.append(f'shell-version entry "{entry}" is not a valid version string')

    # settings-schema must match a schema id in schemas/
    schema_ids: set[str] = set()
    for schema_file in (ROOT / 'schemas').glob('*.gschema.xml'):
        for match in re.finditer(r'<schema\s+id="([^"]+)"', schema_file.read_text(encoding='utf-8')):
            schema_ids.add(match.group(1))

    if metadata.get('settings-schema') not in schema_ids:
        errors.append(
            f'settings-schema "{metadata.get("settings-schema")}" does not match any '
            f'schema id found in schemas/ ({", ".join(sorted(schema_ids)) or "none"})'
        )

    # gettext-domain is required when translations are shipped
    if list((ROOT / 'po').glob('*.po')) and not metadata.get('gettext-domain'):
        errors.append('gettext-domain must be set when po/ translations are shipped')

    if errors:
        for error in errors:
            print(f'not ok - {error}')
        return 1

    print('ok - metadata.json and schemas are valid')
    return 0


if __name__ == '__main__':
    sys.exit(main())
