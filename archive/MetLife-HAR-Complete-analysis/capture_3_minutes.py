#!/usr/bin/env python3
"""
Script qui capture pendant 3 MINUTES avec sauvegarde intermédiaire
"""
import asyncio
from playwright.async_api import async_playwright
from datetime import datetime

async def capture_complete():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    har_file = f"metlife_FULL_{timestamp}.har"

    print("🚀 CAPTURE HAR COMPLÈTE (3 minutes)")
    print("="*60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)

        # ✅ BONNE MÉTHODE PLAYWRIGHT
        context = await browser.new_context(
            record_har_path=har_file,
            record_har_content='attach',
            record_har_omit_content=False  # Capturer TOUT le contenu
        )

        page = await context.new_page()
        await page.goto("https://dentalprovider.metlife.com/presignin")

        print("\n📋 NAVIGATION COMPLÈTE:")
        print("1. LOGIN: payorportal4771 / Dental24!")
        print("2. ID: 635140654 → TEDFORD")
        print("3. Cliquer AVERLY G TEDFORD")
        print("4. Choisir un provider")
        print("5. ⚠️ IMPORTANT: Cliquer 'Maximums & Deductibles'")
        print("6. ⚠️ IMPORTANT: Cliquer 'Benefit Levels'")
        print("\n⏱️ VOUS AVEZ 3 MINUTES")
        print("="*60)

        # 3 minutes = 180 secondes
        for i in range(18):
            remaining = 180 - (i * 10)
            mins = remaining // 60
            secs = remaining % 60
            print(f"⏳ {mins}:{secs:02d} restantes", end='\r')

            # Sauvegarder périodiquement (toutes les 30 secondes)
            if i % 3 == 0 and i > 0:
                await context.close()
                context = await browser.new_context(
                    record_har_path=har_file,
                    record_har_content='attach',
                    record_har_mode='update'  # Mode mise à jour
                )
                page = context.pages[0] if context.pages else await context.new_page()

            await asyncio.sleep(10)

        print("\n\n💾 Sauvegarde finale...")
        await context.close()
        await browser.close()

        print(f"✅ FICHIER CRÉÉ: {har_file}")
        return har_file

if __name__ == "__main__":
    har = asyncio.run(capture_complete())
    print(f"\n🎯 Pour analyser: python analyze_har.py {har}")