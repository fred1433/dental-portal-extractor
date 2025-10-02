#!/usr/bin/env python3
"""
Script pour capturer le flux COMPLET incluant les données d'éligibilité
"""
import asyncio
from playwright.async_api import async_playwright

async def capture_full_eligibility_flow():
    print("🎯 CAPTURE COMPLÈTE DU FLUX D'ÉLIGIBILITÉ")
    print("="*60)

    async with async_playwright() as p:
        # Lancer avec HAR pour tout capturer
        browser = await p.chromium.launch(
            headless=False,
            args=['--save-har=metlife_complete_flow.har']
        )

        context = await browser.new_context(storage_state="metlife_session_hybrid.json")
        page = await context.new_page()

        print("\n📋 FLUX À SUIVRE:")
        print("1. Aller sur PesSignIn")
        print("2. Entrer subscriber ID: 635140654")
        print("3. Si demande nom → entrer: TEDFORD")
        print("4. Sur la liste des membres → CLIQUER SUR UN MEMBRE")
        print("5. Choisir le provider (ex: CHOU)")
        print("6. CAPTURER LA PAGE D'ÉLIGIBILITÉ FINALE")

        # Navigation automatique jusqu'au point connu
        await page.goto("https://metdental.metlife.com/prov/execute/PesSignIn")
        await page.wait_for_timeout(2000)

        print("\n⏸️ NAVIGATION MANUELLE REQUISE:")
        print("1. Entrez l'ID: 635140654")
        print("2. Si demandé, entrez: TEDFORD")
        print("3. ⚠️ IMPORTANT: CLIQUEZ sur un membre spécifique (ex: KENNETH R TEDFORD)")
        print("4. Sélectionnez le provider")
        print("5. Une fois sur la page avec '$196', appuyez sur Entrée ici...")

        input("\n⏳ Appuyez sur Entrée quand vous voyez 'Maximum Used to Date $196'...")

        # Capturer le contenu final
        current_url = page.url
        content = await page.content()

        print(f"\n📍 URL finale: {current_url}")

        # Sauvegarder la page
        with open('eligibility_details.html', 'w') as f:
            f.write(content)

        print("💾 Page sauvegardée: eligibility_details.html")

        # Chercher les données importantes
        if '$196' in content or 'Maximum' in content:
            print("✅ Données 'Maximum Used' trouvées!")

        # Sauvegarder l'état complet
        await context.storage_state(path="metlife_complete_session.json")

        await browser.close()

        print("\n✅ Capture complète terminée!")
        print("Fichiers créés:")
        print("  • metlife_complete_flow.har (toutes les requêtes)")
        print("  • eligibility_details.html (page finale)")
        print("  • metlife_complete_session.json (session)")

if __name__ == "__main__":
    asyncio.run(capture_full_eligibility_flow())