#!/usr/bin/env python3
"""
DENTAL DEMO - UN SEUL SCRIPT QUI FAIT TOUT
============================================
Pour la démo de demain matin

Usage:
    python dental_demo.py --extract 30    # Extrait 30 patients
    python dental_demo.py --chat          # Lance le chat
"""

import subprocess
import json
import sqlite3
import os
import sys
import time
from pathlib import Path
from datetime import datetime

class DentalDemo:
    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent
        self.project_root = self.base_dir.parent
        self.db_path = self.base_dir / 'ddins_roster.db'
        self.data_dir = self.base_dir / 'patients'
        self.schema_path = self.base_dir / 'schema_sqlite.sql'
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def init_database(self):
        """Crée les tables nécessaires"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        # Table des locations
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS practice_locations (
                ploc_id TEXT PRIMARY KEY,
                practice_name TEXT,
                address_city TEXT,
                patient_count INTEGER,
                discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Table du roster
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS patient_roster (
                e1_encrypted TEXT PRIMARY KEY,
                ploc_id TEXT,
                first_name TEXT,
                last_name TEXT,
                date_of_birth TEXT,
                member_id TEXT,
                plan_name TEXT,
                json_extracted BOOLEAN DEFAULT 0,
                extraction_date TEXT,
                FOREIGN KEY (ploc_id) REFERENCES practice_locations(ploc_id)
            )
        ''')

        conn.commit()
        conn.close()
        print("✅ Database initialized")

    def extract_patients(self, limit=30, start_page=1, page_size=15, force_refresh=False, max_age_days=7):
        """Extrait les patients depuis l'API Delta Dental"""
        print(f"\n🚀 EXTRACTION DE {limit} PATIENTS")
        print("="*60)

        # Script Node.js inline pour tout faire
        node_script = f'''
const DDINSService = require('./ddins/DDINSApiClient');
const START_PAGE = {start_page};
const PAGE_SIZE = {page_size};
const LIMIT = {limit};

async function extractDemo() {{
    const service = new DDINSService();
    const result = {{
        location: null,
        roster: [],
        extracted: []
    }};

    try {{
        // 1. Initialize and auto-discover plocId
        await service.initialize(() => {{}});
        const api = await service.makeApiContext(() => {{}});
        await service.resolvePlocId(api, console.error);

        if (!service.plocId) {{
            throw new Error('No plocId found');
        }}

        // Get location info
        const locRes = await api.post('/provider-tools/v2/api/practice-location/locations', {{data: {{}}}});
        const locations = (await service.parseJsonSafe(locRes))?.practiceLocations || [];
        const currentLoc = locations.find(l => String(l.mtvPracticeLocationId) === service.plocId);

        if (currentLoc) {{
            result.location = {{
                plocId: service.plocId,
                name: currentLoc.practiceName,
                city: currentLoc.address?.city
            }};
        }}

        // 2. Get roster (first LIMIT patients)
        let page = START_PAGE;
        let totalPages = null;
        while (result.roster.length < LIMIT) {{
            const resp = await api.post('/provider-tools/v2/api/patient-mgnt/patient-roster', {{
                data: {{
                    mtvPlocId: service.plocId,
                    pageNumber: page,
                    pageSize: Math.min(PAGE_SIZE, LIMIT - result.roster.length),
                    patientView: 'PATIENTVIEW',
                    sortBy: 'MODIFIED_DATE',
                    contractType: 'FFS'
                }}
            }});

            const data = await service.parseJsonSafe(resp);
            if (!data?.patients?.length) {{
                console.error(`⚠️  No patients returned for page ${'{'}page{'}'} (pageSize=${'{'}PAGE_SIZE{'}'})`);
                break;
            }}

            for (const p of data.patients) {{
                result.roster.push({{
                    e1: p.e1,
                    firstName: p.firstName,
                    lastName: p.lastName,
                    dateOfBirth: p.dateOfBirth,
                    memberId: p.card?.memberId,
                    plan: p.card?.plan
                }});
            }}

            if (!totalPages && data.totalCount) {{
                totalPages = Math.ceil(data.totalCount / PAGE_SIZE);
                result.totalCount = data.totalCount;
                result.totalPages = totalPages;
            }}

            if (totalPages && page >= totalPages) {{
                break;
            }}

            page++;
        }}

        console.error(`✅ Got ${{result.roster.length}} patients from roster (pages ${'{'}START_PAGE{'}'}-${'{'}Math.max(page - 1, START_PAGE){'}'})`);

        // DON'T extract here - will do it after checking DB

        // Output result as JSON
        console.log(JSON.stringify(result));
        await api.dispose();

    }} catch (error) {{
        console.error('Fatal error:', error.message);
        process.exit(1);
    }}
}}

extractDemo();
'''

        # Write and execute Node script
        with open('_temp_extract.js', 'w') as f:
            f.write(node_script)

        try:
            print("📡 Connecting to Delta Dental API...")
            result = subprocess.run(
                ['node', '_temp_extract.js'],
                capture_output=True,
                text=True,
                timeout=120
            )

            if result.returncode != 0:
                print(f"❌ Error: {result.stderr}")
                return False

            try:
                data = json.loads(result.stdout)
            except json.JSONDecodeError as e:
                print(f"❌ Failed to parse JSON: {e}")
                print(f"Output was: {result.stdout[:500]}")
                return False

            # Save to database
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()

            # Save location
            if data['location']:
                loc = data['location']
                cursor.execute('''
                    INSERT OR REPLACE INTO practice_locations
                    (ploc_id, practice_name, address_city, patient_count)
                    VALUES (?, ?, ?, ?)
                ''', (loc['plocId'], loc['name'], loc['city'], len(data['roster'])))
                print(f"\n✅ Location: {loc['name']} ({loc['city']})")

            # Save roster
            # TODO: Patients with memberId="Multiple" need deeper reverse engineering
            # They have multiple contracts and require user to select one in the UI
            # For now, we skip them (affects ~13% of patients)
            for i, patient in enumerate(data['roster']):
                if patient.get('memberId') == 'Multiple':
                    print(f"   ⚠️  Skipping {patient.get('firstName')} {patient.get('lastName')} - Multiple contracts")
                    continue

                # Only insert if not already exists (don't override json_extracted flag!)
                cursor.execute('''
                    INSERT OR IGNORE INTO patient_roster
                    (e1_encrypted, ploc_id, first_name, last_name, date_of_birth, member_id, plan_name)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    patient.get('e1', 'MISSING'),
                    data['location']['plocId'] if data['location'] else None,
                    patient.get('firstName', ''),
                    patient.get('lastName', ''),
                    patient.get('dateOfBirth', ''),
                    patient.get('memberId', ''),
                    patient.get('plan', '')
                ))

            print(f"✅ Roster: {len(data['roster'])} patients saved")

            conn.commit()

            # PHASE 2: Extract only patients not already extracted
            # Respect the limit parameter
            extract_limit = min(limit, 5)  # Max 5 at a time to avoid detection
            cursor.execute("""
                SELECT e1_encrypted, first_name, last_name, date_of_birth, member_id
                FROM patient_roster
                WHERE json_extracted = 0
                AND member_id != 'Multiple'
                LIMIT ?
            """, (extract_limit,))

            patients_to_extract = cursor.fetchall()

            if len(patients_to_extract) == 0:
                print("✅ All patients already extracted!")
                conn.close()
                return True

            print(f"\n📥 Extracting {len(patients_to_extract)} new patients...")

            for e1, first_name, last_name, dob, member_id in patients_to_extract:
                print(f"   Extracting {first_name} {last_name}...")

                # Call Node.js to extract this specific patient
                if self._extract_single_patient(e1, first_name, last_name, dob, member_id):
                    # Mark as extracted
                    cursor.execute(
                        "UPDATE patient_roster SET json_extracted = 1, extraction_date = ? WHERE e1_encrypted = ?",
                        (datetime.now().isoformat(), e1)
                    )
                    conn.commit()
                    print(f"      ✅ Saved")
                else:
                    print(f"      ❌ Failed")

                # Rate limiting (3 seconds between each patient)
                time.sleep(3)

            cursor.execute("SELECT COUNT(*) FROM patient_roster WHERE json_extracted = 1")
            total_extracted = cursor.fetchone()[0]
            print(f"\n✅ Total patients with full data: {total_extracted}")

            conn.commit()
            conn.close()

            return True

        finally:
            if os.path.exists('_temp_extract.js'):
                os.remove('_temp_extract.js')

    def _extract_single_patient(self, e1, first_name, last_name, dob, member_id):
        """Extract a single patient's full data"""

        node_script = f'''
const DDINSService = require('./ddins/DDINSApiClient');

async function extractOne() {{
    const service = new DDINSService();
    try {{
        await service.initialize(() => {{}});

        const fullData = await service.extractPatientData({{
            subscriberId: '{member_id}',
            firstName: '{first_name}',
            lastName: '{last_name}',
            dateOfBirth: '{dob}'
        }}, () => {{}});

        console.log(JSON.stringify(fullData));
    }} catch (error) {{
        console.error('Error:', error.message);
        process.exit(1);
    }}
}}

extractOne();
'''

        with open('_temp_extract_one.js', 'w') as f:
            f.write(node_script)

        try:
            result = subprocess.run(
                ['node', '_temp_extract_one.js'],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0:
                data = json.loads(result.stdout)
                filename = self.data_dir / f"{first_name}_{last_name}.json"
                with open(filename, 'w') as f:
                    json.dump(data, f, indent=2)

                # CRITICAL: Also insert into SQL database
                print(f"      📊 Inserting into SQL database...")
                sql_result = subprocess.run([
                    'python3', str(self.project_root / 'json_to_sql_load.py'),
                    str(filename),
                    '--db', str(self.base_dir / 'ddins_full_records.db'),
                    '--root-table', 'root',
                    '--init-ddl', str(self.schema_path)
                ], capture_output=True, text=True)

                if sql_result.returncode == 0:
                    print(f"      ✅ SQL insertion successful")
                    return True  # Only return True if SQL succeeded
                else:
                    print(f"      ⚠️ SQL insertion failed (JSON saved): {sql_result.stderr[:100]}")
                    return False  # Return False if SQL failed

            return False

        finally:
            if os.path.exists('_temp_extract_one.js'):
                os.remove('_temp_extract_one.js')

    def chat_with_data(self):
        """Lance le chat avec text_to_sql_pipeline.py"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        # Check what we have
        cursor.execute("SELECT COUNT(*) FROM patient_roster")
        roster_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM patient_roster WHERE json_extracted = 1")
        extracted_count = cursor.fetchone()[0]

        if extracted_count == 0:
            print("❌ Aucun patient extrait. Lancez d'abord: python dental_demo.py --extract")
            return

        print(f"\n💬 CHAT WITH DENTAL DATA")
        print(f"   Roster: {roster_count} patients")
        print(f"   Extracted: {extracted_count} patients with full data")
        print("="*60)

        # Get list of extracted patients
        cursor.execute("""
            SELECT first_name, last_name
            FROM patient_roster
            WHERE json_extracted = 1
            ORDER BY first_name
        """)
        patients = cursor.fetchall()

        print("\n📋 Available patients:")
        for i, (fname, lname) in enumerate(patients, 1):
            print(f"   {i}. {fname} {lname}")

        conn.close()

        # Pick first patient for demo
        if patients:
            first_patient = f"{patients[0][0]}_{patients[0][1]}.json"
            json_file = self.data_dir / first_patient

            if json_file.exists():
                print(f"\n🎯 Loading {patients[0][0]} {patients[0][1]} for demo...")

                # Load into SQL database for text_to_sql
                result = subprocess.run([
                    'python', 'robust_etl.py',
                    str(json_file),
                    '--db', 'dental_chat.db'
                ], capture_output=True, text=True)

                if result.returncode == 0:
                    print("✅ Data loaded, starting chat...")

                    # Now run text_to_sql_pipeline
                    subprocess.run([
                        'python', 'text_to_sql_pipeline.py',
                        '--db', 'dental_chat.db'
                    ])
                else:
                    print(f"❌ Failed to load data: {result.stderr}")

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Dental Demo - All in One')
    parser.add_argument('--extract', type=int, help='Extract N patients from API')
    parser.add_argument('--chat', action='store_true', help='Chat with extracted data')
    parser.add_argument('--status', action='store_true', help='Show current status')
    parser.add_argument('--start-page', type=int, default=1, help='Roster page number to start from (1-indexed)')
    parser.add_argument('--page-size', type=int, default=15, help='Page size for roster requests')

    args = parser.parse_args()

    demo = DentalDemo()
    demo.init_database()

    if args.extract:
        demo.extract_patients(
            limit=args.extract,
            start_page=args.start_page,
            page_size=args.page_size
        )
    elif args.chat:
        demo.chat_with_data()
    elif args.status:
        conn = sqlite3.connect(demo.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM patient_roster")
        roster = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM patient_roster WHERE json_extracted = 1")
        extracted = cursor.fetchone()[0]

        print("\n📊 CURRENT STATUS")
        print("="*60)
        print(f"Database: {demo.db_path}")
        print(f"Roster: {roster} patients")
        print(f"Extracted: {extracted} patients with full data")

        if roster > 0:
            cursor.execute("""
                SELECT first_name, last_name, plan_name
                FROM patient_roster
                WHERE json_extracted = 1
                LIMIT 5
            """)
            print("\n🎯 Ready patients:")
            for fname, lname, plan in cursor.fetchall():
                print(f"   - {fname} {lname} ({plan})")

        conn.close()
    else:
        print("Usage:")
        print("  python dental_demo.py --extract 30   # Extract 30 patients")
        print("  python dental_demo.py --chat         # Chat with data")
        print("  python dental_demo.py --status       # Show status")

if __name__ == "__main__":
    main()
