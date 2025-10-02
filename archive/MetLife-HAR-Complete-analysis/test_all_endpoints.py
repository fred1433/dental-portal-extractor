#!/usr/bin/env python3
"""
Test TOUS les endpoints découverts
"""
import json
import requests
import base64
from urllib.parse import quote, unquote

def test_all_endpoints():
    print("🧪 TEST DES 3 ENDPOINTS")
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

    # Token pepText de base
    pep_data = "^up34~0^^up406~FALSE^^up202~635140654^^up400~plan^^up401~82159477163195^^up111~false^^up50~payorportal4771^^up14~82159477163195"
    pep_b64 = base64.b64encode(pep_data.encode()).decode()
    pep_encoded = quote(pep_b64)

    # Headers communs
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://metdental.metlife.com/prov/execute/PesSignIn'
    }

    # 1. TEST LastName (déjà connu)
    print("\n1️⃣ /prov/execute/LastName")
    print("-" * 40)
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
        headers=headers
    )
    print(f"  Status: {response.status_code}")
    if response.status_code == 200:
        print(f"  Taille: {len(response.text):,} octets")
        if 'TEDFORD' in response.text.upper():
            print("  ✅ Données TEDFORD trouvées")

    # 2. TEST MultipleProviders
    print("\n2️⃣ /prov/execute/MultipleProviders")
    print("-" * 40)

    # Décoder le parms du HAR
    parms_b64 = "XkVtcGxveWVyQnJhbmNoR3JvdXB%2BMDAwMV5eRW1wbG95ZXJT"
    # Continuer le reste...
    parms_full = parms_b64 + "dWJzaWRpYXJ5fjMwMTM5OTIzNV5eRW1wbG95ZXJOYW1lflBFUFNJQ08gSU5DXl5wZXAyMDF%2BUEVQU0lDTyBJTkNeXnBlcDUwNH41ODQzNTczNTE%3D"

    response = session.post(
        'https://metdental.metlife.com/prov/execute/MultipleProviders',
        data={
            'pepText': pep_encoded,
            'parms': parms_full,
            'fwdName': '',
            'formName': '',
            'appPath': ''
        },
        headers=headers
    )
    print(f"  Status: {response.status_code}")
    if response.status_code == 200:
        print(f"  Taille: {len(response.text):,} octets")

        # Analyser le contenu
        if 'Maximum' in response.text or 'maximum' in response.text.lower():
            print("  ✅ Contient 'Maximum'!")
        if '196' in response.text:
            print("  ✅ Contient '196'!")
        if '$' in response.text:
            import re
            amounts = re.findall(r'\$(\d+)', response.text)
            if amounts:
                print(f"  💰 Montants trouvés: {amounts[:5]}")

        # Sauvegarder
        with open('test_multiple_providers.html', 'w') as f:
            f.write(response.text)
        print("  💾 Sauvegardé dans test_multiple_providers.html")

    # 3. TEST SSNBox
    print("\n3️⃣ /prov/execute/SSNBox")
    print("-" * 40)
    response = session.post(
        'https://metdental.metlife.com/prov/execute/SSNBox',
        data={
            'pepText': pep_encoded,
            'RbtOption': 'Eligibility',
            'InputID': '635140654'  # Essayer avec le subscriber ID
        },
        headers=headers
    )
    print(f"  Status: {response.status_code}")
    if response.status_code == 200:
        print(f"  Taille: {len(response.text):,} octets")
        if 'TEDFORD' in response.text.upper():
            print("  ✅ Données TEDFORD trouvées")

        # Sauvegarder
        with open('test_ssnbox.html', 'w') as f:
            f.write(response.text)
        print("  💾 Sauvegardé dans test_ssnbox.html")

if __name__ == "__main__":
    test_all_endpoints()