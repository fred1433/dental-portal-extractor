#!/usr/bin/env python3
"""
Script pour se connecter et tester l'endpoint Claims
qui pourrait avoir la liste de tous les patients
"""
import asyncio
from playwright.async_api import async_playwright
import json

async def test_claims():
    print("🔍 TEST ENDPOINT CLAIMS POUR LISTE PATIENTS")
    print("="*60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        # Login
        print("\n1️⃣ CONNEXION...")
        await page.goto("https://dentalprovider.metlife.com/presignin")
        await page.click('button:has-text("Sign in")')
        await page.wait_for_timeout(2000)

        await page.fill('input[name="pf.username"]', 'payorportal4771')
        await page.fill('input[name="pf.pass"]', 'Dental24!')
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(3000)

        # Gérer MFA si nécessaire
        if await page.locator('text=/verify|code|authentication/i').count() > 0:
            print("⚠️ MFA détecté - Entrez le code dans le navigateur")
            input("Appuyez sur Entrée une fois connecté...")

        # Aller sur MetDental
        await page.goto("https://metdental.metlife.com/prov/execute/PesSignIn")
        await page.wait_for_timeout(2000)

        print("\n2️⃣ TEST DES ENDPOINTS CLAIMS...")

        # TESTER VIEW CLAIMS (le plus prometteur)
        print("\n🎯 Test: View Claims")
        try:
            # Essayer de cliquer sur le lien View Claims s'il existe
            if await page.locator('text=/view.*claims/i').count() > 0:
                await page.click('text=/view.*claims/i')
                await page.wait_for_timeout(3000)
                print("✅ Cliqué sur View Claims")
            else:
                # Sinon essayer l'URL directement
                await page.goto("https://metdental.metlife.com/prov/execute/entryClaim")
                await page.wait_for_timeout(3000)
                print("✅ Navigation directe vers entryClaim")

            # Analyser la page
            content = await page.content()

            # Compter les indices de liste
            patient_count = content.count('SSN') + content.count('subscriber')
            table_count = content.count('<table') + content.count('<TABLE')
            name_count = content.count('TEDFORD')

            print(f"\n📊 Analyse de la page Claims:")
            print(f"  • Mentions SSN/subscriber: {patient_count}")
            print(f"  • Tables trouvées: {table_count}")
            print(f"  • Mentions TEDFORD: {name_count}")

            # Sauvegarder
            with open('claims_page.html', 'w') as f:
                f.write(content)
            print(f"  💾 Sauvé: claims_page.html")

            # Chercher des boutons/liens utiles
            if 'export' in content.lower() or 'download' in content.lower():
                print("  ✅ TROUVÉ: Option Export/Download !")
            if 'view all' in content.lower():
                print("  ✅ TROUVÉ: Option View All !")

        except Exception as e:
            print(f"❌ Erreur avec Claims: {e}")

        print("\n3️⃣ TEST: RECHERCHE VIDE")
        # Retour à PesSignIn pour tester recherche vide
        await page.goto("https://metdental.metlife.com/prov/execute/PesSignIn")
        await page.wait_for_timeout(2000)

        # Essayer recherche vide
        print("\n🔍 Test: Recherche avec champ vide")
        search_input = page.locator('input[type="text"]').first
        if await search_input.count() > 0:
            await search_input.fill('')  # Vide
            await search_input.press('Enter')
            await page.wait_for_timeout(3000)

            content2 = await page.content()
            if 'TEDFORD' in content2 or 'No results' in content2:
                print(f"  Résultat: {content2.count('TEDFORD')} patients trouvés")
                with open('search_empty.html', 'w') as f:
                    f.write(content2)
                print(f"  💾 Sauvé: search_empty.html")

        print("\n4️⃣ TEST: WILDCARD")
        print("\n🔍 Test: Recherche avec * (wildcard)")
        await page.goto("https://metdental.metlife.com/prov/execute/PesSignIn")
        await page.wait_for_timeout(2000)

        search_input = page.locator('input[type="text"]').first
        if await search_input.count() > 0:
            await search_input.fill('*')  # Wildcard
            await search_input.press('Enter')
            await page.wait_for_timeout(3000)

            content3 = await page.content()
            if content3.count('TEDFORD') > 5 or 'multiple' in content3.lower():
                print(f"  ✅ TROUVÉ: Multiples résultats!")
                with open('search_wildcard.html', 'w') as f:
                    f.write(content3)
                print(f"  💾 Sauvé: search_wildcard.html")

        # Sauvegarder session pour réutilisation
        await context.storage_state(path="metlife_session_fresh.json")

        print("\n" + "="*60)
        print("✅ TESTS TERMINÉS")
        print("\n💡 VÉRIFIER:")
        print("  1. claims_page.html - pour voir s'il y a une liste")
        print("  2. search_empty.html - résultats recherche vide")
        print("  3. search_wildcard.html - résultats wildcard")

        input("\n⏸️ Appuyez sur Entrée pour fermer...")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_claims())