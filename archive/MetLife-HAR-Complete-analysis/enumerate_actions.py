#!/usr/bin/env python3
"""Enumerate action links available on MetLife HTML pages"""
import re
from pathlib import Path
import sys

def extract_actions(html_text: str):
    actions = {}

    # Pattern: submitForm('FormName','Action','true','encoded','false');
    pattern = re.compile(r"submitForm\('(.*?)','(.*?)','(true|false)','(.*?)','(true|false)'\)", re.DOTALL)
    for match in pattern.finditer(html_text):
        form, action, set_parms, raw_parms, validate = match.groups()
        raw_parms = raw_parms.replace('\n', '').replace('\r', '')
        actions.setdefault(action, set()).add(raw_parms)

    # Pattern: submitForm('FormName','Action','false','','false'); (no parms)
    pattern_no_parms = re.compile(r"submitForm\('(.*?)','(.*?)','false',''", re.DOTALL)
    for match in pattern_no_parms.finditer(html_text):
        form, action = match.groups()
        actions.setdefault(action, set())

    return actions

def main(path):
    html_text = Path(path).read_text()
    actions = extract_actions(html_text)

    print(f"🔍 Actions trouvées dans {path}:")
    for action, parms_set in sorted(actions.items()):
        print(f"  • {action} ({len(parms_set)} variants)")
        for sample in list(parms_set)[:2]:
            if sample:
                print(f"      parms(sample) = {sample[:80]}{'...' if len(sample) > 80 else ''}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: enumerate_actions.py file.html")
    else:
        main(sys.argv[1])
