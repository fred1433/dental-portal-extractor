#!/usr/bin/env python3
"""
Script pour trouver TOUS les patients en testant différentes approches
"""
import asyncio
from playwright.async_api import async_playwright
import json

async def find_all_patients():
    print("🔍 RECHERCHE DE TOUS LES PATIENTS")
    print("="*60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)

        # Essayer de réutiliser la session existante d'abord
        try:
            print("📂 Tentative avec session existante...")
            context = await browser.new_context(storage_state="metlife_session_hybrid.json")
            page = await context.new_page()
            await page.goto("https://metdental.metlife.com/prov/execute/PesSignIn")
            await page.wait_for_timeout(2000)

            # Vérifier si on est connecté
            if 'federate.sso' in page.url:
                print("❌ Session expirée, reconnexion nécessaire...")
                await context.close()
                raise Exception("Session expired")
            else:
                print("✅ Session valide!")
        except:
            # Si la session est expirée, se reconnecter
            print("\n🔐 NOUVELLE CONNEXION...")
            context = await browser.new_context()
            page = await context.new_page()

            await page.goto("https://dentalprovider.metlife.com/presignin")
            await page.click('button:has-text("Sign in")')
            await page.wait_for_timeout(3000)

            # Login avec les bons champs
            await page.fill('input[name="pf.username"]', 'payorportal4771')
            await page.fill('input[name="pf.pass"]', 'Dental24!')
            await page.click('button[type="submit"], button:has-text("Sign On")')

            await page.wait_for_timeout(5000)

            # Gérer MFA si nécessaire
            if await page.locator('text=/verify|code|authentication/i').count() > 0:
                print("⚠️ MFA détecté - Entrez le code dans le navigateur")
                input("Appuyez sur Entrée une fois connecté...")

            # Aller sur MetDental
            await page.goto("https://metdental.metlife.com/prov/execute/PesSignIn")
            await page.wait_for_timeout(2000)

            # Sauvegarder la nouvelle session
            await context.storage_state(path="metlife_session_latest.json")
            print("💾 Session sauvegardée")

        print("\n" + "="*60)
        print("🎯 TESTS POUR TROUVER TOUS LES PATIENTS")
        print("="*60)

        # TEST 1: VIEW CLAIMS
        print("\n1️⃣ TEST: VIEW CLAIMS")
        print("-"*40)

        # Chercher le lien View Claims dans la navigation
        if await page.locator('a:has-text("View Claims")').count() > 0:
            print("✅ Lien 'View Claims' trouvé!")
            await page.click('a:has-text("View Claims")')
            await page.wait_for_timeout(3000)
        elif await page.locator('text=/view.*claim/i').count() > 0:
            print("✅ Lien claims trouvé!")
            await page.click('text=/view.*claim/i')
            await page.wait_for_timeout(3000)
        else:
            # Essayer directement l'URL
            print("→ Navigation directe vers entryClaim...")
            response = await page.goto("https://metdental.metlife.com/prov/execute/entryClaim")
            if response.status == 200:
                print("✅ Page claims chargée!")
                await page.wait_for_timeout(3000)

        # Analyser la page claims
        content = await page.content()
        print(f"📊 Analyse page Claims:")
        print(f"  • Taille: {len(content)/1024:.1f}KB")
        print(f"  • Mentions 'patient': {content.lower().count('patient')}")
        print(f"  • Mentions 'claim': {content.lower().count('claim')}")
        print(f"  • Tables HTML: {content.count('<table')}")

        with open('page_claims.html', 'w') as f:
            f.write(content)
        print(f"  💾 Sauvé: page_claims.html")

        # TEST 2: RECHERCHE VIDE
        print("\n2️⃣ TEST: RECHERCHE VIDE SUR PESSIGNIN")
        print("-"*40)

        await page.goto("https://metdental.metlife.com/prov/execute/PesSignIn")
        await page.wait_for_timeout(2000)

        # Trouver le champ de recherche
        search_input = page.locator('input[type="text"]').first
        if await search_input.count() > 0:
            print("→ Soumission avec champ vide...")
            await search_input.fill('')
            await search_input.press('Enter')
            await page.wait_for_timeout(3000)

            content2 = await page.content()
            if 'no result' in content2.lower() or 'enter' in content2.lower():
                print("❌ Recherche vide refusée")
            else:
                patient_count = content2.count('TEDFORD')
                print(f"✅ Résultats: {patient_count} mentions trouvées")
                if patient_count > 1:
                    with open('search_empty_results.html', 'w') as f:
                        f.write(content2)
                    print(f"  💾 Sauvé: search_empty_results.html")

        # TEST 3: WILDCARD
        print("\n3️⃣ TEST: RECHERCHE WILDCARD (*)")
        print("-"*40)

        await page.goto("https://metdental.metlife.com/prov/execute/PesSignIn")
        await page.wait_for_timeout(2000)

        if await search_input.count() > 0:
            print("→ Test avec * (wildcard)...")
            await search_input.fill('*')
            await search_input.press('Enter')
            await page.wait_for_timeout(3000)

            content3 = await page.content()
            if 'multiple' in content3.lower() or content3.count('select') > 5:
                print(f"✅ TROUVÉ: Résultats multiples!")
                with open('search_wildcard.html', 'w') as f:
                    f.write(content3)
                print(f"  💾 Sauvé: search_wildcard.html")
            else:
                print("❌ Wildcard non accepté")

        # TEST 4: RECHERCHE PAR DATE
        print("\n4️⃣ TEST: RECHERCHE PAR DATE (si disponible)")
        print("-"*40)

        # Chercher des champs date
        if await page.locator('input[type="date"]').count() > 0:
            print("✅ Champs date trouvés!")
            # Mettre dates larges
            await page.locator('input[type="date"]').first.fill('2025-01-01')
            await page.locator('input[type="date"]').last.fill('2025-12-31')
            await page.press('body', 'Enter')
            await page.wait_for_timeout(3000)

            content4 = await page.content()
            with open('search_by_date.html', 'w') as f:
                f.write(content4)
            print(f"  💾 Sauvé: search_by_date.html")
        else:
            print("❌ Pas de champs date trouvés")

        print("\n" + "="*60)
        print("📋 RÉSUMÉ DES TESTS")
        print("="*60)
        print("\n📁 Fichiers à examiner:")
        print("  1. page_claims.html - Page des réclamations")
        print("  2. search_empty_results.html - Résultats recherche vide")
        print("  3. search_wildcard.html - Résultats wildcard")
        print("  4. search_by_date.html - Résultats par date")

        print("\n💡 CONSEIL:")
        print("  Si aucune méthode ne fonctionne, il faudra:")
        print("  • Soit obtenir la liste depuis le PMS du dentiste")
        print("  • Soit faire du bruteforce sur les IDs (pas recommandé)")
        print("  • Soit naviguer manuellement et noter les patterns")

        input("\n⏸️ Appuyez sur Entrée pour fermer le navigateur...")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(find_all_patients())