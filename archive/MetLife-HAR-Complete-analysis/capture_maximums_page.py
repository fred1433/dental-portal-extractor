#!/usr/bin/env python3
"""
Script pour capturer la page Maximums & Deductibles avec $196
"""
import asyncio
from playwright.async_api import async_playwright

async def capture_maximums_page():
    print("🎯 CAPTURE: Page Maximums & Deductibles")
    print("="*60)

    async with async_playwright() as p:
        # Lancer avec save-har pour TOUT capturer
        browser = await p.chromium.launch(
            headless=False,
            # IMPORTANT: Sauvegarder le HAR
            args=['--save-har=metlife_maximums_complete.har']
        )

        # Utiliser la session existante
        context = await browser.new_context(storage_state="metlife_session_hybrid.json")
        page = await context.new_page()

        print("\n📋 ÉTAPES À SUIVRE:")
        print("1. Aller sur PesSignIn")
        print("2. Entrer: 635140654")
        print("3. Si demandé, entrer: TEDFORD")
        print("4. Cliquer sur un membre (ex: AVERLY G TEDFORD)")
        print("5. Sélectionner un provider")
        print("6. IMPORTANT: Cliquer sur 'Maximums & Deductibles'")

        await page.goto("https://metdental.metlife.com/prov/execute/PesSignIn")

        print("\n⏳ Navigation manuelle...")
        print("Naviguez jusqu'à voir:")
        print("  • Maximum Used to Date: $196")
        print("  • Up to age 26")
        print("  • Plan Maximum: $4000")

        input("\n✋ Appuyez sur Entrée quand vous voyez ces données...")

        # Capturer l'URL finale
        final_url = page.url
        print(f"\n📍 URL de la page: {final_url}")

        # Sauvegarder le contenu
        content = await page.content()
        with open('maximums_deductibles.html', 'w') as f:
            f.write(content)
        print("💾 Page sauvegardée: maximums_deductibles.html")

        # Vérifier les données
        if '$196' in content and 'Maximum Used to Date' in content:
            print("✅ TROUVÉ: Maximum Used to Date $196!")

        if 'Up to age 26' in content:
            print("✅ TROUVÉ: Up to age 26!")

        if '$4000' in content:
            print("✅ TROUVÉ: Plan Maximum $4000!")

        await browser.close()

        print("\n🎉 Capture terminée!")
        print("Fichiers créés:")
        print("  • metlife_maximums_complete.har")
        print("  • maximums_deductibles.html")

if __name__ == "__main__":
    asyncio.run(capture_maximums_page())