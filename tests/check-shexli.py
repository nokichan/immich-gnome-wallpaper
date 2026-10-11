#!/usr/bin/env python3
"""Checks a shexli JSON report.

shexli always exits with status 0, even when it reports errors, so the
report has to be parsed instead of trusting the exit code.

Findings other than the accepted ones fail the check. The accepted list
contains known false positives:

  EGO-M-004 - shexli 0.2.1 hardcodes GNOME Shell versions above 50 as
      "implausible future releases", but GNOME Shell 51 is a stable
      release. EGO reviewers approve extensions listing it (e.g.
      Autohide Battery v60, Just Perfection). Remove this exception once
      shexli ships updated version data.

SPDX-License-Identifier: GPL-2.0-or-later
"""

import json
import sys

ACCEPTED = {
    'EGO-M-004': 'shexli 0.2.1 version data lags behind the GNOME Shell 51 release',
}


def main() -> int:
    if len(sys.argv) != 2:
        print('usage: check-shexli.py REPORT.json')
        return 1

    with open(sys.argv[1], encoding='utf-8') as report_file:
        report = json.load(report_file)

    findings = report.get('findings', [])
    failed = False

    for finding in findings:
        rule = finding.get('rule_id', '?')
        severity = finding.get('severity', '?')
        if rule in ACCEPTED:
            print(f'      accepted: {rule} ({severity}) - {ACCEPTED[rule]}')
        else:
            print(f'      {rule} ({severity}): {finding.get("message", "")}')
            evidence = finding.get('evidence') or []
            for item in evidence[:5]:
                path = item.get('path', '?')
                line = item.get('line')
                print(f'      --> {path}{f":{line}" if line else ""}')
            failed = True

    if not findings:
        print('      shexli reported no findings')

    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
