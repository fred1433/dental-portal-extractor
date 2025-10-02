#!/usr/bin/env python3
"""Extract DDINS full data using roster selections, handling multiple-coverages patients."""

import argparse
import json
import sqlite3
import subprocess
import sys
import time
from datetime import datetime, date, timezone
import random
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
ROSTER_DB = BASE_DIR / 'ddins_roster.db'
RECORDS_DB = BASE_DIR / 'ddins_full_records.db'
SCHEMA_PATH = BASE_DIR / 'schema_sqlite.sql'
PATIENT_DIR = PROJECT_ROOT / 'data' / 'ddins' / 'patients'
PATIENT_DIR.mkdir(parents=True, exist_ok=True)


def parse_date(value: str) -> date | None:
    if not value:
        return None
    value = value.strip()
    if not value or value.lower() in {'present', 'ongoing', 'current'}:
        return None
    try:
        return datetime.strptime(value, '%m/%d/%Y').date()
    except ValueError:
        # Try ISO format fallback
        try:
            return datetime.strptime(value, '%Y-%m-%d').date()
        except ValueError:
            return None


def choose_coverage(row: sqlite3.Row) -> tuple[dict | None, bool]:
    """Return (coverage, is_multiple) for the roster row."""
    modal_data = row['modal_data']
    is_multiple = bool(row['multiple_contracts_found'])

    if not modal_data:
        # Construct basic coverage from roster row
        coverage = {
            'memberId': row['member_id'],
            'contractId': row['contract_id'],
            'plan': row['plan_name'],
            'groupNumber': row['group_number'],
            'groupName': row['group_name'],
            'divisionNumber': row['division_number'],
            'divisionName': row['division_name'],
            'subscriberType': row['subscriber_type'],
            'memberAccountStatus': row['member_account_status'],
            'selectedSpan': {
                'startDate': row['effective_date'],
                'endDate': row['end_date']
            }
        }
        return coverage, is_multiple

    try:
        modal = json.loads(modal_data)
    except json.JSONDecodeError:
        return None, is_multiple

    coverages = modal.get('coverages') or []
    if not coverages:
        return None, is_multiple

    today = datetime.now(timezone.utc).date()

    def best_span(coverage: dict) -> tuple[date | None, date | None]:
        spans = coverage.get('eligibilitySpans') or []
        best_start = None
        best_end = None
        for span in spans:
            start = parse_date(span.get('startDate'))
            end = parse_date(span.get('endDate'))
            if not best_start or (start and start > best_start):
                best_start = start
                best_end = end
        return best_start, best_end

    scored = []
    for cov in coverages:
        start, end = best_span(cov)
        active = False
        if start and start <= today:
            active = (end is None) or (end >= today)
        elif not start:
            active = end is None or end >= today

        spans = cov.get('eligibilitySpans') or []
        selected_span = spans[0] if spans else {
            'startDate': cov.get('effectiveDate'),
            'endDate': cov.get('endDate')
        }

        scored.append({
            'coverage': cov,
            'is_active': active,
            'start': start,
            'end': end,
            'selected_span': selected_span
        })

    active_coverages = [item for item in scored if item['is_active']]
    if active_coverages:
        # Choose active coverage with most recent start date
        active_coverages.sort(key=lambda c: (c['start'] or date.min, c['end'] or date.max), reverse=True)
        chosen = active_coverages[0]
    else:
        # Choose by farthest end date, fallback to most recent start
        scored.sort(key=lambda c: (c['end'] or date.min, c['start'] or date.min), reverse=True)
        chosen = scored[0]

    cov = dict(chosen['coverage'])
    cov['selectedSpan'] = chosen['selected_span']
    return cov, is_multiple


def build_patient_payload(row: sqlite3.Row) -> dict:
    coverage, is_multiple = choose_coverage(row)

    member_id_for_extraction = None
    if coverage and coverage.get('memberId'):
        member_id_for_extraction = coverage['memberId']
    else:
        member_id_for_extraction = row['member_id']

    payload = {
        'firstName': row['first_name'],
        'lastName': row['last_name'],
        'dateOfBirth': row['date_of_birth'],
        'subscriberId': member_id_for_extraction,
        'selectedCoverage': coverage,
        'rosterMemberId': row['member_id'],
        'rosterContractId': row['contract_id'],
        'rosterE1': row['e1_encrypted'],
        'contractId': coverage.get('contractId') if coverage else row['contract_id'],
        'groupNumber': coverage.get('groupNumber') if coverage else row['group_number'],
        'divisionNumber': coverage.get('divisionNumber') if coverage else row['division_number'],
        'multipleContractsFound': bool(row['multiple_contracts_found']) or is_multiple
    }
    return payload, coverage


def run_node_extraction(payload: dict, timeout_seconds: float) -> dict:
    payload_json = json.dumps(payload)
    payload_literal = payload_json.replace('\\', '\\\\').replace("'", r"\'")

    node_script = f"""
const DDINSService = require('./DDINSApiClient');

async function run() {{
  const service = new DDINSService();
  try {{
    await service.initialize(() => {{}});
    const payload = JSON.parse('{payload_literal}');
    const data = await service.extractPatientData(payload, () => {{}});
    console.log(JSON.stringify({{ success: true, data }}));
  }} catch (error) {{
    console.error(JSON.stringify({{ success: false, error: error.message }}));
    process.exit(1);
  }}
}}

run();
"""

    temp_script = Path('_temp_ddins_extract.js')
    temp_script.write_text(node_script)

    try:
        result = subprocess.run(
            ['node', str(temp_script)],
            capture_output=True,
            text=True,
            timeout=timeout_seconds
        )
    finally:
        if temp_script.exists():
            temp_script.unlink()

    if result.returncode != 0:
        # Try to parse stderr JSON
        try:
            stderr_json = json.loads(result.stderr.strip())
            raise RuntimeError(stderr_json.get('error') or 'Unknown DDINS error')
        except Exception:
            raise RuntimeError(result.stderr.strip() or 'Unknown DDINS error')

    try:
        output = json.loads(result.stdout.strip())
    except json.JSONDecodeError as exc:
        raise RuntimeError(f'Invalid JSON from DDINS extractor: {exc}')

    if not output.get('success'):
        raise RuntimeError(output.get('error') or 'Unknown DDINS extraction error')

    return output['data']


