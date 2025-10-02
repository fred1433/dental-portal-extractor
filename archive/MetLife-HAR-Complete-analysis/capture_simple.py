#!/usr/bin/env python3
"""
Script SIMPLE pour capturer TOUT dans un HAR
"""
import asyncio
from playwright.async_api import async_playwright
import time
from datetime import datetime

async def capture_har():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    har_file = f"metlife_TOTAL_{timestamp}.har"

    print("🚀 CAPTURE HAR METLIFE")
    print("="*60)
    print(f"📹 Capture dans: {har_file}")
    print("="*60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=[f'--save-har={har_file}', '--save-har-glob=**']
        )

        context = await browser.new_context()
        page = await context.new_page()

        # Aller au login
        await page.goto("https://dentalprovider.metlife.com/presignin")

        print("\n👤 LOGIN:")
        print("   Username: payorportal4771")
        print("   Password: Dental24!")
        print("\n🔍 PUIS NAVIGUER:")
        print("   1. Entrer ID: 635140654")
        print("   2. Cliquer sur AVERLY G TEDFORD")
        print("   3. Choisir un provider")
        print("   4. Cliquer sur 'Maximums & Deductibles'")
        print("   5. Cliquer sur 'Benefit Levels'")
        print("   6. Cliquer sur tous les autres onglets")
        print("\n⏱️ Le navigateur restera ouvert 5 MINUTES")
        print("   Naviguez sur TOUTES les pages importantes!")
        print("="*60)

        # Attendre 5 minutes
        for i in range(30):
            remaining = 300 - (i * 10)
            print(f"⏳ Temps restant: {remaining} secondes...", end='\r')
            await asyncio.sleep(10)

        print(f"\n\n✅ Capture terminée! Fichier: {har_file}")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(capture_har())