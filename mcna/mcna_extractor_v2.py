#!/usr/bin/env python3
"""
MCNA Patient Data Extractor - Version finale
==============================================
Basé sur le codegen capturé avec persistent context
"""

import json
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from playwright.sync_api import sync_playwright

# Importer le solver de CAPTCHA
from captcha_solver import (
    solve_captcha_with_openai,
    detect_captcha,
    wait_for_manual_captcha_resolution,
    click_captcha_begin_if_present
)


class MCNAExtractor:
    """Extracteur MCNA utilisant persistent context"""

    def __init__(self, headless: bool = False, username: str = None, password: str = None):
        """
        Args:
            headless: Mode headless (False recommandé pour debug/CAPTCHAs)
            username: MCNA username (optionnel)
            password: MCNA password (optionnel)
        """
        self.headless = headless
        self.username = username
        self.password = password

        # Créer le profil persistent s'il n'existe pas
        profile_path = Path("/tmp/mcna_test_profile")
        profile_path.mkdir(parents=True, exist_ok=True)

    def search_and_extract(self, patient_info: Dict) -> Optional[Dict]:
        """
        Recherche un patient et extrait toutes ses données

        Args:
            patient_info: Dict avec clés:
                - dob: Date de naissance (MM/DD/YYYY)
                - subscriber_id: Numéro d'abonné
                - last_name: Nom
                - first_name: Prénom
                - zip_code: Code postal
                - facility_id: ID établissement (default: 71025)

        Returns:
            Dict avec toutes les données extraites ou None si erreur
        """
        print(f"\n🔍 Searching: {patient_info.get('first_name')} {patient_info.get('last_name')}")

        with sync_playwright() as playwright:
            # UTILISER PERSISTENT CONTEXT comme pour le login!
            context = playwright.chromium.launch_persistent_context(
                user_data_dir="/tmp/mcna_test_profile",
                headless=self.headless,
                channel="chrome",
                args=['--disable-blink-features=AutomationControlled']
            )
            page = context.pages[0] if context.pages else context.new_page()

            try:
                # Navigation basée sur codegen
                print("📍 Navigating to provider page...")
                page.goto("https://portal.mcna.net/provider")

                # Vérifier si redirigé vers login (session expirée)
                time.sleep(2)
                if "/login" in page.url:
                    print("\n🔐 On login page - logging in...")

                    if not self.username or not self.password:
                        print("❌ No credentials provided!")
                        print("💡 Either provide credentials or run: python3 test_persistent.py")
                        return None

                    # Faire le login
                    if not self._login(page):
                        print("❌ Login failed!")
                        return None

                    print("✅ Login successful!")

                    # Retourner à la page provider
                    page.goto("https://portal.mcna.net/provider")
                    time.sleep(2)

                # Vérifier si CAPTCHA apparaît
                time.sleep(1)

                if detect_captcha(page):
                    print("\n🤖 CAPTCHA DETECTED - Attempting automatic resolution...")

                    # Essayer résolution automatique avec OpenAI (3 tentatives)
                    if solve_captcha_with_openai(page, max_retries=3):
                        print("✅ CAPTCHA resolved automatically!")
                    else:
                        print("⚠️  Automatic resolution failed, requesting manual help...")
                        # Fallback: intervention humaine
                        if not wait_for_manual_captcha_resolution(page):
                            print("❌ CAPTCHA timeout!")
                            return None

                # RE-VÉRIFIER si on est sur /login après CAPTCHA
                time.sleep(2)
                if "/login" in page.url:
                    print("\n🔐 Redirected to login after CAPTCHA - logging in...")

                    if not self.username or not self.password:
                        print("❌ No credentials provided!")
                        return None

                    if not self._login(page):
                        print("❌ Login failed!")
                        return None

                    # Retourner à provider
                    page.goto("https://portal.mcna.net/provider")
                    time.sleep(2)

                print("🔍 Opening Verify Eligibility...")
                page.get_by_role("link", name="Verify Eligibility").click(timeout=60000)

                # Remplir le formulaire (basé sur codegen)
                print("📋 Filling search form...")

                # Facility ID
                facility_id = patient_info.get('facility_id', '71025')
                page.locator("#facilitySelect").select_option(facility_id)

                # Date de naissance
                page.locator("#verifyDob").fill(patient_info['dob'])

                # Subscriber ID
                page.locator("#verifySubscriberId").fill(patient_info['subscriber_id'])

                # Nom
                page.locator("#verifyLastName").fill(patient_info['last_name'])

                # Prénom
                page.locator("#verifyFirstName").fill(patient_info['first_name'])

                # Code postal
                page.locator("#verifyZip").fill(patient_info['zip_code'])

                # Soumettre
                print("🔍 Searching for subscriber...")
                page.get_by_role("button", name="Search for Subscriber").click()

                # Attendre les résultats
                page.wait_for_load_state("networkidle")

                print(f"✅ Results loaded - URL: {page.url}")

                # Vérifier si patient trouvé
                if page.locator('text="Subscriber is Eligible"').count() > 0:
                    print("✅ Patient found and ELIGIBLE!")
                    status = "ELIGIBLE"
                elif page.locator('text="not eligible"').count() > 0:
                    print("⚠️  Patient found but NOT eligible")
                    status = "NOT_ELIGIBLE"
                else:
                    print("❌ Patient not found")
                    return None

                # Extraire toutes les données
                data = self._extract_all_data(page, patient_info, status)

                return data

            except Exception as e:
                print(f"❌ Error during search: {e}")
                # Screenshot pour debug
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                page.screenshot(path=f"error_{timestamp}.png")
                print(f"📸 Screenshot saved: error_{timestamp}.png")
                return None

            finally:
                context.close()

    def _login(self, page) -> bool:
        """
        Se connecte au portail MCNA

        Returns:
            True si succès, False sinon
        """
        try:
            print("   📝 Filling username...")
            page.fill('#loginUsername', self.username)

            print("   🔑 Filling password...")
            # Utiliser loginPasswordPlain (pas loginPassword)
            page.fill('#loginPasswordPlain', self.password)

            # Attendre que le bouton s'active
            time.sleep(1)

            print("   📤 Clicking Sign In...")
            # Le bouton peut être disabled, utiliser evaluate pour forcer le clic
            page.evaluate("document.getElementById('loginButton').click()")

            # Attendre navigation ou CAPTCHA
            print("   ⏳ Waiting for login response...")
            time.sleep(4)

            # Gérer CAPTCHA si présent
            if detect_captcha(page):
                print("   🤖 CAPTCHA after login - solving...")
                if not solve_captcha_with_openai(page):
                    print("   ❌ CAPTCHA failed")
                    return False
                time.sleep(2)

            # Vérifier si MFA (Duo Security)
            if "duosecurity.com" in page.url or "mfa" in page.url.lower():
                print("\n" + "="*60)
                print("🔐 MFA/2FA DETECTED (Duo Security)")
                print("="*60)
                print("👆 Please complete MFA in the browser")
                print("⏱️  Waiting up to 3 minutes...")
                print("="*60 + "\n")

                # Utiliser wait_for_url de Playwright (plus robuste)
                try:
                    print("   ⏳ Waiting for redirect to provider page...")
                    page.wait_for_url("**/provider**", timeout=180000)  # 3 minutes
                    print("\n✅ MFA completed! On provider page")
                    time.sleep(2)  # Stabiliser
                    return True
                except:
                    print("\n❌ MFA timeout - did not reach provider page")
                    return False

            # Vérifier qu'on est bien sur /provider
            time.sleep(2)
            if "/provider" in page.url:
                print("   ✅ Login successful!")
                return True
            else:
                print(f"   ⚠️  On page: {page.url}")
                return True

        except Exception as e:
            print(f"   ❌ Login error: {e}")
            return False

    def _extract_all_data(self, page, search_info: Dict, status: str) -> Dict:
        """Extrait toutes les données de la page de résultats"""
        print("📊 Extracting data...")

        data = {
            'search_info': search_info,
            'extraction_date': datetime.now().isoformat(),
            'url': page.url,
            'eligibility_status': status
        }

        # Nom complet (grand titre)
        name_elem = page.locator('div[style*="font-size: 24px"]')
        if name_elem.count() > 0:
            data['full_name'] = name_elem.text_content().strip()
            print(f"   👤 Name: {data['full_name']}")

        # Extraire les champs avec labels
        labels = {
            'Subscriber ID:': 'subscriber_id',
            'Date of Birth:': 'date_of_birth',
            'Group:': 'group',
            'Plan:': 'plan',
            'County:': 'county',
            'Address:': 'address'
        }

        for label, key in labels.items():
            elem = page.locator(f'.eligLabel:has-text("{label}")')
            if elem.count() > 0:
                parent = elem.locator('xpath=..')
                text = parent.text_content().replace(label, '').strip()
                data[key] = text

        # Texte d'éligibilité complet (peut avoir plusieurs éléments)
        elig_text_elems = page.locator('.eligTextNormal').all()
        for elem in elig_text_elems:
            elig_text = elem.text_content()

            # Plan détail
            if 'plan' in elig_text.lower():
                plan_match = re.search(r'on the ([^plan]+) plan', elig_text)
                if plan_match:
                    data['plan_detail'] = plan_match.group(1).strip()

            # Date éligibilité
            if 'eligible for benefits' in elig_text.lower():
                date_match = re.search(r'became eligible for benefits on ([^.]+)', elig_text)
                if date_match:
                    data['eligible_since'] = date_match.group(1).strip()

        # Confirmation number
        conf_elem = page.locator('text=/Confirmation: #\\d+/')
        if conf_elem.count() > 0:
            conf_match = re.search(r'#(\d+)', conf_elem.text_content())
            if conf_match:
                data['confirmation_number'] = conf_match.group(1)

        # Main Dental Home
        dental_elem = page.locator('text=/Main Dental Home provider is/')
        if dental_elem.count() > 0:
            provider_match = re.search(r'provider is ([^.]+)', dental_elem.text_content())
            if provider_match:
                data['main_dental_home'] = provider_match.group(1).strip()

        # Historique de traitement
        data['treatment_history'] = self._extract_treatments(page)

        # Périodes d'éligibilité
        data['eligibility_periods'] = self._extract_periods(page)

        # Benefits alerts
        alerts = page.locator('#benefitsAlert .advisoryText').all_text_contents()
        if alerts:
            data['benefits_alerts'] = alerts

        print(f"✅ Extracted data:")
        print(f"   - Status: {data['eligibility_status']}")
        print(f"   - Treatments: {len(data['treatment_history'])}")
        print(f"   - Periods: {len(data['eligibility_periods'])}")

        return data

    def _extract_treatments(self, page) -> List[Dict]:
        """Extrait l'historique de traitement"""
        treatments = []

        try:
            # Trouver la table avec "Date of Service"
            tables = page.locator('table').all()

            for table in tables:
                text = table.text_content()
                if "Date of Service" in text and "CDT and Description" in text:
                    rows = table.locator('tr').all()
                    current_date = ''

                    for i, row in enumerate(rows):
                        if i == 0:  # Header
                            continue

                        cells = row.locator('td').all()
                        if len(cells) >= 5:
                            date_text = cells[0].text_content().strip()
                            code_desc = cells[1].text_content().strip()

                            # Mettre à jour la date courante si présente
                            if date_text and re.match(r'\d{2}/\d{2}/\d{4}', date_text):
                                current_date = date_text

                            # Ajouter le traitement si code présent
                            if code_desc:
                                treatment = {
                                    'date': date_text or current_date,
                                    'code_and_description': code_desc,
                                    'quantity': cells[2].text_content().strip(),
                                    'tooth_area': cells[3].text_content().strip(),
                                    'surface': cells[4].text_content().strip()
                                }

                                # Séparer code et description
                                if ':' in code_desc:
                                    parts = code_desc.split(':', 1)
                                    treatment['code'] = parts[0].strip()
                                    treatment['description'] = parts[1].strip()

                                treatments.append(treatment)

                    break  # Table trouvée

        except Exception as e:
            print(f"⚠️  Treatment extraction error: {e}")

        return treatments

    def _extract_periods(self, page) -> List[Dict]:
        """Extrait les périodes d'éligibilité"""
        periods = []

        try:
            tables = page.locator('table').all()

            for table in tables:
                text = table.text_content()
                if "Plan Name" in text and "Effective Date" in text and "Termination Date" in text:
                    rows = table.locator('tr').all()

                    for i, row in enumerate(rows):
                        if i == 0:  # Header
                            continue

                        cells = row.locator('td').all()
                        if len(cells) >= 3:
                            plan_name = cells[0].text_content().strip()

                            if plan_name:  # Ne pas ajouter lignes vides
                                period = {
                                    'plan': plan_name,
                                    'effective_date': cells[1].text_content().strip(),
                                    'termination_date': cells[2].text_content().strip() or 'Active'
                                }
                                periods.append(period)

                    break  # Table trouvée

        except Exception as e:
            print(f"⚠️  Periods extraction error: {e}")

        return periods

    def save_data(self, data: Dict, filename: str = None, output_dir: str = "data") -> str:
        """
        Sauvegarde les données dans le dossier data/

        Args:
            data: Données à sauvegarder
            filename: Nom du fichier (auto-généré si None)
            output_dir: Dossier de sortie (default: data/)

        Returns:
            Chemin du fichier créé
        """
        # Créer le dossier de sortie s'il n'existe pas
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)

        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            patient_name = data.get('full_name', 'unknown').replace(' ', '_').replace(',', '').replace('.', '')
            filename = f"mcna_{patient_name}_{timestamp}.json"

        # Construire le chemin complet
        filepath = output_path / filename

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"💾 Data saved to: {filepath}")
        return str(filepath)


