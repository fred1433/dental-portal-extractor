#!/usr/bin/env python3
"""
Dental Portal API - Advanced extraction for dentist requirements
"""
from flask import Flask, jsonify, request, send_file, Response
from flask_cors import CORS
from datetime import datetime, timedelta
import sqlite3
import json
import os
from pathlib import Path
import google.generativeai as genai
from textwrap import dedent

# Configuration
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DDINS_DIR = PROJECT_ROOT / 'ddins'
DATA_DIR = DDINS_DIR / 'patients'
ROSTER_DB = DDINS_DIR / 'ddins_roster.db'
RECORDS_DB = DDINS_DIR / 'ddins_full_records.db'

app = Flask(__name__)
CORS(app, origins=['http://localhost:5001', 'http://127.0.0.1:5001'])

def get_db(db_name=ROSTER_DB):
    """Get database connection"""
    conn = sqlite3.connect(str(db_name))
    conn.row_factory = sqlite3.Row
    return conn

def categorize_procedure(code):
    """Categorize procedure by CDT code range"""
    if not code or not code.startswith('D'):
        return 'Other'

    try:
        code_num = int(code[1:5])

        if code_num < 1000:
            return 'Diagnostic'
        elif code_num < 2000:
            return 'Preventive'
        elif code_num < 3000:
            return 'Restorative'
        elif code_num < 4000:
            return 'Endodontics'
        elif code_num < 5000:
            return 'Periodontics'
        elif code_num < 6000:
            return 'Prosthodontics (Removable)'
        elif code_num < 7000:
            return 'Maxillofacial Prosthetics'
        elif code_num < 8000:
            return 'Implant Services & Oral Surgery'
        elif code_num < 9000:
            return 'Orthodontics'
        else:
            return 'Adjunctive General Services'
    except:
        return 'Other'

def get_plan_class(code):
    """Determine if procedure is Diagnostic-Preventive, Basic, or Major"""
    if not code or not code.startswith('D'):
        return 'Basic'

    try:
        code_num = int(code[1:5])

        # Diagnostic-Preventive
        if code_num < 2000:
            return 'Diagnostic-Preventive'
        # Basic (fillings, simple extractions, etc.)
        elif code_num < 2400 or (code_num >= 7000 and code_num < 7300):
            return 'Basic'
        # Major (crowns, bridges, dentures, etc.)
        else:
            return 'Major'
    except:
        return 'Basic'

