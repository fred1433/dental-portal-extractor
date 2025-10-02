#!/usr/bin/env python3
"""
MetLife Complete Extractor - Version Finale
Intègre tous les endpoints fonctionnels + capture Maximums & Deductibles
"""
import asyncio
from playwright.async_api import async_playwright
import json
import base64
from urllib.parse import quote
import re
from datetime import datetime
import requests
from typing import Dict, List, Optional

class MetLifeCompleteExtractor:
    def __init__(self):
        self.base_url = "https://metdental.metlife.com"
        self.session_file = "metlife_session.json"
        self.browser = None
        self.context = None
        self.page = None

    async def login_and_setup(self, username="payorportal4771", password="Dental24!"):
        """Login avec Playwright et préparer pour extraction"""
        print("🔐 Connexion à MetLife...")

        self.browser = await async_playwright().start().chromium.launch(headless=False)

        # Essayer de réutiliser une session existante
        try:
            self.context = await self.browser.new_context(storage_state=self.session_file)
            self.page = await self.context.new_page()

            # Vérifier si la session est valide
            await self.page.goto(f"{self.base_url}/prov/execute/PesSignIn")
            await self.page.wait_for_timeout(2000)

            if 'federate.sso' not in self.page.url:
                print("✅ Session existante valide!")
                return True
        except:
            pass

        # Nouveau login
        print("📝 Nouvelle connexion requise...")
        self.context = await self.browser.new_context()
        self.page = await self.context.new_page()

        await self.page.goto("https://dentalprovider.metlife.com/presignin")
        await self.page.click('button:has-text("Sign in")')
        await self.page.wait_for_timeout(3000)

        # Remplir le formulaire
        await self.page.fill('input[name="pf.username"]', username)
        await self.page.fill('input[name="pf.pass"]', password)
        await self.page.click('button[type="submit"], button:has-text("Sign On")')

        await self.page.wait_for_timeout(5000)

        # Gérer MFA si nécessaire
        if await self.page.locator('text=/verify|code|authentication/i').count() > 0:
            print("⚠️ MFA détecté - Entrez le code dans le navigateur")
            input("Appuyez sur Entrée une fois connecté...")

        # Naviguer vers MetDental
        await self.page.goto(f"{self.base_url}/prov/execute/PesSignIn")
        await self.page.wait_for_timeout(3000)

        # Sauvegarder la session
        await self.context.storage_state(path=self.session_file)
        print(f"💾 Session sauvegardée: {self.session_file}")

        return True

    def get_api_session(self) -> requests.Session:
        """Créer une session requests avec les cookies sauvegardés"""
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

    def search_patient_api(self, subscriber_id: str, last_name: str) -> Optional[Dict]:
        """
        API Endpoint 1: /prov/execute/LastName
        Retourne: Membres de la famille, dates de naissance, adresse
        """
        print(f"\n🔍 API: Recherche patient {last_name} ({subscriber_id})")

        session = self.get_api_session()

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
            print(f"❌ Erreur API: {response.status_code}")
            return None

    async def capture_maximums_page(self, subscriber_id: str, member_name: str = None) -> Dict:
        """
        Capture la page Maximums & Deductibles avec Playwright
        Retourne les données extraites incluant $196 Maximum Used
        """
        print(f"\n💊 Capture: Maximums & Deductibles pour {subscriber_id}")

        if not self.page:
            await self.login_and_setup()

        # Naviguer vers PesSignIn
        await self.page.goto(f"{self.base_url}/prov/execute/PesSignIn")
        await self.page.wait_for_timeout(2000)

        # Entrer le subscriber ID
        print(f"  📝 Entrer subscriber ID: {subscriber_id}")
        await self.page.fill('input[type="text"]', subscriber_id)
        await self.page.press('input[type="text"]', 'Enter')
        await self.page.wait_for_timeout(3000)

        # Si un nom de membre est fourni, le sélectionner
        if member_name:
            print(f"  👤 Sélection du membre: {member_name}")
            member_link = self.page.locator(f'a:has-text("{member_name}")')
            if await member_link.count() > 0:
                await member_link.first.click()
                await self.page.wait_for_timeout(3000)

        # Sélectionner un provider (le premier disponible)
        print("  👨‍⚕️ Sélection d'un provider...")
        provider_radio = self.page.locator('input[type="radio"]').first
        if await provider_radio.count() > 0:
            await provider_radio.click()
            await self.page.wait_for_timeout(2000)

        # Cliquer sur Maximums & Deductibles
        print("  📊 Navigation vers Maximums & Deductibles...")
        max_ded_link = self.page.locator('a:has-text("Maximums & Deductibles")')
        if await max_ded_link.count() > 0:
            await max_ded_link.click()
            await self.page.wait_for_timeout(3000)
        else:
            # Essayer avec un bouton
            max_ded_btn = self.page.locator('button:has-text("Maximums & Deductibles")')
            if await max_ded_btn.count() > 0:
                await max_ded_btn.click()
                await self.page.wait_for_timeout(3000)

        # Extraire le contenu HTML
        content = await self.page.content()

        # Parser les données
        maximums_data = self.parse_maximums_data(content)
        maximums_data['url'] = self.page.url
        maximums_data['subscriber_id'] = subscriber_id
        if member_name:
            maximums_data['member_name'] = member_name

        return maximums_data

    def parse_maximums_data(self, html: str) -> Dict:
        """Parser les données de la page Maximums & Deductibles"""
        data = {
            'plan_maximum': None,
            'maximum_used_to_date': None,
            'maximum_remaining': None,
            'deductible': None,
            'deductible_met': None,
            'age_limits': [],
            'coverage_details': []
        }

        # Maximum Used to Date (le fameux $196)
        used_match = re.search(r'Maximum Used to Date[:\s]*\$([\d,]+(?:\.\d{2})?)', html)
        if used_match:
            data['maximum_used_to_date'] = f"${used_match.group(1)}"
            print(f"    ✅ Trouvé: Maximum Used to Date {data['maximum_used_to_date']}")

        # Plan Maximum
        plan_max = re.search(r'Plan Maximum[:\s]*\$([\d,]+)', html)
        if plan_max:
            data['plan_maximum'] = f"${plan_max.group(1)}"
            print(f"    ✅ Trouvé: Plan Maximum {data['plan_maximum']}")

        # Maximum Remaining
        remaining = re.search(r'Maximum Remaining[:\s]*\$([\d,]+(?:\.\d{2})?)', html)
        if remaining:
            data['maximum_remaining'] = f"${remaining.group(1)}"

        # Deductible info
        deductible = re.search(r'Deductible[:\s]*\$([\d,]+)', html)
        if deductible:
            data['deductible'] = f"${deductible.group(1)}"

        # Age limits (ex: "Up to age 26")
        age_limits = re.findall(r'Up to age (\d+)', html)
        if age_limits:
            data['age_limits'] = [f"Up to age {age}" for age in age_limits]
            print(f"    ✅ Trouvé: {', '.join(data['age_limits'])}")

        # Coverage percentages
        coverage = re.findall(r'(\d+)% coverage', html, re.IGNORECASE)
        if coverage:
            data['coverage_details'] = [f"{pct}% coverage" for pct in coverage]

        return data

    def get_providers_api(self, employer_group: str = "37302") -> Optional[List]:
        """
        API Endpoint 2: /prov/execute/MultipleProviders
        Retourne: Liste des dentistes/providers
        """
        print(f"\n👨‍⚕️ API: Récupération des providers...")

        session = self.get_api_session()

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
            print(f"❌ Erreur API: {response.status_code}")
            return None

    def parse_patient_data(self, html: str) -> Dict:
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

    def parse_providers(self, html: str) -> List[Dict]:
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

    async def extract_complete(self, patients: List[tuple]) -> Dict:
        """
        Extraction complète pour plusieurs patients
        Combine API et capture Playwright
        Format: [(subscriber_id, last_name), ...]
        """
        print("\n🚀 EXTRACTION COMPLÈTE METLIFE")
        print("="*60)

        # Login une fois
        await self.login_and_setup()

        results = []

        for subscriber_id, last_name in patients:
            patient_result = {
                'subscriber_id': subscriber_id,
                'search_name': last_name
            }

            # 1. Données patient via API
            patient_data = self.search_patient_api(subscriber_id, last_name)
            if patient_data:
                patient_result.update(patient_data)
                print(f"  ✅ API: {len(patient_data.get('members', []))} membres trouvés")

                # 2. Capturer Maximums & Deductibles pour le premier membre
                if patient_data.get('members'):
                    first_member = patient_data['members'][0]['name']
                    maximums = await self.capture_maximums_page(subscriber_id, first_member)
                    patient_result['maximums_deductibles'] = maximums

                    if maximums.get('maximum_used_to_date'):
                        print(f"  ✅ Playwright: {maximums['maximum_used_to_date']} Maximum Used")
            else:
                patient_result['error'] = 'Extraction API échouée'
                print(f"  ❌ {last_name}: Échec API")

            results.append(patient_result)

            # Pause entre patients
            await asyncio.sleep(2)

        # 3. Récupérer les providers une fois via API
        providers = self.get_providers_api()

        # Fermer le navigateur
        if self.browser:
            await self.browser.close()

        return {
            'extraction_date': datetime.now().isoformat(),
            'patients': results,
            'providers': providers,
            'extraction_method': 'hybrid_complete'
        }

    async def cleanup(self):
        """Nettoyer les ressources"""
        if self.browser:
            await self.browser.close()

