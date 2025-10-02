#!/usr/bin/env python3
"""
United Concordia Scraper - FINAL VERSION
With exact selectors from Codegen + price waiting + session persistence
"""

import re
import json
import asyncio
from pathlib import Path
from datetime import datetime
from playwright.async_api import async_playwright

# Configuration
SESSION_FILE = Path(".uc-session/auth.json")
SESSION_FILE.parent.mkdir(exist_ok=True)

# Credentials (from Codegen)
USERNAME = "BPKPortalAccess4771"
PASSWORD = "SmileyTooth4771!"


class UCScraperFinal:
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None

    async def setup(self, headless=False):
        """Setup browser with or without existing session"""
        print("🚀 Starting United Concordia Scraper...")

        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=headless,
            args=['--disable-blink-features=AutomationControlled']
        )

        # Try to reuse session if it exists
        if SESSION_FILE.exists():
            print("💾 Found existing session, attempting to reuse...")
            try:
                self.context = await self.browser.new_context(
                    storage_state=str(SESSION_FILE)
                )
                self.page = await self.context.new_page()

                # Test if session is valid by going to subscriber page
                await self.page.goto("https://www.unitedconcordia.com/tuctpi/subscriber.xhtml")
                await self.page.wait_for_load_state('networkidle', timeout=10000)

                # Check if we can see the search form
                if await self.page.locator('text="Member ID"').count() > 0:
                    print("✅ Session is valid! Ready to search.")
                    return True
                else:
                    print("⚠️ Session expired, need to login again")

            except Exception as e:
                print(f"⚠️ Could not restore session: {e}")

        # Create new context and login
        print("🆕 Creating new session...")
        self.context = await self.browser.new_context()
        self.page = await self.context.new_page()
        await self.login()
        return False

    async def login(self):
        """Login using credentials from Codegen"""
        print("🔐 Logging in...")

        # Navigate to login page
        await self.page.goto("https://auth.unitedconcordia.com/")

        # Fill username
        await self.page.get_by_role("textbox", name="Username").click()
        await self.page.get_by_role("textbox", name="Username").fill(USERNAME)

        # Fill password
        await self.page.get_by_role("textbox", name="Password").click()
        await self.page.get_by_role("textbox", name="Password").fill(PASSWORD)

        # Click login
        await self.page.get_by_role("button", name="Log in").click()

        # Wait for redirect to main page
        await self.page.wait_for_url("**/tuctpi/**", timeout=30000)
        print("✅ Login successful!")

        # Save session
        await self.save_session()

    async def save_session(self):
        """Save session for reuse"""
        await self.context.storage_state(path=str(SESSION_FILE))
        print(f"💾 Session saved to {SESSION_FILE}")

    async def search_patient(self, member_id: str, dob: str):
        """Search for a patient using exact selectors from Codegen"""
        print(f"\n🔍 Searching for patient: {member_id} (DOB: {dob})")

        # Make sure we're on subscriber page
        if "subscriber.xhtml" not in self.page.url:
            await self.page.goto("https://www.unitedconcordia.com/tuctpi/subscriber.xhtml")
            await self.page.wait_for_load_state('networkidle')

        # Fill Member ID
        await self.page.get_by_role("textbox", name="Member ID").click()
        await self.page.get_by_role("textbox", name="Member ID").fill(member_id)

        # Fill Date of Birth
        await self.page.get_by_role("textbox", name="Date of Birth").click()
        await self.page.get_by_role("textbox", name="Date of Birth").fill(dob)

        # Click Search
        await self.page.get_by_role("button", name="Search").click()

        # Wait for page to load
        print("⏳ Waiting for results...")
        await self.page.wait_for_load_state('networkidle')

    async def expand_accordions(self):
        """Click all accordion sections to reveal hidden prices"""
        print("🔽 Expanding accordion sections...")

        try:
            # Find all collapsed accordion sections (with plus icon)
            plus_icons = await self.page.locator('span.glyphicon.glyphicon-plus').all()

            if not plus_icons:
                print("   No accordion sections found to expand")
                return 0

            print(f"   Found {len(plus_icons)} accordion sections to expand")

            # Click each accordion to expand it
            for i, icon in enumerate(plus_icons, 1):
                try:
                    # Click the parent element (usually the clickable area)
                    parent = icon.locator('..')
                    await parent.click()
                    print(f"   ✓ Expanded section {i}/{len(plus_icons)}")

                    # Small wait for expansion animation
                    await self.page.wait_for_timeout(100)

                except Exception as e:
                    print(f"   ⚠️ Could not expand section {i}: {e}")

            # Wait a bit for all sections to fully load
            await self.page.wait_for_timeout(500)

            return len(plus_icons)

        except Exception as e:
            print(f"⚠️ Error expanding accordions: {e}")
            return 0

    async def wait_for_prices(self, timeout=5000):
        """Wait for prices to appear in the page"""
        print("💰 Waiting for prices to load...")

        try:
            # Wait for at least one element with a dollar sign
            await self.page.wait_for_selector(
                'td:has-text("$")',
                timeout=timeout
            )

            # Extra wait to ensure all prices are loaded
            await self.page.wait_for_timeout(500)

            # Count how many prices we found
            price_elements = await self.page.locator('td:has-text("$")').all()
            print(f"✅ Found {len(price_elements)} price elements on page")

            return True

        except Exception as e:
            print(f"⚠️ No prices found after {timeout/1000} seconds")
            print("   Continuing anyway to capture what we have...")
            return False

    async def capture_html(self, member_id: str):
        """Capture the complete HTML"""
        print("📸 Capturing HTML...")

        # Get the full HTML
        html = await self.page.content()

        # Count prices in HTML
        price_count = len(re.findall(r'\$[\d,]+\.\d{2}', html))
        print(f"📊 Found {price_count} prices in HTML")

        # Save HTML with timestamp and price count
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"UC_{member_id}_{timestamp}_{price_count}prices.html"
        filepath = Path(filename)

        filepath.write_text(html, encoding='utf-8')
        print(f"💾 Saved: {filename} ({len(html):,} bytes)")

        return filepath, price_count

    async def parse_html(self, filepath: Path):
        """Parse the HTML using our existing parser"""
        try:
            # Import the enhanced parser with missing fields
            from parse_uc_html_enhanced import parse_united_concordia_html

            print(f"🔍 Parsing {filepath.name}...")
            data = parse_united_concordia_html(str(filepath))

            # Save as JSON
            json_path = filepath.with_suffix('.json')
            with open(json_path, 'w') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            # Count what we extracted
            procedures = len(data.get('procedures', []))
            prices_with_amount = sum(1 for p in data.get('procedures', [])
                                    if p.get('allowance', '').startswith('$'))

            print(f"✅ Parsed successfully:")
            print(f"   - {procedures} total procedures")
            print(f"   - {prices_with_amount} with prices")
            print(f"   - Saved to: {json_path.name}")

            return data

        except ImportError:
            print("⚠️ Parser not found, skipping parsing")
            return None
        except Exception as e:
            print(f"❌ Parsing failed: {e}")
            return None

    async def scrape_patient(self, member_id: str, dob: str):
        """Complete workflow for one patient"""
        result = {'member_id': member_id, 'dob': dob}

        try:
            # Search for patient
            await self.search_patient(member_id, dob)

            # Expand accordion sections to reveal hidden prices
            expanded_count = await self.expand_accordions()
            result['expanded_sections'] = expanded_count

            # Wait for prices to load
            prices_loaded = await self.wait_for_prices()

            # Capture HTML regardless
            filepath, price_count = await self.capture_html(member_id)
            result['html_file'] = str(filepath)
            result['price_count'] = price_count
            result['prices_loaded'] = prices_loaded

            # Parse the HTML
            data = await self.parse_html(filepath)
            if data:
                result['data'] = data
                result['success'] = True
            else:
                result['success'] = False
                result['error'] = "Parsing failed"

        except Exception as e:
            result['success'] = False
            result['error'] = str(e)
            print(f"❌ Error: {e}")

        return result

    async def scrape_multiple(self, patients: list):
        """Scrape multiple patients"""
        results = []

        for i, patient in enumerate(patients, 1):
            print(f"\n{'='*60}")
            print(f"📋 Patient {i}/{len(patients)}")
            print(f"{'='*60}")

            result = await self.scrape_patient(
                patient['member_id'],
                patient['dob']
            )
            results.append(result)

            # Wait between patients to avoid rate limiting
            if i < len(patients):
                wait_time = 2
                print(f"⏱️  Waiting {wait_time}s before next patient...")
                await self.page.wait_for_timeout(wait_time * 1000)

        return results

    async def cleanup(self):
        """Close everything"""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()


async def main():
    """Main entry point"""
    # Test patients
    patients = [
        {'member_id': '140124536001', 'dob': '11/02/2020'},  # Jethro
        {'member_id': '00288990100', 'dob': '12/26/2018'},   # Hunter
    ]

    scraper = UCScraperFinal()

    try:
        # Setup (will reuse session if valid)
        await scraper.setup(headless=False)  # Set to True for production

        # Scrape all patients
        results = await scraper.scrape_multiple(patients)

        # Print summary
        print("\n" + "="*60)
        print("📊 FINAL SUMMARY")
        print("="*60)

        for r in results:
            member_id = r.get('member_id', 'Unknown')
            if r.get('success'):
                prices = r.get('price_count', 0)
                print(f"✅ {member_id}: {prices} prices captured")
                if r.get('html_file'):
                    print(f"   📄 {r['html_file']}")
            else:
                error = r.get('error', 'Unknown error')
                print(f"❌ {member_id}: {error}")

        print("\n✨ Scraping complete!")

    except Exception as e:
        print(f"❌ Fatal error: {e}")

    finally:
        await scraper.cleanup()


if __name__ == "__main__":
    print("🦷 United Concordia Scraper - FINAL VERSION")
    print("="*60)
    asyncio.run(main())