def parse_patient_json(json_path):
    """Parse patient JSON with comprehensive extraction for dentist needs"""
    with open(json_path, 'r') as f:
        data = json.load(f)

    result = {
        # 1. Metadata & Verification
        'metadata': {
            'extractionDate': data.get('extractionDate', ''),
            'portal': data.get('portal', 'Delta Dental'),
            'verificationMethod': 'API',
            'notes': 'Automated extraction via DDINS portal'
        },

        # 2. Patient & Subscriber Information
        'patient': {
            'firstName': data.get('patient', {}).get('firstName', ''),
            'lastName': data.get('patient', {}).get('lastName', ''),
            'dateOfBirth': data.get('patient', {}).get('dateOfBirth', ''),
            'subscriberId': data.get('patient', {}).get('subscriberId', ''),
            'memberId': None,
            'personId': None,
            'relationship': 'Self'  # Default, would need claims data for actual
        },

        # 3. Plan & Network Information
        'plan': {
            'payerId': 'DELTA',
            'payerName': 'Delta Dental',
            'groupNumber': None,
            'groupName': None,
            'divisionNumber': None,
            'product': None,
            'effectiveDate': None,
            'endDate': None,
            'policyType': 'Calendar',  # Calendar vs Fiscal
            'networksAllowed': [],
            'coordinationOfBenefits': False,
            'assignmentOfBenefits': True,
            'alternativeBenefit': None,
            'claimsMailingAddress': None,
            'payerIdEDI': 'DELTA'
        },

        # 4. Financial Summary (Maximums & Deductibles)
        'financial': {
            'maximums': {},
            'deductibles': {},
            'outOfPocket': {}
        },

        # 5. Global Rules & Limitations
        'limitations': {
            'waitingPeriods': [],
            'missingToothClause': None,
            'frequencySharing': {},
            'orthodontics': {
                'covered': False,
                'percentage': 0,
                'ageLimit': 0,
                'lifetimeMax': 0
            },
            'occlusalGuards': {
                'covered': False,
                'percentage': 0,
                'frequency': None
            }
        },

        # 6. Procedures with enhanced details
        'procedures': [],

        # 7. Claims history
        'claims': [],

        # 8. History of procedures
        'history': [],
        'historicalProcedures': []
    }

    # Extract plan information from eligibility.pkg
    if data.get('eligibility', {}).get('pkg'):
        pkg = data['eligibility']['pkg']

        # Member information
        if isinstance(pkg, dict) and 'member' in pkg:
            member = pkg['member']
            result['patient']['memberId'] = member.get('memberId')
            result['patient']['personId'] = member.get('personId')
            result['plan']['groupNumber'] = member.get('groupNumber')
            result['plan']['groupName'] = member.get('groupName')
            result['plan']['divisionNumber'] = member.get('divisionNumber')
            result['plan']['product'] = member.get('product', 'PPO')
            result['plan']['effectiveDate'] = member.get('effectiveDate')
            result['plan']['endDate'] = member.get('endDate')

        # Networks allowed
        if 'networksAllowed' in pkg:
            result['plan']['networksAllowed'] = pkg['networksAllowed']

    # Extract maximums and deductibles with proper mapping
    if data.get('eligibility', {}).get('maxDed'):
        max_ded = data['eligibility']['maxDed']

        # Process maximums
        if 'maximumsInfo' in max_ded and isinstance(max_ded['maximumsInfo'], list):
            for max_info in max_ded['maximumsInfo']:
                if max_info.get('maximumDetails'):
                    details = max_info['maximumDetails']
                    max_type = details.get('type', 'Unknown')

                    # Clean up the type name
                    if 'Calendar' in max_type and 'Individual' in max_type:
                        key = 'Annual Individual'
                    elif 'Lifetime' in max_type and 'Ortho' in max_type:
                        key = 'Orthodontic Lifetime'
                    else:
                        key = max_type

                    amount_info = max_info.get('amountInfo', {})
                    result['financial']['maximums'][key] = {
                        'type': max_type,
                        'total': amount_info.get('totalAmount', 0),
                        'used': amount_info.get('totalUsedAmount', 0),
                        'remaining': amount_info.get('remainingAmount', 0),
                        'period': details.get('calendarOrContractClassification', 'Calendar'),
                        'startDate': details.get('accumPeriodStartDate'),
                        'endDate': details.get('accumPeriodEndDate')
                    }

        # Process deductibles
        if 'deductiblesInfo' in max_ded and isinstance(max_ded['deductiblesInfo'], list):
            for ded_info in max_ded['deductiblesInfo']:
                if ded_info.get('deductibleDetails'):
                    details = ded_info['deductibleDetails']
                    ded_type = details.get('type', 'Unknown')

                    # Clean up the type name
                    if 'Individual' in ded_type:
                        key = 'Individual'
                    elif 'Family' in ded_type:
                        key = 'Family'
                    else:
                        key = ded_type

                    amount_info = ded_info.get('amountInfo', {})
                    result['financial']['deductibles'][key] = {
                        'type': ded_type,
                        'total': amount_info.get('totalAmount', 0),
                        'used': amount_info.get('totalUsedAmount', 0),
                        'remaining': amount_info.get('remainingAmount', 0),
                        'period': details.get('calendarOrContractClassification', 'Calendar'),
                        'appliesTo': []  # Will be filled from procedures
                    }

                    # Check what services the deductible applies to
                    if 'servicesAllowed' in ded_info:
                        for service in ded_info['servicesAllowed']:
                            result['financial']['deductibles'][key]['appliesTo'].append(
                                service.get('treatmentTypeDescription', '')
                            )

    # Extract waiting periods
    wait_data = data.get('eligibility', {}).get('wait')
    if wait_data and wait_data.get('waitingPeriods'):
        for period in wait_data['waitingPeriods']:
            result['limitations']['waitingPeriods'].append({
                'effectiveDate': period.get('effectiveDate'),
                'endDate': period.get('endDate'),
                'months': period.get('waitingPeriodInMonths', 0),
                'treatments': [t.get('treatmentDescription', '') for t in period.get('treatments', [])]
            })

    # Extract ALL additional benefits
    if data.get('eligibility', {}).get('addl', {}).get('additionalBenefits'):
        for benefit in data['eligibility']['addl']['additionalBenefits']:
            header = benefit.get('header', '')
            text = benefit.get('text', '')

            # Extract specific benefits
            if 'Missing Tooth' in header:
                result['limitations']['missingToothClause'] = text
            elif 'COB Rule' in header:
                result['plan']['coordinationOfBenefits'] = text
            elif 'Assignment of Benefits' in header:
                result['plan']['assignmentOfBenefits'] = text == 'Group accepts assignment of benefits.'
            elif 'Orthodontic Age Limit' in header:
                # Parse age limit from text like "Child and adult ;no age limit"
                if 'no age limit' in text.lower():
                    result['limitations']['orthodontics']['ageLimit'] = 999
                else:
                    # Try to extract age from text
                    import re
                    age_match = re.search(r'\d+', text)
                    if age_match:
                        result['limitations']['orthodontics']['ageLimit'] = int(age_match.group())
            elif 'Orthodontic Payment' in header:
                result['limitations']['orthodontics']['paymentSchedule'] = text
            elif 'Alternative' in header or 'Amalgam' in header:
                result['plan']['alternativeBenefit'] = text
            elif 'Takeover' in header:
                result['limitations']['orthodontics']['takeoverPriorCarrier'] = text

    # Extract procedures with comprehensive details
    procedures_by_code = {}

    if data.get('eligibility', {}).get('pkg', {}).get('treatment'):
        treatments = data['eligibility']['pkg']['treatment']
        if isinstance(treatments, list):
            for treatment_class in treatments:
                if 'procedureClass' in treatment_class:
                    for proc_class in treatment_class['procedureClass']:
                        class_desc = proc_class.get('classificationDescription', '')

                        if 'procedure' in proc_class:
                            for proc in proc_class['procedure']:
                                code = proc.get('code')
                                if not code:
                                    continue

                                # Get CDT category and plan class
                                cdt_category = categorize_procedure(code)
                                plan_class = get_plan_class(code)

                                proc_info = {
                                    'code': code,
                                    'description': proc.get('description'),
                                    'cdtCategory': cdt_category,
                                    'planClass': plan_class,
                                    'treatmentClass': class_desc,
                                    'coverage': {},
                                    'limitations': [],
                                    'frequency': None,
                                    'ageLimit': None,
                                    'deductibleApplies': True,
                                    'maximumApplies': True,
                                    'preAuthRequired': proc.get('preApprovalRequired', False),
                                    'alternativeBenefit': None,
                                    'waitingPeriod': None,
                                    'teethCovered': None,
                                    'frequencySharing': None
                                }

                                # Extract frequency sharing from crossCheckProcedureCodes
                                cross_check = proc.get('crossCheckProcedureCodes', '')
                                if cross_check and ',' in cross_check:
                                    # This procedure shares frequency with other codes
                                    shared_codes = [c.strip() for c in cross_check.split(',') if c.strip() != code]
                                    if shared_codes:
                                        proc_info['frequencySharing'] = shared_codes

                                # Extract network coverage details
                                if 'network' in proc:
                                    for network in proc['network']:
                                        network_code = (network.get('code') or '').upper()
                                        network_desc_raw = network.get('description') or ''
                                        network_desc = network_desc_raw.lower()

                                        # Determine if in-network or out-of-network based on known code/description markers
                                        is_out_network = any([
                                            network_code in {'##NP', 'NONPAR', 'OON'},
                                            'non-delta' in network_desc,
                                            'non delta' in network_desc,
                                            'out of network' in network_desc,
                                            'non-par' in network_desc
                                        ])

                                        is_in_network = any([
                                            network_code in {'##PPO', '##PMR', '##PAR'},
                                            'ppo' in network_desc,
                                            'premier' in network_desc,
                                            ('delta' in network_desc and not is_out_network)
                                        ])

                                        if is_out_network:
                                            network_type = 'Out-of-Network'
                                        elif is_in_network:
                                            network_type = 'In-Network'
                                        else:
                                            # Fallback: treat unknown codes as in-network if we already have out-of-network captured
                                            network_type = 'In-Network' if 'In-Network' not in proc_info['coverage'] else 'Out-of-Network'

                                        if 'coverageDetail' in network and network['coverageDetail']:
                                            coverage = network['coverageDetail'][0]
                                            proc_info['coverage'][network_type] = {
                                                'code': network_code,
                                                'description': network_desc_raw,
                                                'percentage': coverage.get('benefitCoverageLevel', '0'),
                                                'copay': coverage.get('copayAmount'),
                                                'deductibleExempted': coverage.get('deductibleExempted', 0) == 1,
                                                'maximumExempted': coverage.get('maximumExempted', 0) == 1,
                                                'ageMin': coverage.get('minAge'),
                                                'ageMax': coverage.get('maxAge')
                                            }

                                            # Update deductible/maximum applies flags
                                            if coverage.get('deductibleExempted', 0) == 1:
                                                proc_info['deductibleApplies'] = False
                                            if coverage.get('maximumExempted', 0) == 1:
                                                proc_info['maximumApplies'] = False

                                # Extract frequency limitations with age limits
                                if 'limitation' in proc:
                                    for limitation in proc['limitation']:
                                        freq_text = limitation.get('frequencyLimitationText', '')
                                        lim_data = {
                                            'text': freq_text,
                                            'quantity': limitation.get('benefitQuantity'),
                                            'period': limitation.get('periodTypeCode'),
                                            'networks': limitation.get('networksApplicable')
                                        }

                                        # Extract age limits and teeth coverage from sexAgeToothCode
                                        if 'sexAgeToothCode' in limitation:
                                            for age_code in limitation['sexAgeToothCode']:
                                                min_age = age_code.get('minAge', 0)
                                                max_age = age_code.get('maxAge', 0)
                                                if max_age > 0 and max_age < 999:
                                                    proc_info['ageLimit'] = {'min': min_age, 'max': max_age}
                                                    lim_data['ageLimit'] = f"{min_age}-{max_age} years"

                                                # Extract teeth coverage information
                                                if age_code.get('toothLimitation'):
                                                    proc_info['teethCovered'] = {
                                                        'hasLimitation': True,
                                                        'groupToothCode': age_code.get('groupToothCode', ''),
                                                        'toothNumbers': age_code.get('toothNumberCode', '').split(',') if age_code.get('toothNumberCode') else []
                                                    }
                                                    lim_data['teethCovered'] = age_code.get('toothNumberCode', '')

                                        if freq_text:
                                            proc_info['frequency'] = freq_text
                                            proc_info['limitations'].append(lim_data)

                                procedures_by_code[code] = proc_info

    # Essential procedures list (40-50 most common codes dentists need)
    essential_codes = [
        # Diagnostic (D0xxx)
        'D0120',  # Periodic oral eval
        'D0140',  # Limited oral eval - problem focused
        'D0150',  # Comprehensive eval - new or established patient
        'D0210',  # Full mouth x-rays
        'D0220',  # Periapical first film
        'D0230',  # Periapical each additional film
        'D0274',  # Bitewings - four films
        'D0330',  # Panoramic film

        # Preventive (D1xxx)
        'D1110',  # Adult cleaning
        'D1120',  # Child cleaning
        'D1206',  # Topical fluoride varnish
        'D1208',  # Topical fluoride
        'D1351',  # Sealant - per tooth
        'D1510',  # Space maintainer - fixed

        # Restorative (D2xxx)
        'D2140',  # Amalgam - one surface
        'D2150',  # Amalgam - two surfaces
        'D2160',  # Amalgam - three surfaces
        'D2330',  # Resin composite - one surface anterior
        'D2331',  # Resin composite - two surfaces anterior
        'D2332',  # Resin composite - three surfaces anterior
        'D2391',  # Resin composite - one surface posterior
        'D2392',  # Resin composite - two surfaces posterior
        'D2393',  # Resin composite - three surfaces posterior
        'D2740',  # Crown - porcelain/ceramic
        'D2750',  # Crown - porcelain fused to high noble metal
        'D2790',  # Crown - full cast high noble metal
        'D2930',  # Prefabricated stainless steel crown
        'D2950',  # Core buildup

        # Endodontics (D3xxx)
        'D3220',  # Pulpotomy
        'D3310',  # Root canal - anterior
        'D3320',  # Root canal - bicuspid
        'D3330',  # Root canal - molar

        # Periodontics (D4xxx)
        'D4341',  # Scaling and root planing - per quadrant
        'D4342',  # Scaling and root planing - limited
        'D4355',  # Full mouth debridement
        'D4910',  # Periodontal maintenance

        # Oral Surgery (D7xxx)
        'D7140',  # Extraction - erupted tooth
        'D7210',  # Extraction - surgical
        'D7240',  # Removal of impacted tooth - completely bony

        # Prosthodontics (D5xxx)
        'D5110',  # Complete denture - maxillary
        'D5120',  # Complete denture - mandibular
        'D5213',  # Partial denture - maxillary - cast metal
        'D5214',  # Partial denture - mandibular - cast metal

        # Implants (D6xxx)
        'D6010',  # Surgical placement of implant
        'D6240',  # Pontic - porcelain fused to high noble

        # Orthodontics (D8xxx)
        'D8080',  # Comprehensive orthodontic treatment - adolescent
        'D8090',  # Comprehensive orthodontic treatment - adult
    ]

    # Add essential procedures first
    for code in essential_codes:
        if code in procedures_by_code:
            result['procedures'].append(procedures_by_code[code])
            del procedures_by_code[code]

    # Only add up to 50 total procedures
    max_procedures = 50
    current_count = len(result['procedures'])

    if current_count < max_procedures:
        # Add remaining high-priority procedures up to limit
        remaining_codes = sorted(procedures_by_code.keys())
        for code in remaining_codes[:max_procedures - current_count]:
            result['procedures'].append(procedures_by_code[code])

    # Extract procedure history
    if data.get('eligibility', {}).get('hist', {}).get('procedures'):
        for hist_proc in data['eligibility']['hist']['procedures']:
            result['history'].append({
                'code': hist_proc.get('code'),
                'description': hist_proc.get('description'),
                'firstServiceDate': hist_proc.get('firstServiceDate'),
                'lastServiceDate': hist_proc.get('lastServiceDate'),
                'count': hist_proc.get('numberOfServicesRendered', '0')
            })

    # Extract claims if available
    if data.get('claims'):
        claims = data['claims']
        if isinstance(claims, list):
            for claim in claims[:50]:  # Limit to 50 most recent
                result['claims'].append({
                    'claimId': claim.get('claimId'),
                    'serviceStartDate': claim.get('dateOfServiceStartDate'),
                    'serviceEndDate': claim.get('dateOfServiceEndDate'),
                    'processedDate': claim.get('processedDate'),
                    'status': claim.get('statusCode'),
                    'statusDescription': claim.get('statusCodeDescription'),
                    'provider': claim.get('renderingProvider', {}).get('lastName'),
                    'providerNPI': claim.get('renderingProvider', {}).get('npi'),
                    'totalCharged': claim.get('paymentSummary', {}).get('totalChargedAmount'),
                    'deltaPaid': claim.get('paymentSummary', {}).get('totalDeltaPaidAmount'),
                    'patientPaid': claim.get('paymentSummary', {}).get('totalPatientPaidAmount')
                })

    # Extract historical procedures from eligibility.hist
    if data.get('eligibility', {}).get('hist', {}).get('procedures'):
        for hist_proc in data['eligibility']['hist']['procedures']:
            hist_info = {
                'code': hist_proc.get('code'),
                'description': hist_proc.get('description'),
                'firstServiceDate': hist_proc.get('firstServiceDate'),
                'lastServiceDate': hist_proc.get('lastServiceDate'),
                'totalServices': hist_proc.get('numberOfServicesRendered', 0),
                'services': []
            }

            # Add service history details
            for service in hist_proc.get('services', [])[:10]:  # Limit to 10 most recent
                hist_info['services'].append({
                    'date': service.get('serviceDate'),
                    'claimId': service.get('claimId'),
                    'status': service.get('statusCodeDescription'),
                    'procedureCode': service.get('procedureCode'),
                    'provider': service.get('providerName', 'Unknown')
                })

            result['historicalProcedures'].append(hist_info)

    # Extract claims mailing address from eligibility.mails
    if data.get('eligibility', {}).get('mails', {}).get('addresses'):
        for address in data['eligibility']['mails']['addresses']:
            # Delta Dental uses different field names
            if address.get('address') or address.get('city'):
                result['plan']['claimsMailingAddress'] = {
                    'company': address.get('company', 'Delta Dental'),
                    'address': address.get('address', ''),
                    'city': address.get('city', ''),
                    'state': address.get('state', ''),
                    'zip': address.get('zipCode', '')
                }
                # Also extract the claim payer ID if available
                if address.get('claimPayerId'):
                    result['plan']['payerIdEDI'] = address.get('claimPayerId')
                break

    return result

