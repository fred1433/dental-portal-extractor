"""
Ameritas Scraper avec Playwright
- Session persistence avec storageState
- Téléchargement automatique des 2 PDFs par patient
- Intégration avec ameritas_parser.py
"""

import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright, Page
from ameritas_parser import parse_ameritas_patient
from datetime import datetime
import os


class AmeritasScraper:
    def __init__(self, username=None, password=None, headless=False):
        self.username = username or os.getenv('AMERITAS_USERNAME', 'amuz@mil1')
        self.password = password or os.getenv('AMERITAS_PASSWORD', 'Changeme1!')
        self.headless = headless
        self.storage_state_path = Path(__file__).parent / 'ameritas_session.json'
        self.downloads_dir = Path(__file__).parent / 'downloads'
        self.downloads_dir.mkdir(exist_ok=True)

    async def save_session(self, context):
        """Sauvegarde cookies et localStorage pour réutilisation"""
        await context.storage_state(path=str(self.storage_state_path))
        print(f"✅ Session saved to {self.storage_state_path.name}")

    async def has_valid_session(self):
        """Vérifie si une session valide existe"""
        return self.storage_state_path.exists()

    async def login(self, page: Page):
        """Login Ameritas avec persistance de session"""

        print("\n🔐 Logging in to Ameritas...")

        # Go directly to protected page - Ameritas redirects to login if needed
        await page.goto('https://www.ameritas.com/wps/myportal/s000/Home/provider/application/findamember/')

        # Check if redirected to login
        if 'login' in page.url.lower():
            print("   Redirected to login page")

            # Wait for login form
            await page.wait_for_selector('input#ontUser, input[name="ontUser"]', timeout=10000)

            # Fill credentials
            print(f"   Username: {self.username}")
            await page.fill('input#ontUser, input[name="ontUser"]', self.username)
            await page.fill('input#ontPassword, input[name="ontPassword"]', self.password)
            await page.click('input#Submit, button[type="submit"]')

            # Wait for OTP page or location selection
            try:
                await page.wait_for_selector('input[name="verify"]', timeout=5000)
                print("\n⚠️  OTP Required!")
                print("   Enter OTP code in browser, check 'Remember device for 30 days', click Next")
                print("   Waiting for you to complete OTP...")

                # Wait for location page
                await page.wait_for_selector('text=Find a Location', timeout=120000)
                print("✅ OTP completed")

            except:
                # No OTP or already on location page
                pass

        else:
            # Already logged in
            print("✅ Already logged in (session active)")

        print("✅ Login successful")

    async def select_location(self, page: Page, location_text=None):
        """Sélectionne une clinique depuis la liste"""

        print("\n📍 Selecting location...")

        # Wait for location page
        await page.wait_for_selector('text=Find a Location', timeout=10000)

        # Select first location or specific one
        if location_text:
            await page.get_by_role("link", name=location_text).click()
        else:
            # Click first location
            await page.get_by_role("link", name="MATLOCK RD STE 208").click()

        await page.wait_for_load_state('networkidle')
        print("✅ Location selected")

    async def search_member(self, page: Page, member_id: str, last_name: str):
        """Recherche un membre par ID et nom"""

        print(f"\n🔍 Searching member: {member_id} / {last_name}")

        # Navigate to Find A Member
        await page.get_by_role("link", name="Find A Member").click()
        await page.wait_for_selector('text=Member Search')

        # Fill search form
        await page.get_by_role("textbox", name="Member ID #").fill(member_id)
        await page.get_by_role("textbox", name="Member's Last Name").fill(last_name)
        await page.get_by_role("button", name="Submit").click()

        # Wait for results
        await page.wait_for_selector('text=The member we have identified', timeout=10000)

        print("✅ Member found")

    async def download_benefit_summary(self, page: Page, patient_name: str):
        """Télécharge BenefitSummary.pdf (gros PDF 6 pages)"""

        print(f"\n📄 Downloading BenefitSummary for {patient_name}...")

        # Click Benefits Summary
        await page.get_by_role("link", name="Benefits Summary Benefits").click()

        # Download PDF
        async with page.expect_download() as download_info:
            await page.get_by_role("link", name="benefits summary").click()

        download = await download_info.value
        filename = f'BenefitSummary-{patient_name.replace(",", "-").replace(" ", "-")}.pdf'
        filepath = self.downloads_dir / filename
        await download.save_as(filepath)

        print(f"   ✅ Saved: {filename}")

        # Go back to search results
        await page.go_back()
        await page.go_back()

        return filepath

    async def get_family_list(self, page: Page):
        """Extrait la liste des patients de la famille"""

        print("\n👨‍👩‍👧‍👦 Getting family members...")

        # Click Patient Details
        await page.get_by_role("link", name="Patient Details Patient").click()
        await page.wait_for_selector('table.tablePatientInfo')

        # Extract family from table
        rows = await page.query_selector_all('table.tablePatientInfo tbody tr')

        family = []
        for row in rows:
            name = await (await row.query_selector('td:nth-child(1) span')).inner_text()
            dob = await (await row.query_selector('td:nth-child(2) span')).inner_text()

            family.append({'name': name, 'dob': dob})

        print(f"✅ Found {len(family)} family members:")
        for p in family:
            print(f"   - {p['name']} (DOB: {p['dob']})")

        return family

    async def download_patient_details(self, page: Page, patient_name: str, patient_dob: str):
        """Télécharge PatientDetails.pdf pour un patient spécifique"""

        print(f"\n📄 Downloading PatientDetails for {patient_name}...")

        # Use CodeGen selector - row name includes "NAME DOB View"
        row_selector = f"{patient_name} {patient_dob} View"

        async with page.expect_download() as download_info:
            await page.get_by_role("row", name=row_selector).get_by_role("link").click()

        download = await download_info.value
        filename = f'PatientDetails-{patient_name.replace(",", "-").replace(" ", "-")}.pdf'
        filepath = self.downloads_dir / filename
        await download.save_as(filepath)

        print(f"   ✅ Saved: {filename}")

        # Go back to family list
        await page.go_back()
        await page.wait_for_selector('table.tablePatientInfo')

        return filepath

    async def scrape_subscriber(self, member_id: str, last_name: str, first_name: str = None, location=None):
        """
        Scrape SEULEMENT le subscriber (pas toute la famille)

        Args:
            member_id: Subscriber ID (9 digits)
            last_name: Nom de famille du subscriber
            first_name: Prénom du subscriber (optionnel, pour trouver dans la liste)
            location: Nom de la clinique (optionnel)

        Returns:
            dict: Données du subscriber avec PDFs parsés
        """

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.headless)

            # Try to load existing session
            if await self.has_valid_session():
                print(f"\n📂 Loading existing session...")
                context = await browser.new_context(storage_state=str(self.storage_state_path))
                page = await context.new_page()

                # Test if session is valid
                await page.goto('https://www.ameritas.com/wps/myportal/s000/Home/provider/application/findamember/')

                try:
                    await page.wait_for_selector('text=Find A Member', timeout=5000)
                    print("✅ Session still valid")
                except:
                    print("⚠️  Session expired, re-login required")
                    await context.close()
                    context = await browser.new_context()
                    page = await context.new_page()
                    await self.login(page)
                    await self.select_location(page, location)
                    await self.save_session(context)
            else:
                # New login
                context = await browser.new_context()
                page = await context.new_page()
                await self.login(page)
                await self.select_location(page, location)
                await self.save_session(context)

            # Search member
            await self.search_member(page, member_id, last_name)

            # Download BenefitSummary (subscriber)
            subscriber_name = f"{last_name.upper()},{first_name.upper()}" if first_name else last_name.upper()
            benefit_summary_pdf = await self.download_benefit_summary(page, subscriber_name)

            # Get family list to find exact subscriber name
            family = await self.get_family_list(page)

            # Find subscriber in family list
            subscriber = None
            for member in family:
                # Le subscriber est généralement le premier ou celui qui match le member_id
                if first_name and first_name.upper() in member['name']:
                    subscriber = member
                    break
                elif not subscriber:
                    # Prendre le premier par défaut
                    subscriber = family[0]

            print(f"\n👤 Subscriber identified: {subscriber['name']} (DOB: {subscriber['dob']})")

            # Download PatientDetails for subscriber (passe le DOB)
            patient_details_pdf = await self.download_patient_details(page, subscriber['name'], subscriber['dob'])

            # Parse les 2 PDFs avec LLM
            print(f"\n🤖 Parsing PDFs with OpenAI GPT-4o-mini...")

            parsed_data = parse_ameritas_patient(
                str(patient_details_pdf),
                str(benefit_summary_pdf)
            )

            await browser.close()

            result = {
                'subscriber_id': member_id,
                'subscriber_name': subscriber['name'],
                'subscriber_dob': subscriber['dob'],
                'scrape_date': datetime.now().isoformat(),
                'pdfs': {
                    'patient_details': str(patient_details_pdf),
                    'benefit_summary': str(benefit_summary_pdf)
                },
                'parsed_data': parsed_data
            }

            return result


async def main():
    """Test du scraper complet"""

    scraper = AmeritasScraper(headless=False)

    # Scrape SEULEMENT Blake SCALLAN (subscriber)
    result = await scraper.scrape_subscriber(
        member_id='017622557',
        last_name='SCALLAN',
        first_name='BLAKE'
    )

    # Save result
    output_file = Path(__file__).parent / 'test_results' / 'SCALLAN-BLAKE-complete.json'
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)

    print("\n" + "="*60)
    print("SCRAPING COMPLETE")
    print("="*60)
    print(f"✅ Subscriber: {result['subscriber_name']}")
    print(f"✅ Result saved to {output_file.name}")


if __name__ == "__main__":
    asyncio.run(main())
