#!/usr/bin/env python3
"""
Test : Utiliser UNIQUEMENT l'API sans Playwright après avoir une session
"""
import json
import requests
import base64
from urllib.parse import quote

def test_api_with_saved_session():
    print("🧪 TEST: API pure avec session sauvegardée")
    print("="*60)

    # Charger la session sauvegardée
    try:
        with open('metlife_session_hybrid.json.backup', 'r') as f:
            session_data = json.load(f)
    except:
        with open('metlife_session_hybrid.json', 'r') as f:
            session_data = json.load(f)

    # Créer une session requests avec les cookies
    session = requests.Session()

    print("📍 Cookies importants:")
    for cookie in session_data['cookies']:
        session.cookies.set(
            cookie['name'],
            cookie['value'],
            domain=cookie.get('domain', ''),
            path=cookie.get('path', '/')
        )

        # Afficher les cookies importants
        if cookie['name'] in ['JSESSIONID', 'PA.MetLife_US_MD', 'AuthTimeStamp']:
            print(f"  • {cookie['name']}: {cookie['value'][:30]}...")

    # Construire le pepText pour Tedford
    pep_data = "^up34~0^^up406~FALSE^^up202~635140654^^up400~plan^^up401~82159477163195^^up111~false^^up50~payorportal4771^^up14~82159477163195"
    pep_b64 = base64.b64encode(pep_data.encode()).decode()
    pep_encoded = quote(pep_b64)

    # Faire la requête API DIRECTEMENT
    print("\n📡 Requête API directe (sans Playwright)...")
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
        headers={
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': 'https://metdental.metlife.com/prov/execute/PesSignIn'
        }
    )

    print(f"📊 Résultat: {response.status_code}")

    if response.status_code == 200:
        print("✅ SUCCÈS! Les données sont récupérées par API pure!")

        # Vérifier le contenu
        if 'TEDFORD' in response.text.upper():
            print("✅ Données TEDFORD trouvées!")

            # Compter les membres
            import re
            members = re.findall(r'TEDFORD', response.text.upper())
            print(f"   → {len(members)} occurrences de TEDFORD")

            # Sauvegarder pour analyse
            with open('api_only_response.html', 'w') as f:
                f.write(response.text)
            print("💾 Sauvegardé dans api_only_response.html")

        return True
    else:
        print(f"❌ Échec: {response.status_code}")
        print("   La session est peut-être expirée")
        return False

if __name__ == "__main__":
    success = test_api_with_saved_session()

    if success:
        print("\n🎉 CONCLUSION:")
        print("=" * 60)
        print("✅ On peut utiliser l'API SANS Playwright!")
        print("✅ Juste besoin des cookies de session")
        print("✅ Pas besoin de naviguer dans l'interface")
        print("\nWorkflow optimal:")
        print("1. Login UNE FOIS avec Playwright")
        print("2. Sauvegarder la session")
        print("3. Utiliser l'API directement (jusqu'à expiration)")
    else:
        print("\n⚠️ Session expirée, nouveau login nécessaire")