@app.route('/')
def index():
    """Serve the main HTML interface"""
    from pathlib import Path
    html_path = Path(__file__).parent / 'dental_interface.html'

    if html_path.exists():
        return send_file(html_path, mimetype='text/html')
    else:
        return '<h1>Error: dental_interface.html not found</h1>', 404

@app.route('/api/search', methods=['GET'])
def search_patients():
    """Search patients across all levels"""
    query = request.args.get('q', '').lower()

    if len(query) < 2:
        return jsonify({'results': [], 'count': 0})

    conn = get_db()
    cursor = conn.cursor()

    # Search in roster database
    cursor.execute("""
        SELECT DISTINCT
            e1_encrypted as id,
            first_name as firstName,
            last_name as lastName,
            date_of_birth as dateOfBirth,
            member_id as memberId,
            plan_name as planName,
            group_name as groupName,
            member_account_status as status,
            json_extracted as hasFullData,
            'roster' as source
        FROM patient_roster
        WHERE LOWER(first_name || ' ' || last_name) LIKE ?
           OR LOWER(member_id) LIKE ?
        ORDER BY last_name, first_name
        LIMIT 50
    """, (f'%{query}%', f'%{query}%'))

    results = []
    for row in cursor.fetchall():
        results.append({
            'id': row['id'],
            'firstName': row['firstName'],
            'lastName': row['lastName'],
            'dateOfBirth': row['dateOfBirth'],
            'memberId': row['memberId'],
            'planName': row['planName'],
            'groupName': row['groupName'],
            'status': row['status'],
            'hasFullData': bool(row['hasFullData']),
            'source': row['source']
        })

    conn.close()

    return jsonify({
        'results': results,
        'count': len(results)
    })

