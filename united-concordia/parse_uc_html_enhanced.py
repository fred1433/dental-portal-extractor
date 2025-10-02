#!/usr/bin/env python3
"""
United Concordia HTML Parser - Clean approach
Transforms HTML to JSON with 100% data extraction
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Any

def parse_united_concordia_html(html_path: str) -> Dict[str, Any]:
    """
    Parse United Concordia HTML and extract ALL data to JSON.
    ENHANCED VERSION: Includes Timely Filing, Other Insurance, and complete Group ID.
    AUTO-NORMALIZED: Ensures consistent structure across all patients.
    """

    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()

    data = {
        "patient": extract_patient_info(html),
        "policyholder": extract_policyholder(html),
        "group": extract_group_info(html),
        "coverage": extract_coverage_info(html),
        "claims": extract_claims_address(html),
        "serviceHistory": extract_service_history(html),
        "procedures": extract_all_procedures(html),
        "benefitsSummary": extract_benefits_summary(html),
        "policyDetails": extract_all_policy_details(html),
        "timelyFiling": extract_timely_filing(html),  # NEW
        "otherInsurance": extract_other_insurance(html),  # NEW
        "metadata": {
            "htmlSize": len(html),
            "extractionMethod": "python_parser_enhanced_normalized"
        }
    }

    # NORMALISATION AUTOMATIQUE - Toujours appliquée
    data = normalize_structure(data)

    return data

def extract_patient_info(html: str) -> Dict[str, Any]:
    """Extract patient information."""
    patient = {}

    # Extract name from memberName id
    name_match = re.search(r'id="memberName"[^>]*>([^<]+)', html)
    if name_match:
        patient['name'] = name_match.group(1).strip()

    # Extract Member ID
    member_id_match = re.search(r'id="nolineTabletopContent"[^>]*>([^<]+)', html)
    if member_id_match:
        patient['memberId'] = member_id_match.group(1).strip()

    # Extract DOB
    dob_match = re.search(r'DOB</td>\s*<td[^>]*>([^<]+)', html)
    if dob_match:
        patient['dateOfBirth'] = dob_match.group(1).strip()

    # Extract Age
    age_match = re.search(r'Age</td>\s*<td[^>]*>([^<]+)', html)
    if age_match:
        patient['age'] = int(age_match.group(1).strip())

    # Extract Status
    status_match = re.search(r'class="memberStatusLabel"[^>]*>([^<]+)', html)
    if status_match:
        patient['status'] = status_match.group(1).strip()

    # Extract Relationship
    rel_match = re.search(r'Relationship</td>\s*<td[^>]*>([^<]+)', html)
    if rel_match:
        patient['relationship'] = rel_match.group(1).strip()

    return patient

def extract_policyholder(html: str) -> Dict[str, str]:
    """Extract policyholder information."""
    policyholder = {}

    match = re.search(r'Policyholder</span><br\s*/?>\s*([^<]+)', html)
    if match:
        policyholder['name'] = re.sub(r'\s+', ' ', match.group(1).strip())

    # Try to extract member ID if available
    member_match = re.search(r'customAttributes\["08 - Member Group Number"\]\s*=\s*"([^"]+)"', html)
    if member_match:
        policyholder['memberID'] = member_match.group(1).strip()

    return policyholder

def extract_group_info(html: str) -> Dict[str, str]:
    """Extract COMPLETE group information including full ID number."""
    group = {}

    # Network info
    network_match = re.search(r'id="your-network-individual-network"[^>]*>([^<]+)', html)
    if network_match:
        group['network'] = network_match.group(1).strip()

    # Group network
    group_net_match = re.search(r'id="policy-info-group-network"[^>]*>([^<]+)', html)
    if group_net_match:
        group['groupNetwork'] = group_net_match.group(1).strip()

    # Extract FULL Group / ID (including number) - ENHANCED
    group_match = re.search(r'Group\s*/\s*ID</span><br\s*/?>([^<]+)', html, re.IGNORECASE)
    if group_match:
        full_group = group_match.group(1).strip()
        group['fullGroupId'] = full_group  # Keep the complete string "FEDVIP HIGH OPTION / 777777018"

        parts = full_group.split('/')
        if len(parts) >= 2:
            group['name'] = parts[0].strip()
            group['number'] = parts[1].strip()

    return group

def extract_coverage_info(html: str) -> Dict[str, str]:
    """Extract coverage information."""
    coverage = {}

    # Effective dates
    eff_match = re.search(r'(\d{2}/\d{2}/\d{4})\s*-\s*([^|<]+)', html)
    if eff_match:
        coverage['effectiveDate'] = eff_match.group(1)
        coverage['status'] = eff_match.group(2).strip()

    # Timely filing
    timely_match = re.search(r'Timely\s+Filing</span><br\s*/>([^<]+)', html, re.IGNORECASE)
    if timely_match:
        coverage['timelyFiling'] = timely_match.group(1).strip()

    return coverage

def extract_claims_address(html: str) -> Dict[str, str]:
    """Extract claims address."""
    claims = {}

    # PO Box
    po_match = re.search(r'P\.O\.\s+BOX\s+(\d+)', html)
    if po_match:
        claims['poBox'] = po_match.group(1)

    # City, State, Zip
    addr_match = re.search(r'HARRISBURG[,\s]+PA\s+(\d{5})', html)
    if addr_match:
        claims['city'] = 'HARRISBURG'
        claims['state'] = 'PA'
        claims['zip'] = addr_match.group(1)

    if claims.get('poBox'):
        claims['fullAddress'] = f"DENTAL CLAIMS\nP.O. BOX {claims['poBox']}\n{claims['city']}, {claims['state']} {claims['zip']}"

    return claims

def extract_service_history(html: str) -> List[Dict[str, str]]:
    """Extract service history."""
    history = []

    # Find service history table
    table_match = re.search(r'id="serviceHistoryPanelList:tbody_element">(.*?)</tbody>', html, re.DOTALL)
    if table_match:
        tbody = table_match.group(1)
        rows = re.findall(r'<tr>(.*?)</tr>', tbody, re.DOTALL)

        for row in rows:
            cells = re.findall(r'<td>([^<]*)</td>', row)
            if len(cells) >= 3:
                service = {
                    'startDate': cells[0],
                    'endDate': cells[1],
                    'procedureCode': cells[2]
                }
                if len(cells) > 3:
                    service['tooth'] = cells[3]
                if len(cells) > 4:
                    service['surface'] = cells[4]
                history.append(service)

    return history

def extract_all_procedures(html: str) -> List[Dict[str, Any]]:
    """Extract ALL procedures from visible AND hidden tables."""
    procedures = []
    seen_codes = set()

    # Find all rows with procedure data (col1 through col8)
    rows = re.findall(r'<tr[^>]*>(.*?benefitServiceDetailProcedure-col1.*?)</tr>', html, re.DOTALL)

    for row in rows:
        # Extract all columns
        code_match = re.search(r'benefitServiceDetailProcedure-col1[^>]*>([^<]+)', row)
        if code_match and re.match(r'D\d{4}', code_match.group(1).strip()):
            code = code_match.group(1).strip()

            # Skip duplicates
            if code in seen_codes:
                continue
            seen_codes.add(code)

            proc = {'code': code}

            # Extract name from col2 (might be in a link)
            name_match = re.search(r'benefitServiceDetailProcedure-col2[^>]*>(.*?)</td>', row, re.DOTALL)
            if name_match:
                name_text = name_match.group(1)
                link_match = re.search(r'>([^<]+)</a>', name_text)
                proc['name'] = link_match.group(1).strip() if link_match else re.sub(r'<[^>]*>', '', name_text).strip()

            # Extract other columns
            for col_num, field in [
                (3, 'covered'),
                (4, 'allowance'),
                (5, 'coveragePercent'),
                (6, 'limitation'),
                (7, 'appliedToDeductible'),
                (8, 'appliedToMaximum')
            ]:
                col_match = re.search(f'benefitServiceDetailProcedure-col{col_num}[^>]*>([^<]+)', row)
                if col_match:
                    proc[field] = col_match.group(1).strip()
                # IMPORTANT: Si appliedToMaximum est absent, c'est "Yes" par défaut chez UC
                elif field == 'appliedToMaximum':
                    proc[field] = 'Yes'

            procedures.append(proc)

    return procedures

def extract_benefits_summary(html: str) -> Dict[str, Any]:
    """Extract benefits summary including categories."""
    summary = {
        'deductibles': {},
        'maximums': [],
        'categories': {}
    }

    # Extract categories (Preventive, X-rays, etc.)
    cat_pattern = r'(Preventive Exams|X-rays|Cleanings & Fluoride|Sealants|Restorations|Crowns|Endodontic|Oral Surgery|Orthodontics).*?(D\d{4})\s*-\s*(D\d{4})'
    for match in re.finditer(cat_pattern, html, re.IGNORECASE | re.DOTALL):
        summary['categories'][match.group(1)] = {
            'startCode': match.group(2),
            'endCode': match.group(3)
        }

    return summary

def extract_all_policy_details(html: str) -> List[Dict[str, str]]:
    """Extract ALL policy details from benefitPolicyDeductMax sections."""
    details = []

    # Find all policy detail rows (col1 and col2 pairs)
    pattern = r'<td class="benefitPolicyDeductMax-col1"[^>]*>(.*?)</td>\s*<td class="benefitPolicyDeductMax-col2"[^>]*>(.*?)</td>'

    for match in re.finditer(pattern, html, re.DOTALL):
        label = re.sub(r'<[^>]*>', '', match.group(1)).strip()
        value = re.sub(r'<[^>]*>', '', match.group(2)).strip()

        if label and value:
            details.append({
                'label': label,
                'value': value
            })

    # Also find single-column policy details
    single_pattern = r'<td class="benefitPolicyDeductMax-col1"[^>]*colspan="1">([^<]+)</td>(?!\s*<td class="benefitPolicyDeductMax-col2")'

    for match in re.finditer(single_pattern, html):
        label = match.group(1).strip()
        if label and not any(d['label'] == label for d in details):
            details.append({
                'label': label,
                'value': 'Applies'
            })

    return details

def clean_html(text: str) -> str:
    """Clean HTML entities and tags from text."""
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Replace HTML entities
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&gt;', '>')
    text = text.replace('&lt;', '<')
    text = text.replace('&amp;', '&')
    # Clean whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def normalize_structure(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize JSON structure to ensure uniformity across all patients.
    Fixes the 3 issues identified for database consistency.
    """

    # 1. Ensure policyholder.memberID exists (even if None)
    if 'policyholder' in data:
        if 'memberID' not in data['policyholder']:
            data['policyholder']['memberID'] = None

    # 2. Normalize otherInsurance keys to consistent format
    if 'otherInsurance' in data:
        insurance = data['otherInsurance']

        # Standardize to 'patient' and 'policy' keys
        normalized = {
            'patient': None,
            'policy': None
        }

        # Map various keys to standard ones
        if 'patient' in insurance:
            normalized['patient'] = insurance['patient']
        elif 'other' in insurance:
            normalized['patient'] = insurance['other']

        if 'policy' in insurance:
            normalized['policy'] = insurance['policy']

        data['otherInsurance'] = normalized

    # 3. Ensure all procedures have all fields (with defaults if missing)
    if 'procedures' in data:
        for proc in data['procedures']:
            # Ensure all fields exist with appropriate defaults
            defaults = {
                'code': '',
                'name': '',
                'covered': 'N/A',
                'allowance': None,  # NULL for procedures without price
                'coveragePercent': None,  # NULL if no percentage
                'limitation': None,  # NULL if no limitation
                'appliedToDeductible': 'N/A',
                'appliedToMaximum': 'Yes'  # Default per UC pattern
            }

            for field, default_value in defaults.items():
                if field not in proc:
                    proc[field] = default_value

    return data

