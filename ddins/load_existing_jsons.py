#!/usr/bin/env python3
"""
Load all existing JSON files into SQL database
One-time script to fix our current situation
"""

import subprocess
import json
from pathlib import Path
import sqlite3

def load_all_jsons():
    base_dir = Path(__file__).resolve().parent
    project_root = base_dir.parent
    data_dir = base_dir / 'patients'
    schema_path = base_dir / 'schema_sqlite.sql'
    db_path = base_dir / 'ddins_full_records.db'

    # Get all JSON files
    json_files = list(data_dir.glob('*.json'))
    print(f"🔍 Found {len(json_files)} JSON files")

    # First JSON needs to initialize the schema
    first = True
    success_count = 0

    for json_file in json_files:
        # Skip CONTRACT files (they're different)
        if 'CONTRACT' in json_file.name:
            print(f"⏭️  Skipping {json_file.name} (contract file)")
            continue

        print(f"📥 Loading {json_file.name}...")

        cmd = [
            'python3', str(project_root / 'json_to_sql_load.py'),
            str(json_file),
            '--db', str(db_path),
            '--root-table', 'root'
        ]

        # First file initializes the schema
        if first:
            cmd.extend(['--init-ddl', str(schema_path)])
            first = False

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode == 0:
            print(f"   ✅ Success")
            success_count += 1
        else:
            print(f"   ❌ Failed: {result.stderr[:100]}")

    # Show stats
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM root")
    count = cursor.fetchone()[0]
    conn.close()

    print(f"\n✅ Loaded {success_count}/{len(json_files)} files")
    print(f"📊 Database contains {count} patients")
    print(f"💾 Database size: {Path(db_path).stat().st_size / 1024 / 1024:.1f} MB")

if __name__ == "__main__":
    load_all_jsons()