@app.route('/api/patient/<patient_id>', methods=['GET'])
def get_patient_details(patient_id):
    """Get full patient details from all available sources"""

    conn = get_db()
    cursor = conn.cursor()

    # Get roster info first
    cursor.execute("""
        SELECT * FROM patient_roster
        WHERE e1_encrypted = ?
    """, (patient_id,))

    roster_row = cursor.fetchone()

    if not roster_row:
        conn.close()
        return jsonify({'error': 'Patient not found'}), 404

    # Build response with roster data
    response = {
        'id': roster_row['e1_encrypted'],
        'basicInfo': {
            'firstName': roster_row['first_name'],
            'lastName': roster_row['last_name'],
            'dateOfBirth': roster_row['date_of_birth'],
            'memberId': roster_row['member_id'],
            'personId': roster_row['person_id']
        },
        'planInfo': {
            'planName': roster_row['plan_name'],
            'groupNumber': roster_row['group_number'],
            'groupName': roster_row['group_name'],
            'divisionName': roster_row['division_name'],
            'contractType': roster_row['contract_type'],
            'effectiveDate': roster_row['effective_date'],
            'endDate': roster_row['end_date'],
            'status': roster_row['member_account_status']
        },
        'hasFullData': bool(roster_row['json_extracted'])
    }

    # If we have full JSON data, load it
    if roster_row['json_extracted']:
        # Build the expected filename
        json_filename = f"{roster_row['first_name']}_{roster_row['last_name']}.json"
        json_path = DATA_DIR / json_filename

        if json_path.exists():
            try:
                patient_data = parse_patient_json(json_path)
                response['fullData'] = patient_data
            except Exception as e:
                response['dataError'] = str(e)

    # Add modal data if present (for multiple contracts)
    if roster_row['modal_data']:
        try:
            response['modalData'] = json.loads(roster_row['modal_data'])
        except:
            pass

    conn.close()

    return jsonify(response)

