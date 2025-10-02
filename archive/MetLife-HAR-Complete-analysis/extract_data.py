#!/usr/bin/env python3
"""
Extracteur de données MetLife basé sur l'analyse HAR
Utilise les endpoints découverts pour extraire les données
"""
import json
import requests
import os
from datetime import datetime
from typing import Dict, List, Any

class MetLifeDataExtractor:
    def __init__(self, auth_file='metlife_auth.json', summary_file='har_summary.json'):
        """
        Initialise l'extracteur avec les données d'auth et le résumé HAR
        """
        self.session = requests.Session()
        self.base_url = "https://online.metlife.com"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache'
        }

        # Charger l'authentification
        if os.path.exists(auth_file):
            with open(auth_file, 'r') as f:
                auth_data = json.load(f)
                self.cookies = auth_data.get('cookies', [])
                self.storage = auth_data.get('origins', [])
                print(f"✓ Auth chargée depuis {auth_file}")
                self._setup_session()
        else:
            print(f"⚠️ Fichier {auth_file} non trouvé. Lancez d'abord la capture.")

        # Charger le résumé HAR
        self.api_endpoints = {}
        if os.path.exists(summary_file):
            with open(summary_file, 'r') as f:
                summary = json.load(f)
                self.api_endpoints = summary.get('api_endpoints', {})
                self.interesting_entries = summary.get('interesting_entries', [])
                print(f"✓ {len(self.api_endpoints)} endpoints chargés depuis {summary_file}")

    def _setup_session(self):
        """Configure la session avec les cookies capturés"""
        for cookie in self.cookies:
            self.session.cookies.set(
                cookie['name'],
                cookie['value'],
                domain=cookie.get('domain', ''),
                path=cookie.get('path', '/')
            )

    def test_session(self):
        """Teste si la session est valide"""
        print("\n🔐 Test de la session...")

        # Chercher un endpoint simple dans nos découvertes
        test_endpoints = [
            '/api/user/profile',
            '/api/provider/info',
            '/api/dashboard',
            '/edge/api/user'
        ]

        for endpoint in test_endpoints:
            if endpoint in self.api_endpoints:
                url = f"{self.base_url}{endpoint}"
                try:
                    response = self.session.get(url, headers=self.headers, timeout=10)
                    print(f"  {endpoint}: {response.status_code}")
                    if response.status_code == 200:
                        print(f"  ✅ Session valide!")
                        return True
                except Exception as e:
                    print(f"  ❌ Erreur: {e}")

        print("  ⚠️ Session peut être expirée. Relancez la capture.")
        return False

    def get_patients(self):
        """Récupère la liste des patients"""
        print("\n👥 Récupération des patients...")

        # Chercher les endpoints patient dans nos découvertes
        patient_endpoints = [
            endpoint for endpoint in self.api_endpoints.keys()
            if any(word in endpoint.lower() for word in ['patient', 'member', 'subscriber'])
        ]

        if not patient_endpoints:
            print("  ⚠️ Aucun endpoint patient trouvé. Naviguez vers les patients lors de la capture.")
            return []

        patients = []
        for endpoint in patient_endpoints[:3]:  # Tester les 3 premiers
            url = f"{self.base_url}{endpoint}"
            try:
                response = self.session.get(url, headers=self.headers, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    print(f"  ✓ Données récupérées depuis {endpoint}")
                    patients.append(data)
                    break
            except Exception as e:
                print(f"  ❌ Erreur sur {endpoint}: {e}")

        return patients

    def get_eligibility(self, patient_id=None):
        """Récupère les informations d'éligibilité"""
        print("\n✅ Récupération de l'éligibilité...")

        # Chercher les endpoints eligibility
        eligibility_endpoints = [
            endpoint for endpoint in self.api_endpoints.keys()
            if any(word in endpoint.lower() for word in ['eligibility', 'benefit', 'coverage'])
        ]

        if not eligibility_endpoints:
            print("  ⚠️ Aucun endpoint éligibilité trouvé.")
            return None

        for endpoint in eligibility_endpoints[:3]:
            url = f"{self.base_url}{endpoint}"
            if patient_id and '{' in endpoint:  # Endpoint paramétré
                url = url.replace('{patientId}', str(patient_id))
                url = url.replace('{memberId}', str(patient_id))

            try:
                response = self.session.get(url, headers=self.headers, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    print(f"  ✓ Éligibilité récupérée depuis {endpoint}")
                    return data
            except Exception as e:
                print(f"  ❌ Erreur sur {endpoint}: {e}")

        return None

    def get_claims(self):
        """Récupère l'historique des réclamations"""
        print("\n📋 Récupération des réclamations...")

        # Chercher les endpoints claims
        claims_endpoints = [
            endpoint for endpoint in self.api_endpoints.keys()
            if any(word in endpoint.lower() for word in ['claim', 'eob', 'payment'])
        ]

        if not claims_endpoints:
            print("  ⚠️ Aucun endpoint réclamation trouvé.")
            return []

        claims = []
        for endpoint in claims_endpoints[:3]:
            url = f"{self.base_url}{endpoint}"
            try:
                response = self.session.get(url, headers=self.headers, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    print(f"  ✓ Réclamations récupérées depuis {endpoint}")
                    claims.append(data)
                    break
            except Exception as e:
                print(f"  ❌ Erreur sur {endpoint}: {e}")

        return claims

    def extract_all_data(self):
        """Extraction complète basée sur les endpoints découverts"""
        print("\n" + "="*60)
        print("🚀 EXTRACTION COMPLÈTE DES DONNÉES METLIFE")
        print("="*60)

        results = {
            'extraction_date': datetime.now().isoformat(),
            'session_valid': False,
            'patients': [],
            'eligibility': [],
            'claims': [],
            'raw_endpoints': {}
        }

        # Tester la session
        results['session_valid'] = self.test_session()

        if results['session_valid']:
            # Extraire les données
            results['patients'] = self.get_patients()
            results['eligibility'] = self.get_eligibility()
            results['claims'] = self.get_claims()

            # Essayer tous les endpoints intéressants
            print("\n🔍 Test des endpoints découverts...")
            for entry in self.interesting_entries[:10]:  # Top 10
                endpoint = entry.get('url', '')
                if endpoint.startswith('http'):
                    endpoint = endpoint.replace(self.base_url, '')

                if endpoint and endpoint not in results['raw_endpoints']:
                    try:
                        url = f"{self.base_url}{endpoint}"
                        response = self.session.get(url, headers=self.headers, timeout=5)
                        if response.status_code == 200:
                            results['raw_endpoints'][endpoint] = {
                                'status': 'success',
                                'sample': str(response.text[:200])
                            }
                            print(f"  ✓ {endpoint}")
                    except:
                        pass

        # Sauvegarder les résultats
        output_file = f"metlife_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)

        print(f"\n💾 Données sauvegardées dans {output_file}")
        return results

    def display_summary(self, results):
        """Affiche un résumé des données extraites"""
        print("\n" + "="*60)
        print("📊 RÉSUMÉ DE L'EXTRACTION")
        print("="*60)

        print(f"\nSession valide: {'✅' if results['session_valid'] else '❌'}")
        print(f"Patients trouvés: {len(results['patients'])}")
        print(f"Données d'éligibilité: {len(results['eligibility'])}")
        print(f"Réclamations trouvées: {len(results['claims'])}")
        print(f"Endpoints testés: {len(results['raw_endpoints'])}")

        if results['raw_endpoints']:
            print("\n✅ Endpoints fonctionnels:")
            for endpoint in list(results['raw_endpoints'].keys())[:5]:
                print(f"  • {endpoint}")

def main():
    print("🏥 MetLife Data Extractor")
    print("="*60)

    # Vérifier les fichiers nécessaires
    if not os.path.exists('metlife_auth.json'):
        print("\n❌ metlife_auth.json non trouvé!")
        print("Instructions:")
        print("1. Lancez ./launch_codegen.sh")
        print("2. Connectez-vous et naviguez dans MetLife")
        print("3. Relancez ce script")
        return

    if not os.path.exists('har_summary.json'):
        print("\n⚠️ har_summary.json non trouvé.")
        print("Lancez d'abord: python analyze_har.py")

    # Initialiser l'extracteur
    extractor = MetLifeDataExtractor()

    # Extraire les données
    results = extractor.extract_all_data()

    # Afficher le résumé
    extractor.display_summary(results)

if __name__ == "__main__":
    main()