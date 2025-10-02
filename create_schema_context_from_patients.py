#!/usr/bin/env python3
"""
Create a consolidated patient dataset used for schema inference.

This utility scans `data/ddins/patients/` for individual patient exports
and merges them into a single JSON array (`all_patients_merged.json`). The
resulting file is the input expected by `json_to_sql_schema.py` when we
reverse engineer a SQL schema from multiple patient samples.
"""

import json
import glob
from pathlib import Path

def main():
    base_dir = Path(__file__).resolve().parent
    patients_dir = base_dir / 'data/ddins/patients'
    pattern = str(patients_dir / '*.json')
    output_path = base_dir / 'all_patients_merged.json'

    all_patients = []

    # Read all patient JSON files (excluding domains.json and CONTRACT files)
    for json_file in sorted(glob.glob(pattern)):
        if 'domains.json' in json_file or 'CONTRACT' in json_file:
            continue

        print(f"Adding {Path(json_file).name}...")
        with open(json_file, 'r') as f:
            patient_data = json.load(f)
            all_patients.append(patient_data)

    # Write merged file
    with output_path.open('w') as f:
        json.dump(all_patients, f)

    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"\n✅ Merged {len(all_patients)} patients into {output_path.name}")
    print(f"   File size: {size_mb:.1f} MB")

if __name__ == "__main__":
    main()