@app.route('/api/chat', methods=['POST'])
def chat_with_ai():
    """Chat endpoint for AI assistant with text-to-SQL"""
    data = request.json

    if not data or 'message' not in data:
        return jsonify({'error': 'Message required'}), 400

    patient_id = data.get('patientId')
    message = data['message']

    # Configure Gemini
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return jsonify({
            'error': 'Missing GEMINI_API_KEY environment variable'
        }), 500

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')

    try:
        # Get patient name for context
        patient_name = None
        if patient_id:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT first_name, last_name FROM patient_roster
                WHERE e1_encrypted = ?
            """, (patient_id,))
            row = cursor.fetchone()
            if row:
                patient_name = f"{row['first_name']} {row['last_name']}"
            conn.close()

        # Build context
        context = f"""You are a dental insurance assistant.
        Current patient: {patient_name or 'None selected'}
        User question: {message}

        Please provide helpful information about dental insurance, coverage, or procedures.
        Be concise and professional."""

        # Get AI response
        response = model.generate_content(context)

        return jsonify({
            'response': response.text,
            'patientContext': patient_name
        })

    except Exception as e:
        return jsonify({
            'error': f'AI processing error: {str(e)}'
        }), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get database statistics"""
    conn = get_db()
    cursor = conn.cursor()

    # Get total patients
    cursor.execute("SELECT COUNT(*) as total FROM patient_roster")
    total = cursor.fetchone()['total']

    # Get patients with full data
    cursor.execute("SELECT COUNT(*) as with_data FROM patient_roster WHERE json_extracted = 1")
    with_data = cursor.fetchone()['with_data']

    conn.close()

    # Get claims count from records DB if it exists
    claims_count = 0
    if os.path.exists(RECORDS_DB):
        conn_records = get_db(RECORDS_DB)
        cursor_records = conn_records.cursor()
        try:
            cursor_records.execute("SELECT COUNT(*) as total FROM root__claims")
            claims_count = cursor_records.fetchone()['total']
        except:
            pass
        conn_records.close()

    return jsonify({
        'totalPatients': total,
        'patientsWithFullData': with_data,
        'totalClaims': claims_count
    })

if __name__ == '__main__':
    print("\n🦷 Dental Portal API Server")
    print("=" * 50)
    print(f"Starting server at http://localhost:5001")
    print(f"Roster DB: {ROSTER_DB}")
    print(f"Records DB: {RECORDS_DB}")
    print(f"Data Directory: {DATA_DIR}")
    print("=" * 50)

    app.run(debug=True, port=5001, host='0.0.0.0')
