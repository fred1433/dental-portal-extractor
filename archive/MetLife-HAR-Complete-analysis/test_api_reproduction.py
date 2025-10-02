#!/usr/bin/env python3
"""
Test de reproduction de l'appel API MetLife
Valider qu'on peut vraiment reproduire la requête #158
"""
import json
import requests
from urllib.parse import unquote

def test_api_reproduction():
    """Tester si on peut reproduire l'appel API avec les données du HAR"""

    print("🧪 TEST DE REPRODUCTION DE L'API")
    print("="*60)

    # Charger le HAR
    with open('metlife_requests.har', 'r') as f:
        har = json.load(f)

    # Récupérer la requête #158 (LastName)
    entry = har['log']['entries'][158]
    request = entry['request']
    original_response = entry['response']

    print(f"📍 Endpoint: {request['method']} {request['url']}")
    print(f"📊 Réponse originale: {original_response['status']} - {len(original_response['content']['text'])} octets")
    print()

    # Extraire les cookies
    cookies = {}
    for header in request['headers']:
        if header['name'].lower() == 'cookie':
            cookie_string = header['value']
            for cookie in cookie_string.split('; '):
                if '=' in cookie:
                    name, value = cookie.split('=', 1)
                    cookies[name] = value

    print(f"🍪 Cookies extraits: {len(cookies)} cookies")

    # Les cookies les plus importants
    important_cookies = ['JSESSIONID', 'PA.MetLife_US_MD', 'AuthTimeStamp', 'PA_S']
    for cookie_name in important_cookies:
        if cookie_name in cookies:
            print(f"  ✓ {cookie_name}: {cookies[cookie_name][:30]}...")
        else:
            print(f"  ✗ {cookie_name}: MANQUANT")

    # Extraire les headers
    headers = {}
    for header in request['headers']:
        name = header['name']
        # Ignorer certains headers
        if name.lower() not in ['cookie', ':authority', ':method', ':path', ':scheme',
                                'accept-encoding', 'content-length']:
            headers[name] = header['value']

    print(f"\n📋 Headers extraits: {len(headers)} headers")

    # Extraire les données POST
    post_data = request['postData']['text'] if request.get('postData') else None

    if post_data:
        print(f"\n📨 Données POST: {len(post_data)} caractères")
        # Parser les paramètres
        params = {}
        for param in post_data.split('&'):
            if '=' in param:
                key, value = param.split('=', 1)
                params[key] = unquote(value)

        for key, value in params.items():
            if key == 'pepText':
                print(f"  • {key}: [Token encodé - {len(value)} caractères]")
            else:
                print(f"  • {key}: {value[:50]}..." if len(value) > 50 else f"  • {key}: {value}")

    print("\n" + "="*60)
    print("🚀 TENTATIVE DE REPRODUCTION")
    print("="*60)

    # Charger la session auth depuis le fichier JSON
    try:
        with open('metlife_auth.json', 'r') as f:
            auth_data = json.load(f)

        print("✅ Session auth chargée depuis metlife_auth.json")

        # Utiliser les cookies de la session sauvegardée
        fresh_cookies = {}
        for cookie in auth_data.get('cookies', []):
            fresh_cookies[cookie['name']] = cookie['value']

        # Remplacer les cookies importants
        for cookie_name in important_cookies:
            if cookie_name in fresh_cookies:
                cookies[cookie_name] = fresh_cookies[cookie_name]
                print(f"  ↻ Mis à jour: {cookie_name}")
    except:
        print("⚠️ Impossible de charger metlife_auth.json - utilisation des cookies du HAR")

    print("\n🔄 Envoi de la requête...")

    try:
        # Envoyer la requête
        response = requests.post(
            request['url'],
            headers=headers,
            cookies=cookies,
            data=post_data,
            verify=False,  # Ignorer les certificats SSL
            timeout=30
        )

        print(f"\n📡 Réponse reçue:")
        print(f"  • Status: {response.status_code}")
        print(f"  • Taille: {len(response.text)} octets")
        print(f"  • Content-Type: {response.headers.get('content-type', 'unknown')}")

        # Comparer avec l'original
        print(f"\n📊 COMPARAISON:")
        print(f"  • Status original: {original_response['status']}")
        print(f"  • Status reproduit: {response.status_code}")
        print(f"  • Taille originale: {len(original_response['content']['text'])} octets")
        print(f"  • Taille reproduite: {len(response.text)} octets")

        if response.status_code == original_response['status']:
            print("\n✅ Status identique!")

            # Vérifier si on a les données TEDFORD
            if 'TEDFORD' in response.text.upper():
                print("✅ Données TEDFORD trouvées dans la réponse!")

                # Compter les occurrences
                count = response.text.upper().count('TEDFORD')
                print(f"   → TEDFORD apparaît {count} fois")

                # Vérifier AVERLY
                if 'AVERLY' in response.text.upper():
                    print("✅ AVERLY trouvé aussi!")

                # Sauvegarder la réponse
                with open('reproduced_response.html', 'w') as f:
                    f.write(response.text)
                print("\n💾 Réponse sauvegardée dans reproduced_response.html")

                return True
            else:
                print("⚠️ Pas de données TEDFORD dans la réponse")
                print("   → La session a peut-être expiré ou il manque des tokens")

                # Chercher des indices d'erreur
                if 'login' in response.text.lower() or 'session' in response.text.lower():
                    print("   → Semble être une page de login/session expirée")

                # Sauvegarder pour analyse
                with open('failed_response.html', 'w') as f:
                    f.write(response.text)
                print("\n💾 Réponse (échec) sauvegardée dans failed_response.html")
        else:
            print(f"\n❌ Status différent: {response.status_code} vs {original_response['status']}")

            if response.status_code == 302:
                print("   → Redirection détectée")
                print(f"   → Location: {response.headers.get('location', 'unknown')}")
            elif response.status_code == 401:
                print("   → Non autorisé - problème d'authentification")
            elif response.status_code == 403:
                print("   → Interdit - token CSRF ou sécurité")

            with open('error_response.html', 'w') as f:
                f.write(response.text)
            print("\n💾 Réponse d'erreur sauvegardée dans error_response.html")

    except requests.exceptions.RequestException as e:
        print(f"\n❌ Erreur lors de la requête: {e}")
        return False

    print("\n" + "="*60)
    print("📋 ANALYSE DES PROBLÈMES POTENTIELS")
    print("="*60)

    # Analyser ce qui pourrait manquer
    print("\n🔍 Tokens/éléments à vérifier:")

    # 1. CSRF Token
    csrf_found = False
    for header_name in headers:
        if 'csrf' in header_name.lower() or 'xsrf' in header_name.lower():
            csrf_found = True
            print(f"  • CSRF Header trouvé: {header_name}")

    if not csrf_found and post_data:
        if 'csrf' in post_data.lower() or 'token' in post_data.lower():
            print("  • Token dans POST data")

    # 2. Timestamp
    if 'AuthTimeStamp' in cookies:
        print(f"  • AuthTimeStamp présent: {cookies['AuthTimeStamp'][:20]}...")
        # Décoder si base64
        try:
            import base64
            decoded = base64.b64decode(cookies['AuthTimeStamp']).decode()
            print(f"    Décodé: {decoded}")
        except:
            pass

    # 3. Session
    if 'JSESSIONID' in cookies:
        print(f"  • JSESSIONID: {cookies['JSESSIONID'][:30]}...")

    print("\n💡 RECOMMANDATIONS:")
    print("  1. Si session expirée → Relancer ./launch_codegen.sh")
    print("  2. Si token manquant → Analyser plus de requêtes du HAR")
    print("  3. Si CSRF → Chercher le token dans les requêtes précédentes")

    return False

if __name__ == "__main__":
    # Désactiver les warnings SSL
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    success = test_api_reproduction()

    if success:
        print("\n🎉 SUCCÈS! L'API est reproductible!")
        print("On peut maintenant:")
        print("  1. Modifier les paramètres pour d'autres patients")
        print("  2. Chercher l'endpoint avec 'Maximum Used to Date'")
    else:
        print("\n⚠️ L'API n'est pas directement reproductible")
        print("Il faut analyser plus en détail les tokens et la session")