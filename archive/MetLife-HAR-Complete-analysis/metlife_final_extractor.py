#!/usr/bin/env python3
"""
MetLife Data Extractor - Script Final
Utilise les endpoints fonctionnels identifiés
"""
import asyncio
from playwright.async_api import async_playwright
import json
import base64
from urllib.parse import quote
import re
from datetime import datetime

class MetLifeExtractor:
    def __init__(self):
        self.base_url = "https://metdental.metlife.com"
        self.session = None
        self.session_file = "metlife_session.json"

    async def login_once(self, username="payorportal4771", password="Dental24!"):
        """Login avec Playwright et sauvegarder la session"""
        print("🔐 Connexion à MetLife...")

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)

            # Essayer de réutiliser une session existante
            try:
                context = await browser.new_context(storage_state=self.session_file)
                page = await context.new_page()

                # Vérifier si la session est valide
                await page.goto(f"{self.base_url}/prov/execute/PesSignIn")
                await page.wait_for_timeout(2000)

                if 'federate.sso' not in page.url:
                    print("✅ Session existante valide!")
                    await browser.close()
                    return True
            except:
                pass

            # Sinon, nouveau login
            print("📝 Nouvelle connexion requise...")
            context = await browser.new_context()
            page = await context.new_page()

            await page.goto("https://dentalprovider.metlife.com/presignin")
            await page.click('button:has-text("Sign in")')
            await page.wait_for_timeout(3000)

            # Remplir le formulaire
            await page.fill('input[name="pf.username"]', username)
            await page.fill('input[name="pf.pass"]', password)
            await page.click('button[type="submit"], button:has-text("Sign On")')

            await page.wait_for_timeout(5000)

            # Gérer MFA si nécessaire
            if await page.locator('text=/verify|code|authentication/i').count() > 0:
                print("⚠️ MFA détecté - Entrez le code dans le navigateur")
                input("Appuyez sur Entrée une fois connecté...")

            # Naviguer vers MetDental pour obtenir JSESSIONID
            print("📍 Navigation vers MetDental...")
            await page.goto(f"{self.base_url}/prov/execute/PesSignIn")
            await page.wait_for_timeout(3000)

            # Sauvegarder la session
            await context.storage_state(path=self.session_file)
            print(f"💾 Session sauvegardée: {self.session_file}")

            await browser.close()
            return True

    def get_session(self):
        """Charger la session pour les requêtes API"""
        import requests

        with open(self.session_file, 'r') as f:
            session_data = json.load(f)

        session = requests.Session()
        for cookie in session_data['cookies']:
            session.cookies.set(
                cookie['name'],
                cookie['value'],
                domain=cookie.get('domain', ''),
                path=cookie.get('path', '/')
            )

        return session

    def search_patient(self, subscriber_id, last_name):
        """
        Endpoint 1: /prov/execute/LastName
        Retourne: Membres de la famille, dates de naissance, adresse
        """
        print(f"\n🔍 Recherche patient: {last_name} ({subscriber_id})")

        session = self.get_session()

        # Construire le pepText
        pep_data = f"^up34~0^^up406~FALSE^^up202~{subscriber_id}^^up400~plan^^up401~82159477163195^^up111~false^^up50~payorportal4771^^up14~82159477163195"
        pep_b64 = base64.b64encode(pep_data.encode()).decode()
        pep_encoded = quote(pep_b64)

        response = session.post(
            f"{self.base_url}/prov/execute/LastName",
            data={
                'pepText': pep_encoded,
                'lastName': last_name,
                'fwdName': '',
                'formName': '',
                'appPath': '',
                'InputId': ''
            },
            headers={
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': f'{self.base_url}/prov/execute/PesSignIn'
            }
        )

        if response.status_code == 200:
            return self.parse_patient_data(response.text)
        else:
            print(f"❌ Erreur: {response.status_code}")
            return None

    def get_providers(self, employer_group="37302"):
        """
        Endpoint 2: /prov/execute/MultipleProviders
        Retourne: Liste des dentistes/providers
        """
        print(f"\n👨‍⚕️ Récupération des providers...")

        session = self.get_session()

        # Paramètres du HAR
        parms_decoded = f"^EmployerBranchGroup~0001^^EmployerSubdivisionGroup~0001^^PlanDate~09-23-2025^^PatientName~Self^^MemberCoverage~4^^EmployerGroup~{employer_group}^^PpoInd~1^^CovType~2^^RelationshipCode~0^^RelationshipDesc~Self^^DependentSequenceNumber~1^^EffectiveDate~01/01/2024^"
        parms_b64 = base64.b64encode(parms_decoded.encode()).decode()
        parms_encoded = quote(parms_b64)

        pep_decoded = f"^up34~0^^up200~XXXXXXXXX^^up205~true^^up206~{employer_group}^^up207~{employer_group}^^up405~PEPSICO INC^^up406~FALSE^^up202~080284933^^up400~plan^^up203~KENNETH R TEDFORD^^up401~821594771^^up402~63195^^up204~75482^^up506~false^^up24~N^^up310~Tedford^^mp112~true^^up311~false^^mp111~false^^mp110~1^^up50~payorportal4771^^up14~821594771^^up12~63195^^up13~1^^up10~SAINT LOUIS^^up11~MO^^up07~Provider^^up08~CHILDRENS DENTAL AT PRESTON TRAI^^up700~true^^up209~1^^up03~payorportal@sdbmail.com^^npi04~63195^^up04~0082159477^^up01~Access^^npi01~Y^^up02~Portal^^up46~N^^ppo03~true^^npi07~Access^^up00~Portal Access^^npi08~MO^^ppo01~true^^ppo02~false^^npi06~P^^up211~2^^up213~PEPSICO INC^^up214~1^"
        pep_b64 = base64.b64encode(pep_decoded.encode()).decode()
        pep_encoded = quote(pep_b64)

        response = session.post(
            f"{self.base_url}/prov/execute/MultipleProviders",
            data={
                'parms': parms_encoded,
                'pepText': pep_encoded,
                'fwdName': '',
                'formName': '',
                'appPath': ''
            },
            headers={
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': f'{self.base_url}/prov/execute/PesSignIn'
            }
        )

        if response.status_code == 200:
            return self.parse_providers(response.text)
        else:
            print(f"❌ Erreur: {response.status_code}")
            return None

    def parse_patient_data(self, html):
        """Parser les données patient du HTML"""
        data = {
            'members': [],
            'address': None,
            'plan': None
        }

        # Nettoyer HTML
        clean = re.sub(r'<[^>]+>', ' ', html)
        clean = re.sub(r'\s+', ' ', clean)

        # Membres TEDFORD
        members = re.findall(r'([A-Z]+ [A-Z] TEDFORD)', clean)
        for member in set(members):
            member_info = {'name': member}

            # Chercher contexte
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

        # Plan
        if 'PDP PLUS' in clean:
            data['plan'] = 'PDP PLUS'

        # Adresse
        address = re.search(r'(\d+ [A-Z ]+ COURT)', clean)
        if address:
            data['address'] = address.group(1)

        return data

    def parse_providers(self, html):
        """Parser la liste des providers"""
        providers = []

        # Nettoyer HTML
        clean = re.sub(r'<[^>]+>', ' ', html)

        # Pattern: NOM, PRÉNOM
        matches = re.findall(r'([A-Z][A-Za-z]+),\s+([A-Z][A-Za-z]+)', clean)

        for last, first in set(matches):
            providers.append({
                'name': f"Dr. {first} {last}",
                'last_name': last,
                'first_name': first
            })

        return providers

    async def extract_batch(self, patients):
        """
        Extraire données pour plusieurs patients
        Format: [(subscriber_id, last_name), ...]
        """
        # Login une fois
        await self.login_once()

        results = []

        for subscriber_id, last_name in patients:
            # Données patient
            patient_data = self.search_patient(subscriber_id, last_name)

            if patient_data:
                patient_data['subscriber_id'] = subscriber_id
                patient_data['search_name'] = last_name
                results.append(patient_data)

                print(f"✅ {last_name}: {len(patient_data.get('members', []))} membres trouvés")
            else:
                results.append({
                    'subscriber_id': subscriber_id,
                    'search_name': last_name,
                    'error': 'Extraction échouée'
                })
                print(f"❌ {last_name}: Échec")

            # Pause entre requêtes
            await asyncio.sleep(2)

        # Récupérer les providers une fois
        providers = self.get_providers()

        return {
            'extraction_date': datetime.now().isoformat(),
            'patients': results,
            'providers': providers
        }

async def main():
    """Exemple d'utilisation"""
    extractor = MetLifeExtractor()

    # Liste des patients à extraire
    patients = [
        ("635140654", "Tedford"),
        # Ajouter d'autres patients ici
    ]

    print("🚀 EXTRACTION METLIFE")
    print("="*60)

    results = await extractor.extract_batch(patients)

    # Sauvegarder les résultats
    with open('metlife_extraction_results.json', 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\n✅ Extraction terminée!")
    print(f"📊 {len(results['patients'])} patients traités")
    print(f"👨‍⚕️ {len(results.get('providers', []))} providers trouvés")
    print(f"💾 Résultats: metlife_extraction_results.json")

    # Afficher un résumé
    for patient in results['patients']:
        if 'error' not in patient:
            print(f"\n{patient['search_name']}:")
            for member in patient.get('members', []):
                print(f"  • {member['name']} ({member.get('dob', 'N/A')})")

if __name__ == "__main__":
    asyncio.run(main())