#!/usr/bin/env python3
"""
Export insurance verification form to PDF using Playwright.

This script loads the verification form in a headless browser,
injects patient data, and exports it as a PDF with screen media settings.
"""

import sys
import json
import os
from playwright.sync_api import sync_playwright


def export_pdf(file_name, api_key, server_url='http://localhost:3001'):
    """
    Export insurance verification form to PDF.

    Args:
        file_name: Patient fileName (e.g., "12345_JOHN_DOE_DDINS.json")
        api_key: API key for authentication
        server_url: Base URL of the Express server

    Returns:
        Path to the generated PDF file
    """

    # Read patient data from stdin (sent by Express endpoint)
    patient_data_json = sys.stdin.read()

    if not patient_data_json:
        raise ValueError('No patient data received on stdin')

    patient_data = json.loads(patient_data_json)

    with sync_playwright() as p:
        # Launch Chromium in headless mode
        browser = p.chromium.launch(headless=True)

        # Create context with appropriate viewport
        context = browser.new_context(
            viewport={'width': 1400, 'height': 2000},
            device_scale_factor=1
        )

        page = context.new_page()

        # Navigate to form first to establish domain for sessionStorage
        form_url = f'{server_url}/ace-verification-form.html?key={api_key}'
        page.goto(form_url, wait_until='domcontentloaded')

        # Inject patient data into sessionStorage
        # Double-stringify to match the format used in server.js:1041
        page.evaluate(f'''
            sessionStorage.setItem('extractedPatientData', {json.dumps(json.dumps(patient_data))});
        ''')

        # Reload with autoFill parameter to trigger form population
        page.goto(f'{form_url}&autoFill=true', wait_until='networkidle')

        # Wait for form to be populated (wait for at least one field-filled element)
        try:
            page.wait_for_selector('.field-filled', timeout=5000)
        except Exception:
            # If no fields are filled, continue anyway (empty form scenario)
            print('Warning: No filled fields detected', file=sys.stderr)

        # Hide chat widget and export button before export
        page.evaluate('''
            const chatWidget = document.querySelector('#chatWidget');
            if (chatWidget) {
                chatWidget.style.display = 'none';
            }

            const exportBtn = document.querySelector('#exportPdfBtn');
            if (exportBtn && exportBtn.parentElement) {
                exportBtn.parentElement.style.display = 'none';
            }
        ''')

        # Generate output path
        safe_filename = file_name.replace('.json', '.pdf').replace('/', '_')
        output_path = f'/tmp/{safe_filename}'

        # Ensure /tmp directory exists (should always exist on Unix systems)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # Generate PDF with screen media (preserves screen layout)
        page.emulate_media(media='screen')

        # Try to fit on one page with aggressive scaling
        page.pdf(
            path=output_path,
            format='Letter',  # 8.5 x 11 inches
            print_background=True,  # Include backgrounds and colors
            scale=0.62,  # Aggressive scale down to fit on one page
            margin={
                'top': '0.2in',
                'right': '0.2in',
                'bottom': '0.2in',
                'left': '0.2in'
            }
        )

        browser.close()

        # Output the PDF path to stdout (Express will read this)
        print(output_path)
        return output_path


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: python3 export_pdf.py <fileName> <apiKey> [serverUrl]', file=sys.stderr)
        sys.exit(1)

    file_name = sys.argv[1]
    api_key = sys.argv[2]
    server_url = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:3001'

    try:
        pdf_path = export_pdf(file_name, api_key, server_url)
        sys.exit(0)
    except Exception as e:
        print(f'Error generating PDF: {e}', file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
