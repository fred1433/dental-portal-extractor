#!/usr/bin/env python3
"""
Extracteur Hybride MetLife : Playwright + API
1. Playwright gère la connexion OAuth
2. Capture la session valide
3. Utilise la session pour les requêtes API
"""
import asyncio
from playwright.async_api import async_playwright
import requests
import json
import base64
from urllib.parse import quote, unquote
import time

class MetLifeHybridExtractor:
    def __init__(self):
        self.base_url = "https://metdental.metlife.com"
        self.session = requests.Session()
        self.cookies = {}
        self.auth_ready = False

    async def login_with_playwright(self, username, password):
        """
        Étape 1: Utiliser Playwright pour gérer OAuth/login
        et capturer une session valide
        """
        print("🚀 ÉTAPE 1: Connexion avec Playwright")
        print("="*60)

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context()
            page = await context.new_page()

            # Capturer les requêtes pour analyser
            captured_requests = []

            async def capture_request(request):
                """Capturer les requêtes importantes"""
                if 'metdental.metlife.com' in request.url:
                    captured_requests.append({
                        'url': request.url,
                        'method': request.method,
                        'headers': await request.all_headers()
                    })

            page.on('request', capture_request)

            # Navigation et connexion
            print("📍 Navigation vers MetLife...")
            await page.goto("https://dentalprovider.metlife.com/presignin")

            print("🔐 Clic sur Sign in...")
            await page.click('button:has-text("Sign in")')

            # Attendre la redirection vers la page de login OAuth
            await page.wait_for_timeout(3000)
            print(f"📍 URL actuelle: {page.url[:50]}...")

            # Attendre que le formulaire soit chargé
            print("⏳ Attente du formulaire de connexion...")

            # Debug: afficher ce qu'on voit
            print(f"📍 Page title: {await page.title()}")

            # Attendre un peu plus pour le chargement complet
            await page.wait_for_timeout(5000)

            # Prendre un screenshot pour debug
            await page.screenshot(path="debug_login_form.png")
            print("📸 Screenshot: debug_login_form.png")

            try:
                print("🔍 Recherche du formulaire...")
                # Essayer de trouver n'importe quel input
                inputs = await page.locator('input').count()
                print(f"   Trouvé {inputs} inputs sur la page")

                # Lister les types d'inputs
                for i in range(min(inputs, 5)):  # Limiter à 5 pour debug
                    input_type = await page.locator('input').nth(i).get_attribute('type')
                    input_name = await page.locator('input').nth(i).get_attribute('name')
                    print(f"   Input {i}: type={input_type}, name={input_name}")

                # Les vrais noms des champs sont pf.username et pf.pass !
                await page.wait_for_selector('input[name="pf.username"]', timeout=5000)
                print("✏️ Remplissage des credentials...")
                await page.fill('input[name="pf.username"]', username)
                await page.fill('input[name="pf.pass"]', password)

                # Chercher le bouton submit
                await page.click('button[type="submit"], input[type="submit"], button:has-text("Sign On"), button:has-text("Log in")')
            except Exception as e:
                print(f"❌ Erreur: {e}")
                print("⚠️ Impossible de trouver le formulaire standard")
                print("💡 Activez votre VPN et relancez le script!")
                return False

            # Attendre le chargement
            await page.wait_for_timeout(3000)

            # Gérer MFA si nécessaire
            if await page.locator('text=/verify|code|authentication/i').count() > 0:
                print("⚠️ MFA détecté - Entrez le code dans le navigateur")
                print("Appuyez sur Entrée une fois connecté...")
                input()

            print("✅ Connecté!")

            # Naviguer jusqu'à la page principale MetDental
            print("📍 Navigation vers l'application MetDental...")

            # D'abord essayer de cliquer sur le lien Eligibility pour aller sur MetDental
            try:
                # Attendre que la page principale se charge
                await page.wait_for_selector('text=Eligibility', timeout=10000)
                await page.click('text=Eligibility')
                print("✅ Cliqué sur Eligibility")
                await page.wait_for_timeout(5000)

                # Vérifier si on est sur MetDental maintenant
                current_url = page.url
                print(f"📍 Après click Eligibility: {current_url[:50]}...")

                # Si on est toujours pas sur metdental, essayer de naviguer directement
                if 'metdental.metlife.com' not in current_url:
                    print("🔄 Navigation directe vers MetDental...")
                    await page.goto('https://metdental.metlife.com/prov/execute/PesSignIn')
                    await page.wait_for_timeout(3000)
                    print(f"📍 URL après navigation directe: {page.url[:50]}...")

            except:
                print("⚠️ Lien Eligibility non trouvé")
                print("🔄 Tentative de navigation directe...")
                try:
                    await page.goto('https://metdental.metlife.com/prov/execute/PesSignIn')
                    await page.wait_for_timeout(3000)
                    print(f"✅ Navigation directe réussie: {page.url[:50]}...")
                except Exception as e:
                    print(f"❌ Échec navigation: {e}")

            await page.wait_for_timeout(3000)

            # Capturer TOUS les cookies après connexion complète
            print("\n🍪 Capture des cookies et tokens...")
            all_cookies = await context.cookies()

            for cookie in all_cookies:
                self.cookies[cookie['name']] = cookie['value']
                # Ajouter au session requests
                self.session.cookies.set(
                    cookie['name'],
                    cookie['value'],
                    domain=cookie.get('domain', ''),
                    path=cookie.get('path', '/')
                )

            print(f"✅ {len(self.cookies)} cookies capturés")

            # Cookies importants pour MetLife
            important = ['JSESSIONID', 'PA.MetLife_US_MD', 'AuthTimeStamp', 'PA_S']
            for name in important:
                if name in self.cookies:
                    print(f"  ✓ {name}: {self.cookies[name][:30]}...")
                else:
                    print(f"  ✗ {name}: MANQUANT")

            # Sauvegarder l'état
            await context.storage_state(path="metlife_session_hybrid.json")
            print("\n💾 Session sauvegardée dans metlife_session_hybrid.json")

            # Capturer une page pour tester
            current_url = page.url
            print(f"\n📍 URL actuelle: {current_url}")

            # Accepter aussi dentalprovider.metlife.com
            if 'metdental.metlife.com' in current_url or 'dentalprovider.metlife.com' in current_url:
                print("✅ Nous sommes sur MetLife!")
                self.auth_ready = True

            await browser.close()

        return self.auth_ready

    def search_patient_with_api(self, subscriber_id, last_name):
        """
        Étape 2: Utiliser la session pour faire des requêtes API
        """
        print("\n🔄 ÉTAPE 2: Requête API avec la session")
        print("="*60)

        if not self.auth_ready:
            print("❌ Session non prête. Connectez-vous d'abord.")
            return None

        # Construire le pepText (basé sur notre analyse)
        pep_data = f"^up34~0^^up406~FALSE^^up202~{subscriber_id}^^up400~plan^^up401~"
        pep_data += f"82159477163195^^up111~false^^up50~payorportal4771^^up14~82159477163195"

        # Encoder
        pep_b64 = base64.b64encode(pep_data.encode()).decode()
        pep_encoded = quote(pep_b64)

        # Préparer la requête
        url = f"{self.base_url}/prov/execute/LastName"

        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Referer': f'{self.base_url}/prov/execute/PesSignIn',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

        data = {
            'fwdName': '',
            'formName': '',
            'appPath': '',
            'pepText': pep_encoded,
            'InputId': '',
            'lastName': last_name
        }

        print(f"📡 Envoi requête POST vers {url}")
        print(f"   Recherche: {last_name} (ID: {subscriber_id})")

        try:
            response = self.session.post(url, headers=headers, data=data, timeout=30)

            print(f"\n📊 Réponse:")
            print(f"  Status: {response.status_code}")
            print(f"  Taille: {len(response.text)} octets")

            if response.status_code == 200:
                # Vérifier le contenu
                if last_name.upper() in response.text.upper():
                    print(f"  ✅ Données {last_name} trouvées!")

                    # Sauvegarder
                    with open(f'patient_{last_name.lower()}.html', 'w') as f:
                        f.write(response.text)
                    print(f"  💾 Sauvegardé dans patient_{last_name.lower()}.html")

                    return self.parse_patient_data(response.text)
                else:
                    print(f"  ⚠️ Pas de données {last_name}")

                    # Vérifier si c'est une page de login
                    if 'login' in response.text.lower() or 'sign in' in response.text.lower():
                        print("  ❌ Session expirée - reconnexion nécessaire")
                        self.auth_ready = False

                    return None

            elif response.status_code == 401:
                print("  ❌ Non autorisé - session invalide")
                self.auth_ready = False
                return None

            elif response.status_code == 302:
                print(f"  ↻ Redirection vers: {response.headers.get('Location', '?')}")
                return None

            else:
                print(f"  ❌ Erreur {response.status_code}")
                return None

        except Exception as e:
            print(f"  ❌ Erreur: {e}")
            return None

    def parse_patient_data(self, html):
        """Parser les données patient du HTML"""
        import re

        data = {'members': []}

        # Nettoyer le HTML
        clean = re.sub(r'<[^>]+>', ' ', html)
        clean = re.sub(r'\s+', ' ', clean)

        # Chercher les membres (pattern pour TEDFORD ou autre nom)
        members_found = re.findall(r'([A-Z][A-Z\s]+[A-Z]{3,})', clean)

        for member in set(members_found):
            if len(member.split()) >= 2:  # Au moins prénom + nom
                member_info = {'name': member}

                # Chercher contexte autour du nom
                idx = clean.find(member)
                if idx > 0:
                    context = clean[max(0, idx-200):idx+200]

                    # Date de naissance
                    dob = re.search(r'(\d{2}/\d{2}/\d{4})', context)
                    if dob:
                        member_info['dob'] = dob.group(1)

                    # Genre
                    if 'Male' in context and 'Female' not in context:
                        member_info['gender'] = 'Male'
                    elif 'Female' in context:
                        member_info['gender'] = 'Female'

                    data['members'].append(member_info)

        return data

    async def extract_multiple_patients(self, patients):
        """
        Extraire plusieurs patients
        Format: [(subscriber_id, last_name), ...]
        """
        results = []

        print("\n" + "="*60)
        print("🚀 EXTRACTION MULTIPLE")
        print("="*60)

        for subscriber_id, last_name in patients:
            print(f"\n👤 Patient: {last_name} ({subscriber_id})")

            data = self.search_patient_with_api(subscriber_id, last_name)

            if data:
                data['subscriber_id'] = subscriber_id
                data['last_name'] = last_name
                results.append(data)
                print(f"  ✅ {len(data.get('members', []))} membres trouvés")
            else:
                results.append({
                    'subscriber_id': subscriber_id,
                    'last_name': last_name,
                    'error': 'Extraction échouée'
                })
                print(f"  ❌ Échec")

            # Pause entre les requêtes
            await asyncio.sleep(2)

            # Si session expirée, se reconnecter
            if not self.auth_ready:
                print("\n⚠️ Session expirée, reconnexion...")
                await self.login_with_playwright("payorportal4771", "Dental24!")

        return results