async def main():
    """Exemple d'utilisation complète"""
    extractor = MetLifeCompleteExtractor()

    # Liste des patients à extraire
    patients = [
        ("635140654", "Tedford"),
        # Ajouter d'autres patients ici si nécessaire
    ]

    try:
        # Extraction complète
        results = await extractor.extract_complete(patients)

        # Sauvegarder les résultats
        with open('metlife_complete_results.json', 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        print(f"\n✅ EXTRACTION TERMINÉE!")
        print(f"📊 {len(results['patients'])} patients traités")
        print(f"👨‍⚕️ {len(results.get('providers', []))} providers trouvés")
        print(f"💾 Résultats: metlife_complete_results.json")

        # Afficher un résumé détaillé
        for patient in results['patients']:
            if 'error' not in patient:
                print(f"\n📋 {patient['search_name']} ({patient['subscriber_id']}):")
                
                # Membres
                for member in patient.get('members', []):
                    print(f"  • {member['name']} ({member.get('dob', 'N/A')})")
                
                # Maximums & Deductibles
                if 'maximums_deductibles' in patient:
                    max_data = patient['maximums_deductibles']
                    if max_data.get('maximum_used_to_date'):
                        print(f"  💰 Maximum Used: {max_data['maximum_used_to_date']}")
                    if max_data.get('plan_maximum'):
                        print(f"  💎 Plan Maximum: {max_data['plan_maximum']}")
                    if max_data.get('age_limits'):
                        print(f"  📅 Age Limits: {', '.join(max_data['age_limits'])}")

    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await extractor.cleanup()

if __name__ == "__main__":
    asyncio.run(main())