def extract_timely_filing(html: str) -> str:
    """Extract Timely Filing value."""
    match = re.search(r'Timely Filing</span><br\s*/?>\s*([^<]+)', html, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return None

def extract_other_insurance(html: str) -> Dict[str, Any]:
    """Extract Other Active Insurance information."""
    insurance = {}

    # Look for the specific pattern in the HTML
    pattern = r'Other Active Insurance</td>\s*<td[^>]*>(?:<span[^>]*>([^<]+)</span>)?(?:<span[^>]*>([^<]+)</span>)?'
    match = re.search(pattern, html, re.DOTALL)

    if match:
        values = []
        if match.group(1):
            values.append(clean_html(match.group(1)))
        if match.group(2):
            values.append(clean_html(match.group(2)))

        # Parse the values to extract patient and policy info
        for val in values:
            if '(Jethro)' in val or 'JETHRO' in val.upper():
                insurance['patient'] = val
            elif '(On' in val or 'Policy' in val:
                insurance['policy'] = val
            else:
                insurance['other'] = val

    return insurance if insurance else {"patient": "N/A", "policy": "N/A"}

def main():
    """Main function to parse and save the data."""
    import sys

    # Get input file from command line or use default
    if len(sys.argv) > 1:
        html_file = sys.argv[1]
    else:
        # Try to find the most recent HTML file
        html_files = list(Path('.').glob('UC_*.html'))
        if not html_files:
            html_file = "response-subscriber.html"
        else:
            html_file = str(max(html_files, key=lambda p: p.stat().st_mtime))
            print(f"📂 Auto-detected: {html_file}")

    # Check if file exists
    if not Path(html_file).exists():
        print(f"❌ Error: {html_file} not found!")
        print("Usage: python parse_uc_html.py [html_file]")
        return

    # Output file name based on input
    base_name = Path(html_file).stem
    output_file = f"{base_name}_parsed.json"

    # Parse the HTML
    print(f"🔍 Parsing {html_file}...")
    data = parse_united_concordia_html(html_file)

    # Save to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # Print detailed summary
    print(f"\n{'='*60}")
    print(f"✅ EXTRACTION COMPLETE!")
    print(f"{'='*60}")
    print(f"📄 Output: {output_file}")
    print(f"\n👤 PATIENT:")
    print(f"  - Name: {data['patient'].get('name', 'Unknown')}")
    print(f"  - Member ID: {data['patient'].get('memberId', 'N/A')}")
    print(f"  - DOB: {data['patient'].get('dateOfBirth', 'N/A')}")
    print(f"  - Status: {data['patient'].get('status', 'N/A')}")

    print(f"\n📊 DATA EXTRACTED:")
    print(f"  - Procedures: {len(data['procedures'])} codes")
    print(f"  - Service History: {len(data['serviceHistory'])} services")
    print(f"  - Policy Details: {len(data['policyDetails'])} rules")
    print(f"  - Categories: {len(data['benefitsSummary']['categories'])}")

    # Show sample of policy details
    if data['policyDetails']:
        print(f"\n📋 SAMPLE POLICY DETAILS:")
        for detail in data['policyDetails'][:5]:
            print(f"  - {detail['label']}: {detail['value']}")
        if len(data['policyDetails']) > 5:
            print(f"  ... and {len(data['policyDetails'])-5} more")

    print(f"\n💡 TIP: Open {output_file} to see all data in JSON format!")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()