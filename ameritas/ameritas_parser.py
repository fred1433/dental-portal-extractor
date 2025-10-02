"""
Ameritas PDF Parser Complet
Parse PatientDetails (1 page) et BenefitSummary (6 pages) avec OpenAI GPT-4o-mini

Usage:
    python ameritas_parser.py patient_details.pdf benefit_summary.pdf

    Ou directement en Python:
    from ameritas_parser import parse_ameritas_patient
    data = parse_ameritas_patient('patient_details.pdf', 'benefit_summary.pdf')
"""

import os
import json
import pdfplumber
from openai import OpenAI
from pathlib import Path
from dotenv import load_dotenv
import sys

# Charger variables d'environnement
load_dotenv(Path(__file__).parent.parent / '.env')


def extract_pdf_text(pdf_path):
    """Extrait le texte complet d'un PDF (toutes pages)"""
    with pdfplumber.open(pdf_path) as pdf:
        text = ""
        for page in pdf.pages:
            text += page.extract_text() + "\n"
    return text


def parse_patient_details(pdf_path):
    """Parse PatientDetails PDF (1 page) - Next eligible dates et remainings"""

    text = extract_pdf_text(pdf_path)
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

    prompt = f"""Extract dental eligibility data from this PatientDetails PDF and return ONLY valid JSON with this structure:

{{
  "patient_name": "string",
  "current_as_of": "YYYY-MM-DD",
  "plan_number": "string",
  "benefit_types": {{
    "type_1_preventive": "string (percentage or MAB/MCE)",
    "type_2_basic": "string (percentage or MAB/MCE)",
    "type_3_major": "string (percentage or MAB/MCE)"
  }},
  "deductible": {{
    "type": "string (per visit or per year)",
    "amount_per_period": float,
    "remaining": float,
    "family_maximum": float or null
  }},
  "maximum": {{
    "annual": float,
    "carryover": float or null,
    "remaining": float
  }},
  "orthodontics": {{
    "benefits_percentage": int or null,
    "deductible": "string or null",
    "lifetime_maximum": float or null,
    "remaining": float or null
  }},
  "next_eligible": {{
    "routine_exam": "YYYY-MM-DD or 'Not Covered'",
    "comprehensive_exam": "YYYY-MM-DD or 'Not Covered'",
    "periapicals": "YYYY-MM-DD or 'Not Covered'",
    "bitewings": "YYYY-MM-DD or 'Not Covered'",
    "fullmouth": "YYYY-MM-DD or 'Not Covered'",
    "prophylaxis_cleanings": "YYYY-MM-DD or 'Not Covered'",
    "fluoride": "YYYY-MM-DD or 'Not Covered'",
    "sealant": "YYYY-MM-DD or 'Not Covered'",
    "periodontal_maintenance": "YYYY-MM-DD or 'Not Covered'",
    "root_planing_scaling": {{
      "top_right": "YYYY-MM-DD or null",
      "top_left": "YYYY-MM-DD or null",
      "lower_right": "YYYY-MM-DD or null",
      "lower_left": "YYYY-MM-DD or null"
    }}
  }}
}}

RULES:
- Convert dates from MM/DD/YYYY to YYYY-MM-DD
- Extract numbers without $ or commas
- Use null for missing data
- Return ONLY JSON

PDF TEXT:
{text}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0
    )

    return json.loads(response.choices[0].message.content)


def parse_benefit_summary(pdf_path):
    """Parse BenefitSummary PDF (6 pages) - Plan complet et procédures détaillées"""

    text = extract_pdf_text(pdf_path)
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

    prompt = f"""Extract complete dental benefit information from this 6-page PDF and return JSON with:

{{
  "plan_member": "string",
  "plan_number": "string",
  "plan_sponsor": "string",
  "effective_date": "YYYY-MM-DD",
  "coverage_status": "string",
  "benefit_types": {{
    "type_1": {{"percentage": "string", "description": "string"}},
    "type_2": {{"percentage": "string", "description": "string"}},
    "type_3": {{"percentage": "string", "description": "string"}}
  }},
  "deductible": {{
    "amount": float,
    "type": "string",
    "family_max": float or null
  }},
  "maximum_annual_benefit": float,
  "carryover": {{
    "benefit_threshold": float or null,
    "carryover_amount": float or null,
    "ppo_bonus": float or null,
    "max_accumulation": float or null
  }},
  "orthodontics": {{
    "benefit_percentage": "string or null",
    "deductible": "string",
    "lifetime_maximum": float or null,
    "age_restrictions": "string or null"
  }},
  "procedures": [
    {{
      "category": "string",
      "procedure_codes": "string",
      "service_name": "string",
      "benefit_type": "string",
      "frequency": "string",
      "additional_info": "string"
    }}
  ]
}}

