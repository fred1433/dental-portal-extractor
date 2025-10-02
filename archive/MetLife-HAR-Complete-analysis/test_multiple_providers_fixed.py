#!/usr/bin/env python3
"""
Test MultipleProviders avec les VRAIS paramètres du HAR
"""
import json
import requests
import base64
from urllib.parse import quote

def test_multiple_providers_with_exact_params():
    print("🔧 TEST: MultipleProviders avec paramètres EXACTS du HAR")
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

    # UTILISER LES PARAMÈTRES EXACTS DU HAR
    # parms décodé du HAR
    parms_decoded = "^EmployerBranchGroup~0001^^EmployerSubdivisionGroup~0001^^PlanDate~09-23-2025^^PatientName~Self^^MemberCoverage~4^^EmployerGroup~37302^^PpoInd~1^^CovType~2^^RelationshipCode~0^^RelationshipDesc~Self^^DependentSequenceNumber~1^^EffectiveDate~01/01/2024^"
    parms_b64 = base64.b64encode(parms_decoded.encode()).decode()
    parms_encoded = quote(parms_b64)

    # pepText exact du HAR (avec SSN masqué)
    pep_decoded = "^up34~0^^up200~XXXXXXXXX^^up205~true^^up206~37302^^up207~37302^^up405~PEPSICO INC^^up406~FALSE^^up202~080284933^^up400~plan^^up203~KENNETH R TEDFORD^^up401~821594771^^up402~63195^^up204~75482^^up506~false^^up24~N^^up310~Tedford^^mp112~true^^up311~false^^mp111~false^^mp110~1^^up50~payorportal4771^^up14~821594771^^up12~63195^^up13~1^^up10~SAINT LOUIS^^up11~MO^^up07~Provider^^up08~CHILDREN'S DENTAL AT PRESTON TRAI^^up700~true^^up209~1^^up03~payorportal@sdbmail.com^^npi04~63195^^up04~0082159477^^up01~Access^^npi01~Y^^up02~Portal^^up46~N^^ppo03~true^^npi07~Access^^up00~Portal Access^^npi08~MO^^ppo01~true^^ppo02~false^^npi06~P^^up211~2^^up213~PEPSICO INC^^up214~1^"
    pep_b64 = base64.b64encode(pep_decoded.encode()).decode()
    pep_encoded = quote(pep_b64)

    print("\n📡 Envoi requête avec paramètres EXACTS du HAR...")

    response = session.post(
        'https://metdental.metlife.com/prov/execute/MultipleProviders',
        data={
            'parms': parms_encoded,
            'fwdName': '',
            'formName': '',
            'appPath': '',
            'pepText': pep_encoded
        },
        headers={
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': 'https://metdental.metlife.com/prov/execute/PesSignIn'
        }
    )

    print(f"📊 Status: {response.status_code}")
    print(f"📏 Taille: {len(response.text):,} octets")

    if response.status_code == 200:
        # Vérifier le contenu
        if 'Jennifer' in response.text or 'Chou' in response.text or 'chou' in response.text.lower():
            print("✅ SUCCÈS! Jennifer Chou trouvée!")

            # Compter les providers
            import re
            # Pattern pour trouver les noms (format: Nom, Prénom)
            providers = re.findall(r'([A-Z][a-z]+),\s*([A-Z][a-z]+)', response.text)
            if providers:
                print(f"👨‍⚕️ {len(set(providers))} providers trouvés:")
                for last, first in set(providers[:5]):
                    print(f"   • Dr. {first} {last}")

            # Sauvegarder
            with open('multiple_providers_success.html', 'w') as f:
                f.write(response.text)
            print("\n💾 Sauvegardé: multiple_providers_success.html")
            return True

        elif 'error' in response.text.lower():
            print("❌ Erreur dans la réponse")
            # Extraire le message d'erreur
            clean = re.sub(r'<[^>]+>', ' ', response.text)
            error_match = re.search(r'error[^.]*\.', clean, re.IGNORECASE)
            if error_match:
                print(f"   Message: {error_match.group(0)}")
        else:
            print("⚠️ Réponse inattendue")

    with open('multiple_providers_test.html', 'w') as f:
        f.write(response.text)

    return False

if __name__ == "__main__":
    success = test_multiple_providers_with_exact_params()

    if success:
        print("\n🎉 MultipleProviders FONCTIONNE!")
        print("On peut maintenant extraire:")
        print("  1. LastName → Membres famille")
        print("  2. MultipleProviders → Liste providers/dentistes")
    else:
        print("\n⚠️ Il faut probablement une navigation complète")
        print("Les paramètres dépendent du contexte de navigation")