async def main():
    """Test de l'extracteur hybride"""

    extractor = MetLifeHybridExtractor()

    # 1. Se connecter avec Playwright
    print("🏥 METLIFE HYBRID EXTRACTOR")
    print("="*60)

    success = await extractor.login_with_playwright("payorportal4771", "Dental24!")

    if not success:
        print("❌ Échec de la connexion")
        return

    # 2. Tester une requête API
    print("\n" + "="*60)
    print("TEST: Requête API avec la session Playwright")
    print("="*60)

    result = extractor.search_patient_with_api("635140654", "Tedford")

    if result:
        print("\n✅ SUCCÈS! L'approche hybride fonctionne!")
        print(f"Membres trouvés: {result}")
    else:
        print("\n⚠️ La requête API a échoué")
        print("Causes possibles:")
        print("  • OAuth/PKCE toujours actif")
        print("  • Il faut naviguer jusqu'à la bonne page d'abord")
        print("  • Token pepText incorrect")

    # 3. Si ça marche, extraire plusieurs patients
    if result:
        patients = [
            ("635140654", "Tedford"),
            # Ajouter d'autres patients ici
        ]

        all_results = await extractor.extract_multiple_patients(patients)

        # Sauvegarder
        with open('metlife_hybrid_results.json', 'w') as f:
            json.dump(all_results, f, indent=2)

        print(f"\n💾 Résultats sauvés dans metlife_hybrid_results.json")

if __name__ == "__main__":
    asyncio.run(main())