def main():
    parser = argparse.ArgumentParser(description='Extract DDINS full data across roster (handles multiple plans).')
    parser.add_argument('--limit', type=int, default=5, help='Number of patients to extract (default 5)')
    parser.add_argument('--sleep', type=float, default=2.0, help='Base delay between patients in seconds (default 2.0)')
    parser.add_argument('--jitter', type=float, default=1.5, help='Additional random delay (0..jitter) added to base sleep (default 1.5)')
    parser.add_argument('--force', action='store_true', help='Re-extract even if json_extracted=1')
    parser.add_argument('--filter-missing', action='store_true', help='Extract only patients missing selected_member_id')
    parser.add_argument('--allow-missing-member', action='store_true', help='Include patients without member_id (default skips them)')
    parser.add_argument('--timeout', type=float, default=45.0, help='Timeout (seconds) for DDINS extraction requests (default 45)')
    args = parser.parse_args()

    conn = sqlite3.connect(str(ROSTER_DB))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Ensure helper columns exist
    for column_def in (
        ('selected_member_id', 'TEXT'),
        ('selected_contract_id', 'TEXT'),
        ('selected_plan_payload', 'TEXT')
    ):
        try:
            cursor.execute(f"ALTER TABLE patient_roster ADD COLUMN {column_def[0]} {column_def[1]}")
        except sqlite3.OperationalError:
            pass
    conn.commit()

    conditions = []
    params = []
    if not args.force:
        conditions.append('json_extracted = 0')
    if not args.allow_missing_member:
        conditions.append("member_id IS NOT NULL AND member_id != ''")
    if args.filter_missing:
        conditions.append('(selected_member_id IS NULL OR selected_member_id = "")')

    where_clause = 'WHERE ' + ' AND '.join(conditions) if conditions else ''

    cursor.execute(f"""
        SELECT *
        FROM patient_roster
        {where_clause}
        ORDER BY multiple_contracts_found DESC, date_of_birth ASC
        LIMIT ?
    """, (*params, args.limit))

    rows = cursor.fetchall()
    if not rows:
        print('✅ Nothing to extract.')
        conn.close()
        return

    print(f"🚀 Extracting {len(rows)} patients (force={args.force})")

    extracted = 0
    failures = 0

    for row in rows:
        full_name = f"{row['first_name']} {row['last_name']}".strip()
        print(f"\n🦷 {full_name} (member: {row['member_id']})")

        try:
            payload, coverage = build_patient_payload(row)
            if not payload['subscriberId']:
                raise RuntimeError('Unable to determine member ID for extraction')

            data = run_node_extraction(payload, args.timeout)

            filename = PATIENT_DIR / f"{row['first_name']}_{row['last_name']}_{payload['subscriberId']}.json"
            with filename.open('w') as f:
                json.dump(data, f, indent=2)
            print(f"   ✅ Saved JSON -> {filename.name}")

            # Prepare a cleaned version for SQL loader (skip dynamic coverage objects)
            data_for_sql = json.loads(json.dumps(data))  # deep copy
            data_for_sql.pop('selectedCoverage', None)
            if isinstance(data_for_sql.get('summary'), dict):
                data_for_sql['summary'].pop('selectedCoverage', None)

            temp_sql_path = filename.with_suffix('.sqltemp.json')
            with temp_sql_path.open('w') as f:
                json.dump(data_for_sql, f, indent=2)

            sql_result = subprocess.run([
                'python3', str(PROJECT_ROOT / 'json_to_sql_load.py'),
                str(temp_sql_path),
                '--db', str(RECORDS_DB),
                '--root-table', 'root',
                '--init-ddl', str(SCHEMA_PATH)
            ], capture_output=True, text=True)

            if temp_sql_path.exists():
                temp_sql_path.unlink()

            if sql_result.returncode == 0:
                print(f"   ✅ SQL load complete")
            else:
                print(f"   ⚠️ SQL load failed: {sql_result.stderr.strip()[:150]}")

            cursor.execute(
                """
                UPDATE patient_roster
                SET json_extracted = 1,
                    extraction_date = ?,
                    selected_member_id = ?,
                    selected_contract_id = ?,
                    selected_plan_payload = ?
                WHERE e1_encrypted = ?
                """,
                (
                    datetime.now(timezone.utc).isoformat(),
                    payload['subscriberId'],
                    (coverage or {}).get('contractId') if coverage else None,
                    json.dumps(coverage) if coverage else None,
                    row['e1_encrypted']
                )
            )
            conn.commit()
            extracted += 1
        except Exception as exc:
            print(f"   ❌ Extraction failed: {exc}")
            failures += 1
        delay = args.sleep
        if args.jitter > 0:
            delay += random.random() * args.jitter
        time.sleep(delay)

    print(f"\n✅ Done. Success: {extracted}, Failures: {failures}")
    conn.close()


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n⏹️  Interrupted by user')
        sys.exit(1)