RULES:
- Extract ALL procedures from pages 3-6
- Convert dates to YYYY-MM-DD
- Use null for missing data
- Return ONLY JSON

PDF TEXT:
{text}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0
    )

    return json.loads(response.choices[0].message.content)


def parse_ameritas_patient(patient_details_pdf, benefit_summary_pdf):
    """
    Parse complet d'un patient Ameritas (2 PDFs)

    Args:
        patient_details_pdf: Chemin vers PatientDetails.pdf (1 page)
        benefit_summary_pdf: Chemin vers BenefitSummary.pdf (6 pages)

    Returns:
        dict: Données combinées du patient
    """

    print(f"\n{'='*60}")
    print(f"Parsing Ameritas Patient")
    print(f"{'='*60}")

    # Parse PatientDetails
    print(f"\n1. Parsing PatientDetails...")
    patient_details = parse_patient_details(patient_details_pdf)
    print(f"   ✅ Patient: {patient_details['patient_name']}")
    print(f"   ✅ Remaining deductible: ${patient_details['deductible']['remaining']}")
    print(f"   ✅ Remaining maximum: ${patient_details['maximum']['remaining']}")

    # Parse BenefitSummary
    print(f"\n2. Parsing BenefitSummary...")
    benefit_summary = parse_benefit_summary(benefit_summary_pdf)
    print(f"   ✅ Plan: {benefit_summary['plan_number']}")
    print(f"   ✅ Procedures extracted: {len(benefit_summary['procedures'])}")

    # Combine
    result = {
        "patient_details": patient_details,
        "benefit_summary": benefit_summary
    }

    return result


def main():
    """Test avec les 2 patients"""

    base_dir = Path(__file__).parent

    # Test 1: SCALLAN-BLAKE
    print("\n" + "="*60)
    print("TEST 1: SCALLAN-BLAKE")
    print("="*60)

    scallan_data = parse_ameritas_patient(
        base_dir / "test_pdfs/PatientDetails-SCALLAN-BLAKE.pdf",
        base_dir / "test_pdfs/BenefitSummary-SCALLAN-BLAKE.pdf"
    )

    output1 = base_dir / "test_results/SCALLAN-BLAKE-complete.json"
    with open(output1, 'w') as f:
        json.dump(scallan_data, f, indent=2)
    print(f"\n✅ Saved to {output1.name}")

    # Test 2: WATSON-RANDALL
    print("\n" + "="*60)
    print("TEST 2: WATSON-RANDALL")
    print("="*60)

    watson_data = parse_ameritas_patient(
        base_dir / "test_pdfs/PatientDetails-Randall-Watson.pdf",
        base_dir / "test_pdfs/BenefitSummary-Randall-Watson.pdf"
    )

    output2 = base_dir / "test_results/WATSON-RANDALL-complete.json"
    with open(output2, 'w') as f:
        json.dump(watson_data, f, indent=2)
    print(f"\n✅ Saved to {output2.name}")

    # Validation
    print("\n" + "="*60)
    print("VALIDATION")
    print("="*60)

    keys1 = set(scallan_data.keys())
    keys2 = set(watson_data.keys())

    if keys1 == keys2:
        print("✅ Structure identique entre les 2 patients")
    else:
        print("⚠️  Structures différentes")

    print(f"\nPatient 1: {scallan_data['patient_details']['patient_name']}")
    print(f"  - Deductible remaining: ${scallan_data['patient_details']['deductible']['remaining']}")
    print(f"  - Maximum remaining: ${scallan_data['patient_details']['maximum']['remaining']}")
    print(f"  - Procedures: {len(scallan_data['benefit_summary']['procedures'])}")

    print(f"\nPatient 2: {watson_data['patient_details']['patient_name']}")
    print(f"  - Deductible remaining: ${watson_data['patient_details']['deductible']['remaining']}")
    print(f"  - Maximum remaining: ${watson_data['patient_details']['maximum']['remaining']}")
    print(f"  - Procedures: {len(watson_data['benefit_summary']['procedures'])}")


if __name__ == "__main__":
    if len(sys.argv) == 3:
        # Usage CLI: python ameritas_parser.py patient.pdf benefit.pdf
        result = parse_ameritas_patient(sys.argv[1], sys.argv[2])
        print(json.dumps(result, indent=2))
    else:
        # Test avec nos fichiers de test
        main()
