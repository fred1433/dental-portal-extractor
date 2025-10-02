#!/usr/bin/env python3
"""
Test : Peut-on utiliser l'API directement après login sans navigation ?
"""
import asyncio
from playwright.async_api import async_playwright
import requests
import json
import base64
from urllib.parse import quote

async def test_minimal_navigation():
    print("🧪 TEST: Navigation minimale pour API")
    print("="*60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)

        # OPTION 1: Réutiliser la session existante si possible
        try:
            print("📂 Tentative de réutilisation de session...")
            context = await browser.new_context(storage_state="metlife_session_hybrid.json")
            page = await context.new_page()

            # Aller directement à MetDental pour vérifier la session
            await page.goto("https://metdental.metlife.com/prov/execute/PesSignIn")
            await page.wait_for_timeout(2000)

            # Si on n'est pas redirigé vers login, la session est valide
            if 'federate.sso' not in page.url:
                print("✅ Session réutilisée avec succès!")
            else:
                raise Exception("Session expirée")

        except:
            print("❌ Session invalide, nouveau login requis")
            context = await browser.new_context()
            page = await context.new_page()

            # ÉTAPE 1: Login seulement
            print("1️⃣ Login via OAuth...")
            await page.goto("https://dentalprovider.metlife.com/presignin")
            await page.click('button:has-text("Sign in")')
            await page.wait_for_timeout(3000)

            # Remplir credentials
            await page.fill('input[name="pf.username"]', "payorportal4771")
            await page.fill('input[name="pf.pass"]', "Dental24!")

            # Chercher le bon bouton - plusieurs sélecteurs possibles
            await page.click('button:has-text("Sign On"), button:has-text("Log in"), input[type="submit"]')

        await page.wait_for_timeout(5000)
        print(f"✅ Connecté! URL: {page.url[:50]}...")

        # ÉTAPE 2: Capturer les cookies SANS navigation supplémentaire
        print("\n2️⃣ Test API sans navigation vers MetDental...")
        cookies = await context.cookies()

        # Créer session requests
        session = requests.Session()
        for cookie in cookies:
            session.cookies.set(
                cookie['name'],
                cookie['value'],
                domain=cookie.get('domain', ''),
                path=cookie.get('path', '/')
            )

        # Vérifier les cookies importants
        cookie_names = [c['name'] for c in cookies]
        print(f"Cookies obtenus: {len(cookies)}")
        print(f"  JSESSIONID: {'❌ NON' if 'JSESSIONID' not in cookie_names else '✅ OUI'}")
        print(f"  PA.MetLife_US_MD: {'❌ NON' if 'PA.MetLife_US_MD' not in cookie_names else '✅ OUI'}")

        # Tester l'API
        pep_data = "^up34~0^^up406~FALSE^^up202~635140654^^up400~plan^^up401~82159477163195^^up111~false^^up50~payorportal4771^^up14~82159477163195"
        pep_b64 = base64.b64encode(pep_data.encode()).decode()
        pep_encoded = quote(pep_b64)

        response = session.post(
            'https://metdental.metlife.com/prov/execute/LastName',
            data={
                'pepText': pep_encoded,
                'lastName': 'Tedford',
                'fwdName': '',
                'formName': '',
                'appPath': '',
                'InputId': ''
            },
            headers={
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': 'https://metdental.metlife.com/prov/execute/PesSignIn'
            }
        )

        print(f"\n📊 Résultat API: {response.status_code}")
        if response.status_code == 200:
            print("✅ SUCCÈS! API fonctionne sans navigation!")
            return True
        else:
            print("❌ ÉCHEC - Navigation vers MetDental nécessaire")

            # ÉTAPE 3: Tester avec navigation minimale
            print("\n3️⃣ Test avec navigation minimale...")

            # Option A: URL directe vers MetDental
            print("  Tentative: Navigation directe vers MetDental...")
            await page.goto('https://metdental.metlife.com/prov/execute/PesSignIn')
            await page.wait_for_timeout(3000)

            # Re-capturer les cookies
            cookies = await context.cookies()
            session = requests.Session()
            for cookie in cookies:
                session.cookies.set(
                    cookie['name'],
                    cookie['value'],
                    domain=cookie.get('domain', ''),
                    path=cookie.get('path', '/')
                )

            # Re-tester l'API
            response = session.post(
                'https://metdental.metlife.com/prov/execute/LastName',
                data={
                    'pepText': pep_encoded,
                    'lastName': 'Tedford',
                    'fwdName': '',
                    'formName': '',
                    'appPath': '',
                    'InputId': ''
                },
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Referer': 'https://metdental.metlife.com/prov/execute/PesSignIn'
                }
            )

            print(f"  📊 Résultat après navigation: {response.status_code}")

            if response.status_code == 200:
                print("✅ Navigation directe vers MetDental suffit!")
                print("  → Pas besoin de cliquer sur Eligibility")
                return True

        await browser.close()
        return False

if __name__ == "__main__":
    asyncio.run(test_minimal_navigation())