#!/usr/bin/env python3
"""
Sync FULL roster from Delta Dental (all 624 patients)
Level 2 data only - no individual extraction
"""

import argparse
import subprocess
import json
import sqlite3
import time
import random
from datetime import datetime
from pathlib import Path

def sync_full_roster(max_pages=None, start_page=1, page_size=10):
    """Synchronize the complete patient roster"""

    ddins_dir = Path(__file__).resolve().parent
    root_dir = ddins_dir.parent
    db_path = ddins_dir / 'ddins_roster.db'

    if max_pages:
        print(f"🧪 TEST ROSTER SYNC (max {max_pages} pages)")
    else:
        print("🚀 FULL ROSTER SYNCHRONIZATION")
    print("="*60)

    # Node.js script to get ALL pages
    max_pages_value = max_pages if max_pages else "null"
    start_page_value = start_page if start_page else 1
    page_size_value = page_size if page_size else 10

    node_script = '''
const DDINSService = require('./ddins/DDINSApiClient');
const MAX_PAGES = ___MAX_PAGES___;
const START_PAGE = ___START_PAGE___;
const PAGE_SIZE = ___PAGE_SIZE___;

async function getFullRoster() {
    const service = new DDINSService();
    const allPatients = [];

    try {
        console.error('🔑 Initializing service...');
        // Initialize validates the session and extracts ptUserId
        await service.initialize(console.error);
        console.error('✅ Service initialized');

        // Now create the API context (ptUserId is already extracted)
        const api = await service.makeApiContext(console.error);
        console.error('✅ API context created');
        console.error(`📍 Using ptUserId: ${service.ptUserId || 'MISSING!'}`);

        // Auto-discover plocId
        await service.resolvePlocId(api, console.error);

        if (!service.plocId) {
            throw new Error('No plocId found');
        }

        console.error(`📍 Using plocId: ${service.plocId}`);

        let pageNumber = START_PAGE;
        const pageSize = PAGE_SIZE; // Configurable page size
        let totalPages = null;

        // ⚠️ IMPORTANT API LIMITATION DISCOVERED (2025-09-21):
        // Delta Dental API reports 624 total patients but HARD LIMITS pagination to 270 patients max
        // - With pageSize=15: stops at page 18 (270 patients)
        // - With pageSize=10: stops at page 27 (270 patients)
        // - With pageSize=5: stops at page 50 (250 patients due to internal limit)
        // - Only sortBy='MODIFIED_DATE' works, all other sort options return 0 patients
        // This appears to be an anti-scraping protection. We can only access 43% of the roster.
        // TODO: Investigate if there's a date filter or other parameter to access remaining 354 patients

        while (true) {
            // Random delay between 1 and 1.5 seconds
            const delay = 1000 + Math.random() * 500;
            await new Promise(r => setTimeout(r, delay));

            console.error(`📄 Fetching page ${pageNumber} (pageSize=${pageSize})...`);

            const resp = await api.post('/provider-tools/v2/api/patient-mgnt/patient-roster', {
                data: {
                    mtvPlocId: service.plocId,
                    pageNumber: pageNumber,
                    pageSize: pageSize,
                    patientView: 'PATIENTVIEW',
                    sortBy: 'MODIFIED_DATE',
                    contractType: 'FFS'
                },
                headers: {
                    'pt-userid': service.ptUserId,
                    'referer': 'https://www.deltadentalins.com/provider-tools/v2/patient-management'
                }
            });

            const data = await service.parseJsonSafe(resp);

            if (!totalPages) {
                totalPages = Math.ceil(data.totalCount / pageSize);
                console.error(`📊 Total: ${data.totalCount} patients across ${totalPages} pages`);
            }

            if (!data.patients || data.patients.length === 0) break;

            // Add all patients from this page - CAPTURE EVERYTHING!
            for (const p of data.patients) {
                allPatients.push({
                    // Base fields
                    firstName: p.firstName,
                    lastName: p.lastName,
                    dateOfBirth: p.dateOfBirth,
                    personId: p.personId,
                    e1: p.e1 || null,
                    multipleContractsFound: p.multipleContractsFound,

                    // Card fields (ALL of them!)
                    memberId: p.card?.memberId,
                    memberCode: p.card?.memberCode,
                    subscriberType: p.card?.subscriberType,
                    contractId: p.card?.contractId,
                    plan: p.card?.plan,
                    groupNumber: p.card?.groupNumber,
                    groupName: p.card?.groupName,
                    divisionName: p.card?.divisionName,
                    divisionNumber: p.card?.divisionNumber,
                    contractType: p.card?.contractType,
                    effectiveDate: p.card?.effectiveDate,
                    endDate: p.card?.endDate,
                    memberAccountStatus: p.card?.memberAccountStatus,

                    // Additional card fields we were missing!
                    actions: p.card?.actions,
                    skygenPlan: p.card?.skygenPlan,
                    originalEffectiveDate: p.card?.originalEffectiveDate,
                    bl4: p.card?.bl4,
                    bl5: p.card?.bl5,
                    bl6: p.card?.bl6,
                    bl7: p.card?.bl7,

                    // Modal data (for Multiple contracts!)
                    modal: p.modal,  // Store entire modal object with coverages

                    // Flags
                    smileWayPlan: p.smileWayPlan,
                    smileWayMember: p.smileWayMember,
                    hcr: p.hcr,
                    suppressed: p.suppressed
                });
            }

            console.error(`   ✓ Got ${data.patients.length} patients (Total: ${allPatients.length})`);

            // Stop if we've reached max pages (for testing)
            if (MAX_PAGES && pageNumber >= MAX_PAGES) {
                console.error(`\\n🧪 Test limit reached (${MAX_PAGES} pages)`);
                break;
            }

            if (totalPages && pageNumber >= totalPages) break;
            pageNumber++;
        }

        console.error(`\\n✅ Retrieved ${allPatients.length} patients total`);

        // Output as JSON
        console.log(JSON.stringify({
            plocId: service.plocId,
            totalCount: allPatients.length,
            patients: allPatients
        }));

        await api.dispose();

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

getFullRoster();
'''

    # Replace the placeholder with actual value
    node_script = node_script.replace('___MAX_PAGES___', str(max_pages_value))
    node_script = node_script.replace('___START_PAGE___', str(start_page_value))
    node_script = node_script.replace('___PAGE_SIZE___', str(page_size_value))

    print("📡 Connecting to Delta Dental API...")
    print("⏱️  This will take ~1 minute for 624 patients...")

    # Write and execute
    temp_script_path = root_dir / '_temp_full_roster.js'

    with temp_script_path.open('w') as f:
        f.write(node_script)

    try:
        result = subprocess.run(
            ['node', str(temp_script_path)],
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes timeout
        )

        if result.returncode != 0:
            print(f"❌ Error: {result.stderr}")
            return False

        data = json.loads(result.stdout)

        # Save to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Initialize tables if needed
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS practice_locations (
                ploc_id TEXT PRIMARY KEY,
                practice_name TEXT,
                address_city TEXT,
                patient_count INTEGER,
                discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Create or update patient_roster table with ALL fields
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS patient_roster (
                e1_encrypted TEXT PRIMARY KEY,
                ploc_id TEXT,
                first_name TEXT,
                last_name TEXT,
                date_of_birth TEXT,
                person_id TEXT,
                multiple_contracts_found BOOLEAN,

                -- Card fields
                member_id TEXT,
                member_code TEXT,
                subscriber_type TEXT,
                contract_id TEXT,
                plan_name TEXT,
                group_number TEXT,
                group_name TEXT,
                division_name TEXT,
                division_number TEXT,
                contract_type TEXT,
                effective_date TEXT,
                end_date TEXT,
                member_account_status TEXT,

                -- Additional card fields
                actions TEXT,  -- JSON array
                skygen_plan BOOLEAN,
                original_effective_date TEXT,
                bl4 TEXT,
                bl5 TEXT,
                bl6 TEXT,
                bl7 TEXT,

                -- Modal data (for multiple contracts)
                modal_data TEXT,  -- JSON object

                -- Flags
                smile_way_plan BOOLEAN,
                smile_way_member BOOLEAN,
                hcr BOOLEAN,
                suppressed BOOLEAN,

                -- Tracking
                json_extracted BOOLEAN DEFAULT 0,
                extraction_date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (ploc_id) REFERENCES practice_locations(ploc_id)
            )
        ''')

        # Try to add missing columns if table already exists (for older schemas)
        columns_to_add = [
            ("multiple_contracts_found", "BOOLEAN"),
            ("person_id", "TEXT"),
            ("member_code", "TEXT"),
            ("subscriber_type", "TEXT"),
            ("contract_id", "TEXT"),
            ("group_number", "TEXT"),
            ("group_name", "TEXT"),
            ("division_name", "TEXT"),
            ("division_number", "TEXT"),
            ("contract_type", "TEXT"),
            ("effective_date", "TEXT"),
            ("end_date", "TEXT"),
            ("member_account_status", "TEXT"),
            ("actions", "TEXT"),
            ("skygen_plan", "BOOLEAN"),
            ("original_effective_date", "TEXT"),
            ("bl4", "TEXT"),
            ("bl5", "TEXT"),
            ("bl6", "TEXT"),
            ("bl7", "TEXT"),
            ("modal_data", "TEXT"),
            ("smile_way_plan", "BOOLEAN"),
            ("smile_way_member", "BOOLEAN"),
            ("hcr", "BOOLEAN"),
            ("suppressed", "BOOLEAN"),
            ("selected_member_id", "TEXT"),
            ("selected_contract_id", "TEXT"),
            ("selected_plan_payload", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ]

        for column_name, column_type in columns_to_add:
            try:
                cursor.execute(f"ALTER TABLE patient_roster ADD COLUMN {column_name} {column_type}")
            except sqlite3.OperationalError:
                pass  # Column already exists

        # Update location count
        cursor.execute('''
            UPDATE practice_locations
            SET patient_count = ?
            WHERE ploc_id = ?
        ''', (data['totalCount'], data['plocId']))

        # Insert all patients (IGNORE existing to preserve json_extracted flag)
        inserted = 0
        skipped = 0
        multiple = 0

        for patient in data['patients']:
            is_multiple = patient.get('memberId') == 'Multiple'
            if is_multiple:
                multiple += 1
            multiple_flag = bool(patient.get('multipleContractsFound') or is_multiple)

            # Check if patient exists and preserve json_extracted flag
            cursor.execute('SELECT json_extracted FROM patient_roster WHERE e1_encrypted = ?',
                         (patient['e1'] or f"NOID_{patient['firstName']}_{patient['lastName']}",))
            existing = cursor.fetchone()
            existing_json_flag = existing[0] if existing else 0

            cursor.execute('''
                INSERT OR REPLACE INTO patient_roster
                (e1_encrypted, ploc_id, first_name, last_name, date_of_birth, person_id,
                 multiple_contracts_found,
                 member_id, member_code, subscriber_type, contract_id, plan_name,
                 group_number, group_name, division_name, division_number, contract_type,
                 effective_date, end_date, member_account_status,
                 actions, skygen_plan, original_effective_date, bl4, bl5, bl6, bl7,
                 modal_data,
                 smile_way_plan, smile_way_member, hcr, suppressed,
                 selected_member_id, selected_contract_id, selected_plan_payload,
                 json_extracted)  -- Add this field to preserve it
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                # Base fields
                patient['e1'] or f"NOID_{patient['firstName']}_{patient['lastName']}",
                data['plocId'],
                patient['firstName'],
                patient['lastName'],
                patient['dateOfBirth'],
                patient.get('personId'),
                multiple_flag,

                # Card fields
                patient.get('memberId'),
                patient.get('memberCode'),
                patient.get('subscriberType'),
                patient.get('contractId'),
                patient.get('plan'),
                patient.get('groupNumber'),
                patient.get('groupName'),
                patient.get('divisionName'),
                patient.get('divisionNumber'),
                patient.get('contractType'),
                patient.get('effectiveDate'),
                patient.get('endDate'),
                patient.get('memberAccountStatus'),

                # Additional card fields
                json.dumps(patient.get('actions')) if patient.get('actions') else None,
                patient.get('skygenPlan'),
                patient.get('originalEffectiveDate'),
                patient.get('bl4'),
                patient.get('bl5'),
                patient.get('bl6'),
                patient.get('bl7'),

                # Modal data (JSON string)
                json.dumps(patient.get('modal')) if patient.get('modal') else None,

                # Flags
                patient.get('smileWayPlan'),
                patient.get('smileWayMember'),
                patient.get('hcr'),
                patient.get('suppressed'),

                # Selected coverage placeholders (filled during level 3 extraction)
                None,
                None,
                None,

                # Preserve existing json_extracted flag
                existing_json_flag
            ))

            if cursor.rowcount > 0:
                if existing:
                    skipped += 1  # Actually updated but we count as skipped
                else:
                    inserted += 1
            else:
                skipped += 1

        conn.commit()

        # Get statistics
        cursor.execute("SELECT COUNT(*) FROM patient_roster")
        total_in_db = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM patient_roster WHERE json_extracted = 1")
        extracted = cursor.fetchone()[0]

        conn.close()

        print("\n" + "="*60)
        print("✅ ROSTER SYNC COMPLETE")
        print(f"   Retrieved: {data['totalCount']} patients")
        print(f"   Inserted: {inserted} new")
        print(f"   Skipped: {skipped} existing")
        print(f"   Multiple contracts: {multiple}")
        print(f"   Total in DB: {total_in_db}")
        print(f"   With full data: {extracted}")

        return True

    finally:
        import os
        if os.path.exists('_temp_full_roster.js'):
            os.remove('_temp_full_roster.js')

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Sync DDINS patient roster (level 2 data)')
    parser.add_argument('--test', action='store_true', help='Run a quick test (2 pages, default page size)')
    parser.add_argument('--max-pages', type=int, help='Maximum number of pages to fetch (overrides --test)')
    parser.add_argument('--start-page', type=int, default=1, help='Page number to start fetching from (1-indexed)')
    parser.add_argument('--page-size', type=int, default=10, help='Number of patients per page')

    args = parser.parse_args()

    if args.test and not args.max_pages:
        sync_full_roster(max_pages=2, start_page=args.start_page, page_size=args.page_size)
    else:
        sync_full_roster(max_pages=args.max_pages, start_page=args.start_page, page_size=args.page_size)
