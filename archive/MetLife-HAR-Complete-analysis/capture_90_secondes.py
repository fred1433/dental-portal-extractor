#!/usr/bin/env python3
"""
Script qui capture pendant 90 SECONDES pour éviter le timeout de 2 minutes
"""
import asyncio
from playwright.async_api import async_playwright
from datetime import datetime

async def capture_rapide():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    har_file = f"metlife_HAR_{timestamp}.har"

    print("🚀 CAPTURE HAR RAPIDE (90 secondes)")
    print("="*60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)

        # ✅ LA BONNE MÉTHODE PLAYWRIGHT
        context = await browser.new_context(
            record_har_path=har_file,
            record_har_content='attach'
        )

        page = await context.new_page()
        await page.goto("https://dentalprovider.metlife.com/presignin")

        print("\n⚡ NAVIGATION RAPIDE:")
        print("1. LOGIN: payorportal4771 / Dental24!")
        print("2. ID: 635140654")
        print("3. Cliquer AVERLY G TEDFORD")
        print("4. Choisir provider")
        print("5. Cliquer 'Maximums & Deductibles'")
        print("6. Cliquer 'Benefit Levels'")
        print("\n⏱️ VOUS AVEZ 90 SECONDES - GO GO GO!")
        print("="*60)

        # Attendre SEULEMENT 90 secondes
        for i in range(9):
            remaining = 90 - (i * 10)
            print(f"⏳ {remaining} secondes...", end='\r')
            await asyncio.sleep(10)

        print("\n\n💾 Sauvegarde du HAR...")

        # FERMER PROPREMENT pour sauvegarder
        await context.close()
        await browser.close()

        print(f"✅ FICHIER CRÉÉ: {har_file}")
        return har_file

if __name__ == "__main__":
    har = asyncio.run(capture_rapide())
    print(f"\n🎯 Vérifier: ls -lah {har}")