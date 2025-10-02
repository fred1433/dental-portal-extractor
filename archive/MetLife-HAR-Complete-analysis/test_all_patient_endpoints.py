#!/usr/bin/env python3
"""
Script pour tester TOUS les endpoints possibles pour obtenir la liste des patients
"""
import requests
import json
import base64
from urllib.parse import quote

def get_session():
    """Charger la session sauvegardée"""
    with open('metlife_session_hybrid.json', 'r') as f:
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

def test_endpoints():
    print("🔍 TEST DE TOUS LES ENDPOINTS PATIENTS")
    print("="*60)

    base_url = "https://metdental.metlife.com/prov/execute/"
    session = get_session()

    # Headers communs
    headers = {
        'Referer': 'https://metdental.metlife.com/prov/execute/PesSignIn',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0'
    }

    # ENDPOINTS À TESTER
    endpoints_to_test = [
        # Endpoints qu'on a vus dans les liens
        ('entryClaim', 'GET', None),  # View Claims - TRÈS PROMETTEUR !
        ('entryElig', 'GET', None),   # Eligibility
        ('entrySubmit', 'GET', None),  # Submit claims

        # Endpoints logiques pour liste patients
        ('PatientList', 'GET', None),
        ('PatientRoster', 'GET', None),
        ('ViewAllPatients', 'GET', None),
        ('SearchPatient', 'GET', None),
        ('RecentPatients', 'GET', None),
        ('TodayPatients', 'GET', None),
        ('ClaimsList', 'GET', None),
        ('ClaimsHistory', 'GET', None),
        ('ViewClaims', 'GET', None),
        ('BatchPatients', 'GET', None),
        ('ExportPatients', 'GET', None),
        ('DownloadRoster', 'GET', None),

        # Variations du Content endpoint
        ('Content?page=patientlist', 'GET', None),
        ('Content?page=roster', 'GET', None),
        ('Content?page=claims', 'GET', None),

        # Essayer avec POST et des paramètres vides
        ('SearchPatient', 'POST', {'lastName': '', 'firstName': ''}),
        ('PatientSearch', 'POST', {'searchTerm': '*'}),
        ('QuickSearch', 'POST', {'query': ''}),

        # Endpoints plus génériques
        ('List', 'GET', None),
        ('Search', 'GET', None),
        ('Browse', 'GET', None),
        ('Directory', 'GET', None),
        ('Registry', 'GET', None),

        # Endpoints spécifiques MetLife qu'on pourrait avoir
        ('PesPatientList', 'GET', None),
        ('PesViewAll', 'GET', None),
        ('PesClaims', 'GET', None),
        ('PesRoster', 'GET', None),

        # Endpoints avec dates (patients récents)
        ('RecentActivity', 'GET', None),
        ('DailyPatients', 'GET', None),
        ('MonthlyPatients', 'GET', None),
    ]

    results = []

    for endpoint, method, data in endpoints_to_test:
        url = base_url + endpoint

        try:
            if method == 'GET':
                response = session.get(url, headers=headers, timeout=5)
            else:  # POST
                response = session.post(url, headers=headers, data=data or {}, timeout=5)

            # Analyser la réponse
            if response.status_code == 200:
                content_length = len(response.text)

                # Chercher des indices de liste de patients
                indicators = {
                    'patient_count': response.text.count('SSN') + response.text.count('subscriber'),
                    'has_table': '<table' in response.text or '<TABLE' in response.text,
                    'has_list': '<ul' in response.text or '<ol' in response.text,
                    'has_multiple_names': response.text.count('TEDFORD') > 1,
                    'has_view_all': 'view all' in response.text.lower() or 'viewall' in response.text.lower(),
                    'has_export': 'export' in response.text.lower() or 'download' in response.text.lower()
                }

                score = sum(1 for v in indicators.values() if v)

                # Si ça a l'air prometteur
                if score >= 2 or content_length > 50000 or indicators['has_table']:
                    print(f"\n✅ {endpoint} ({method}) - PROMETTEUR!")
                    print(f"   Taille: {content_length/1024:.1f}KB")
                    print(f"   Score: {score}/6")
                    for key, val in indicators.items():
                        if val:
                            print(f"   • {key}: {val}")

                    # Sauvegarder pour analyse
                    filename = f"endpoint_{endpoint.replace('/', '_').replace('?', '_')}.html"
                    with open(filename, 'w') as f:
                        f.write(response.text)
                    print(f"   📁 Sauvé: {filename}")

                    results.append({
                        'endpoint': endpoint,
                        'score': score,
                        'size': content_length,
                        'file': filename
                    })
                else:
                    print(f"· {endpoint} ({method}) - {response.status_code} - {content_length} bytes")

            elif response.status_code in [302, 301]:
                print(f"→ {endpoint} ({method}) - Redirection vers: {response.headers.get('Location', '?')}")
            elif response.status_code == 401:
                print(f"🔒 {endpoint} ({method}) - Non autorisé (session expirée?)")
            elif response.status_code == 404:
                print(f"✗ {endpoint} ({method}) - N'existe pas")
            else:
                print(f"? {endpoint} ({method}) - Code: {response.status_code}")

        except requests.exceptions.Timeout:
            print(f"⏱ {endpoint} ({method}) - Timeout")
        except Exception as e:
            print(f"❌ {endpoint} ({method}) - Erreur: {str(e)[:50]}")

    # Résumé
    print("\n" + "="*60)
    print("📊 RÉSUMÉ")
    print("="*60)

    if results:
        print("\n🎯 ENDPOINTS PROMETTEURS:")
        sorted_results = sorted(results, key=lambda x: x['score'], reverse=True)
        for r in sorted_results[:5]:
            print(f"  • {r['endpoint']} (Score: {r['score']}, Taille: {r['size']/1024:.1f}KB)")
            print(f"    → Fichier: {r['file']}")
    else:
        print("❌ Aucun endpoint prometteur trouvé")

    print("\n💡 PROCHAINES ÉTAPES:")
    print("1. Examiner les fichiers HTML sauvegardés")
    print("2. Tester entryClaim en naviguant manuellement")
    print("3. Essayer de laisser le champ de recherche vide sur PesSignIn")

if __name__ == "__main__":
    test_endpoints()