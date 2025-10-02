#!/usr/bin/env python3
"""
MetLife API Automation - Reverse Engineered
Basé sur l'analyse du HAR
"""
import asyncio
from playwright.async_api import async_playwright
import json
import base64
from urllib.parse import quote, unquote
import re

class MetLifeAPIAutomation:
    def __init__(self):
        self.base_url = "https://metdental.metlife.com"
        self.session_cookies = {}
        self.pep_token_template = None

    async def login(self, username, password):
        """Se connecter et capturer la session"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context()
            page = await context.new_page()

            # Aller à la page de login
            await page.goto("https://dentalprovider.metlife.com/presignin")
            await page.click('button:has-text("Sign in")')

            # Entrer les credentials
            await page.fill('input[name="username"]', username)
            await page.fill('input[name="password"]', password)
            await page.click('button:has-text("Log in")')

            # Attendre la connexion
            await page.wait_for_timeout(3000)

            # Gérer MFA si nécessaire
            if await page.locator('text=/verify|code/i').count() > 0:
                print("⚠️ MFA requis - entrez le code dans le navigateur")
                input("Appuyez sur Entrée une fois connecté...")

            # Sauvegarder les cookies
            cookies = await context.cookies()
            for cookie in cookies:
                self.session_cookies[cookie['name']] = cookie['value']

            # Sauvegarder l'état
            await context.storage_state(path="metlife_session.json")

            await browser.close()

        return True

    def build_pep_token(self, subscriber_id, username=None):
        """
        Construire le pepText pour un subscriber ID donné
        Format découvert: ^up34~0^^up406~FALSE^^up202~[SUBSCRIBER_ID]^^up400~plan^^up401~...
        """
        # Template basé sur notre analyse
        if not username:
            username = "payorportal4771"  # Default

        # Construire le token
        pep_data = f"^up34~0^^up406~FALSE^^up202~{subscriber_id}^^up400~plan^^up401~"
        pep_data += f"82159477163195^^up111~false^^up50~{username}^^up14~82159477163195"

        # Encoder en base64
        pep_b64 = base64.b64encode(pep_data.encode()).decode()

        # URL encode
        pep_encoded = quote(pep_b64)

        return pep_encoded

    async def search_patient(self, subscriber_id, last_name):
        """
        Rechercher un patient via l'API
        Endpoint: POST /prov/execute/LastName
        """
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)

            # Charger la session sauvegardée
            context = await browser.new_context(storage_state="metlife_session.json")
            page = await context.new_page()

            # Construire les données POST
            pep_token = self.build_pep_token(subscriber_id)

            # Préparer la requête
            post_data = {
                'fwdName': '',
                'formName': '',
                'appPath': '',
                'pepText': pep_token,
                'InputId': '',
                'lastName': last_name
            }

            # Naviguer vers l'endpoint
            # MetLife utilise des forms, on doit simuler
            await page.goto(f"{self.base_url}/prov/execute/PesSignIn")

            # Remplir le formulaire de recherche
            await page.fill('input[id="InputID"]', subscriber_id)
            await page.click('button[type="submit"]')

            await page.wait_for_timeout(2000)

            # Entrer le nom
            await page.fill('input[id="lastName"]', last_name)
            await page.click('a:has-text("submit")')

            await page.wait_for_timeout(2000)

            # Capturer le contenu
            content = await page.content()

            await browser.close()

            return self.extract_patient_data(content)

    def extract_patient_data(self, html):
        """Extraire les données patient du HTML"""
        data = {
            'members': [],
            'address': None,
            'plan_info': {}
        }

        # Nettoyer le HTML
        clean = re.sub(r'<[^>]+>', ' ', html)
        clean = re.sub(r'\s+', ' ', clean)

        # Extraire les membres
        member_pattern = r'([A-Z][A-Z\s]+(?:TEDFORD|SMITH|JOHNSON|[A-Z]+))'
        members = re.findall(member_pattern, clean)

        for member in set(members):
            if len(member.split()) >= 2:  # Au moins prénom + nom
                member_data = {'name': member}

                # Chercher la date de naissance
                idx = clean.find(member)
                if idx > 0:
                    context = clean[max(0, idx-200):idx+200]

                    # Date de naissance
                    dob = re.search(r'(\d{2}/\d{2}/\d{4})', context)
                    if dob:
                        member_data['dob'] = dob.group(1)

                    # Genre
                    if 'Male' in context and 'Female' not in context:
                        member_data['gender'] = 'Male'
                    elif 'Female' in context:
                        member_data['gender'] = 'Female'

                    # Relation
                    for rel in ['Self', 'Spouse', 'Dependent']:
                        if rel in context:
                            member_data['relationship'] = rel
                            break

                data['members'].append(member_data)

        # Extraire l'adresse
        address_match = re.search(r'(\d+\s+[A-Z\s]+(?:COURT|ST|AVE|RD|BLVD|DR|LN))\s*,?\s*([A-Z\s]+),?\s*([A-Z]{2})\s*(\d{5})', clean)
        if address_match:
            data['address'] = {
                'street': address_match.group(1),
                'city': address_match.group(2),
                'state': address_match.group(3),
                'zip': address_match.group(4)
            }

        # Extraire les infos du plan
        coverage = re.search(r'(\d{1,3})%', clean)
        if coverage:
            data['plan_info']['coverage'] = coverage.group(1) + '%'

        effective = re.search(r'Effective Date:\s*(\d{2}/\d{2}/\d{4})', clean)
        if effective:
            data['plan_info']['effective_date'] = effective.group(1)

        return data

    async def extract_multiple_patients(self, patient_list):
        """
        Extraire les données pour plusieurs patients
        patient_list: [(subscriber_id, last_name), ...]
        """
        results = []

        for subscriber_id, last_name in patient_list:
            print(f"\n🔍 Recherche: {last_name} ({subscriber_id})")

            try:
                data = await self.search_patient(subscriber_id, last_name)
                data['subscriber_id'] = subscriber_id
                data['search_name'] = last_name
                results.append(data)

                print(f"  ✅ Trouvé {len(data['members'])} membres")

                # Pause pour éviter le rate limiting
                await asyncio.sleep(2)

            except Exception as e:
                print(f"  ❌ Erreur: {e}")
                results.append({
                    'subscriber_id': subscriber_id,
                    'search_name': last_name,
                    'error': str(e)
                })

        return results

async def main():
    """Exemple d'utilisation"""
    automation = MetLifeAPIAutomation()

    # 1. Se connecter (première fois seulement)
    print("🔐 Connexion à MetLife...")
    await automation.login("payorportal4771", "Dental24!")

    # 2. Rechercher des patients
    patients_to_search = [
        ("635140654", "Tedford"),
        # Ajouter d'autres patients ici
    ]

    print("\n🚀 Extraction des données patients...")
    results = await automation.extract_multiple_patients(patients_to_search)

    # 3. Sauvegarder les résultats
    with open('metlife_patients_data.json', 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\n✅ Extraction terminée! {len(results)} patients traités")
    print("Données sauvegardées dans metlife_patients_data.json")

if __name__ == "__main__":
    asyncio.run(main())