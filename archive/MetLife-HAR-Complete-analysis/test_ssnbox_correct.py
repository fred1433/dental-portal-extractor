#!/usr/bin/env python3
"""
Test SSNBox avec différents paramètres
"""
import json
import requests
import base64
from urllib.parse import quote

def test_ssnbox():
    print("🔍 TEST: SSNBox avec différents InputID")
    print("="*60)

    # Charger la session
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

    # pepText standard
    pep_data = "^up34~0^^up406~FALSE^^up202~635140654^^up400~plan^^up401~82159477163195^^up111~false^^up50~payorportal4771^^up14~82159477163195"
    pep_b64 = base64.b64encode(pep_data.encode()).decode()
    pep_encoded = quote(pep_b64)

    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://metdental.metlife.com/prov/execute/PesSignIn'
    }

    # Test 1: Avec 'chou' (provider)
    print("\n1️⃣ Test avec InputID='chou' (provider):")
    response = session.post(
        'https://metdental.metlife.com/prov/execute/SSNBox',
        data={
            'pepText': pep_encoded,
            'RbtOption': 'Eligibility',
            'InputID': 'chou'
        },
        headers=headers
    )
    print(f"   Status: {response.status_code}, Taille: {len(response.text):,} octets")
    if 'chou' in response.text.lower():
        print("   ✅ Données 'chou' trouvées")

    with open('ssnbox_chou.html', 'w') as f:
        f.write(response.text)

    # Test 2: Avec '635140654' (subscriber ID)
    print("\n2️⃣ Test avec InputID='635140654' (subscriber ID):")
    response = session.post(
        'https://metdental.metlife.com/prov/execute/SSNBox',
        data={
            'pepText': pep_encoded,
            'RbtOption': 'Eligibility',
            'InputID': '635140654'
        },
        headers=headers
    )
    print(f"   Status: {response.status_code}, Taille: {len(response.text):,} octets")
    if 'TEDFORD' in response.text.upper():
        print("   ✅ Données TEDFORD trouvées")

    with open('ssnbox_subscriber.html', 'w') as f:
        f.write(response.text)

    # Test 3: Avec 'TEDFORD' (nom)
    print("\n3️⃣ Test avec InputID='TEDFORD' (nom):")
    response = session.post(
        'https://metdental.metlife.com/prov/execute/SSNBox',
        data={
            'pepText': pep_encoded,
            'RbtOption': 'Eligibility',
            'InputID': 'TEDFORD'
        },
        headers=headers
    )
    print(f"   Status: {response.status_code}, Taille: {len(response.text):,} octets")
    if 'TEDFORD' in response.text.upper():
        print("   ✅ Données TEDFORD trouvées")

    # Analyser ce que chaque test retourne
    print("\n📊 ANALYSE des résultats:")

    import re
    for filename in ['ssnbox_chou.html', 'ssnbox_subscriber.html']:
        with open(filename, 'r') as f:
            content = f.read()
            clean = re.sub(r'<[^>]+>', ' ', content)
            clean = re.sub(r'\s+', ' ', clean)

            print(f"\n{filename}:")
            # Chercher des patterns intéressants
            if 'duplicate' in clean.lower():
                print("  ⚠️ Message sur duplicates")
            if 'enter' in clean.lower() and 'last name' in clean.lower():
                print("  📝 Demande d'entrer le nom de famille")
            if 'error' in clean.lower():
                print("  ❌ Message d'erreur")

            # Afficher un extrait
            print(f"  Extrait: {clean[200:400]}...")

if __name__ == "__main__":
    test_ssnbox()