def main():
    """Exemple d'utilisation"""
    import os
    from dotenv import load_dotenv

    # Charger .env
    load_dotenv(Path(__file__).parent.parent / '.env')

    print("="*60)
    print("🦷 MCNA PATIENT DATA EXTRACTOR")
    print("="*60)

    # Credentials depuis .env (optionnel - utilisés si session expirée)
    username = os.environ.get('MCNA_USERNAME')
    password = os.environ.get('MCNA_PASSWORD')

    if username and password:
        print(f"✅ Using credentials from .env for user: {username}")
    else:
        print("⚠️  No credentials in .env - will need valid session")

    # Patient de test (changez selon besoin)
    test_patient = {
        'dob': '03/05/2019',
        'subscriber_id': '731720947',
        'last_name': 'Mazariegos',
        'first_name': 'Emmajoy',
        'zip_code': '75189',
        'facility_id': '71025'
    }

    try:
        extractor = MCNAExtractor(
            headless=False,  # Set to True for production headless mode
            username=username if username else None,
            password=password if password else None
        )

        # Rechercher et extraire
        data = extractor.search_and_extract(test_patient)

        if data:
            # Sauvegarder
            filename = extractor.save_data(data)

            # Afficher résumé
            print("\n" + "="*60)
            print("📊 EXTRACTION SUMMARY")
            print("="*60)
            print(f"Patient: {data.get('full_name', 'N/A')}")
            print(f"Status: {data.get('eligibility_status')}")
            print(f"Plan: {data.get('plan', 'N/A')}")
            print(f"Treatments: {len(data.get('treatment_history', []))}")
            print(f"File: {filename}")
            print("="*60)

    except FileNotFoundError as e:
        print(str(e))
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    main()