#!/usr/bin/env python3
"""
Test de l'endpoint Content - probablement les détails d'éligibilité!
"""
import json
import requests
import base64
from urllib.parse import quote

def test_content_endpoint():
    print("🎯 TEST: /prov/execute/Content")
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

    # Construire pepText standard
    pep_data = "^up34~0^^up406~FALSE^^up202~635140654^^up400~plan^^up401~82159477163195^^up111~false^^up50~payorportal4771^^up14~82159477163195"
    pep_b64 = base64.b64encode(pep_data.encode()).decode()
    pep_encoded = quote(pep_b64)

    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://metdental.metlife.com/prov/execute/LastName'
    }

    print("\n1️⃣ Test GET Content (simple):")
    response = session.get(
        'https://metdental.metlife.com/prov/execute/Content',
        headers={'Referer': 'https://metdental.metlife.com/prov/execute/LastName'}
    )
    print(f"   GET Status: {response.status_code}, Taille: {len(response.text):,} octets")

    print("\n2️⃣ Test POST Content avec pepText:")
    response = session.post(
        'https://metdental.metlife.com/prov/execute/Content',
        data={
            'pepText': pep_encoded,
            'fwdName': '',
            'formName': '',
            'appPath': ''
        },
        headers=headers
    )
    print(f"   POST Status: {response.status_code}, Taille: {len(response.text):,} octets")

    if response.status_code == 200:
        content = response.text

        # Chercher des données importantes
        if '196' in content:
            print("   ✅ Contient '196'!")
        if 'Maximum' in content or 'maximum' in content.lower():
            print("   ✅ Contient 'Maximum'!")
        if '$' in content:
            import re
            amounts = re.findall(r'\$(\d+)', content)
            if amounts:
                print(f"   💰 Montants trouvés: ${amounts[:10]}")
        if 'TEDFORD' in content.upper():
            print("   ✅ Contient TEDFORD!")
        if 'benefit' in content.lower():
            print("   ✅ Contient 'benefit'!")
        if 'deductible' in content.lower():
            print("   ✅ Contient 'deductible'!")
        if 'coverage' in content.lower():
            print("   ✅ Contient 'coverage'!")

        # Sauvegarder
        with open('content_endpoint.html', 'w') as f:
            f.write(content)
        print("\n   💾 Sauvegardé: content_endpoint.html")

        # Extraire un aperçu
        import re
        clean = re.sub(r'<[^>]+>', ' ', content)
        clean = re.sub(r'\s+', ' ', clean)
        print(f"\n   Aperçu: {clean[:300]}...")

    # Test 3: Avec des paramètres supplémentaires possibles
    print("\n3️⃣ Test POST Content avec paramètres patient:")
    response = session.post(
        'https://metdental.metlife.com/prov/execute/Content',
        data={
            'pepText': pep_encoded,
            'subscriberId': '635140654',
            'memberName': 'KENNETH R TEDFORD',
            'patientName': 'KENNETH R TEDFORD',
            'fwdName': '',
            'formName': '',
            'appPath': ''
        },
        headers=headers
    )
    print(f"   POST Status: {response.status_code}, Taille: {len(response.text):,} octets")

    if response.status_code == 200 and len(response.text) > 1000:
        with open('content_endpoint_with_params.html', 'w') as f:
            f.write(response.text)
        print("   💾 Sauvegardé: content_endpoint_with_params.html")

if __name__ == "__main__":
    test_content_endpoint()