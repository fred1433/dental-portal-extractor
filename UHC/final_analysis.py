#!/usr/bin/env python3
import json

def final_analysis():
    with open('HAR-for-jace.json', 'r') as f:
        har_data = json.load(f)

    print("=== ANALYSE COMPLÈTE DES ENDPOINTS UHC ===\n")

    # Endpoints identifiés avec leurs données
    endpoints_found = {
        'member': {'found': False, 'returns_data': False, 'purpose': 'Obtenir memberContrivedKey'},
        'eligsummary': {'found': False, 'returns_data': False, 'purpose': 'Obtenir données d\'éligibilité et productId'},
        'benefitsummary': {'found': False, 'returns_data': False, 'purpose': 'Obtenir détails des bénéfices par catégorie'},
        'claimsummary': {'found': False, 'returns_data': False, 'purpose': 'Historique des réclamations'},
        'treatmentplan': {'found': False, 'returns_data': False, 'purpose': 'Plans de traitement soumis/approuvés'},
        'utilizationHistory': {'found': False, 'returns_data': False, 'purpose': 'Historique d\'utilisation des services dentaires'},
        'webcache': {'found': False, 'returns_data': False, 'purpose': 'Cache pour optimisation'},
        'eliglastviewed': {'found': False, 'returns_data': False, 'purpose': 'Tracker dernière consultation'}
    }

    # Analyser chaque entrée HAR
    for entry in har_data['log']['entries']:
        url = entry['request']['url']

        # Vérifier si c'est un endpoint UHC API
        if '/apps/dental/' in url:
            for endpoint_name in endpoints_found.keys():
                if f'/apps/dental/{endpoint_name}' in url:
                    endpoints_found[endpoint_name]['found'] = True

                    # Vérifier s'il y a du contenu de réponse
                    if ('content' in entry['response'] and
                        'text' in entry['response']['content'] and
                        entry['response']['content']['text'] and
                        len(entry['response']['content']['text']) > 50):  # Ignorer les réponses très courtes

                        endpoints_found[endpoint_name]['returns_data'] = True
                        endpoints_found[endpoint_name]['response'] = entry['response']['content']['text']
                        endpoints_found[endpoint_name]['url'] = url
                        endpoints_found[endpoint_name]['method'] = entry['request']['method']
                        endpoints_found[endpoint_name]['status'] = entry['response']['status']

    # Rapport complet
    print("1. ENDPOINTS ACTUELLEMENT UTILISÉS PAR NOTRE SCRIPT:")
    print("=" * 60)
    current_endpoints = ['member', 'eligsummary', 'benefitsummary']

    for ep in current_endpoints:
        data = endpoints_found[ep]
        status = "✅ TROUVÉ" if data['found'] else "❌ NON TROUVÉ"
        has_data = "AVEC DONNÉES" if data['returns_data'] else "SANS DONNÉES"
        print(f"  {ep.upper():<15} - {status} - {has_data}")
        print(f"                Purpose: {data['purpose']}")

        if data['returns_data'] and 'response' in data:
            try:
                json_resp = json.loads(data['response'])
                if isinstance(json_resp, list):
                    print(f"                Retourne: Array avec {len(json_resp)} éléments")
                elif isinstance(json_resp, dict):
                    print(f"                Retourne: Object avec {len(json_resp)} clés")
            except:
                print(f"                Retourne: {len(data['response'])} caractères de données")
        print()

    print("\n2. ENDPOINTS MANQUANTS (POTENTIELLEMENT IMPORTANTS):")
    print("=" * 60)
    missing_endpoints = ['claimsummary', 'treatmentplan', 'utilizationHistory']

    for ep in missing_endpoints:
        data = endpoints_found[ep]
        status = "✅ TROUVÉ" if data['found'] else "❌ NON TROUVÉ"
        has_data = "AVEC DONNÉES" if data['returns_data'] else "SANS DONNÉES"
        importance = "🔥 CRITIQUE" if ep in ['claimsummary', 'utilizationHistory'] else "⚠️ UTILE"

        print(f"  {ep.upper():<18} - {status} - {has_data} - {importance}")
        print(f"                     Purpose: {data['purpose']}")

        if data['returns_data'] and 'response' in data:
            try:
                json_resp = json.loads(data['response'])
                if isinstance(json_resp, dict) and 'result' in json_resp:
                    result = json_resp['result']
                    if isinstance(result, dict):
                        print(f"                     Structure: {list(result.keys())}")
                        # Analyser plus en détail pour utilizationHistory
                        if ep == 'utilizationHistory' and 'dentalServiceHistory' in result:
                            history = result['dentalServiceHistory']
                            if 'procedures' in history:
                                print(f"                     Procédures disponibles: {len(history['procedures'])}")
                elif isinstance(json_resp, list):
                    print(f"                     Retourne: Array avec {len(json_resp)} éléments")
            except Exception as e:
                print(f"                     Retourne: Données non-JSON ({len(data['response'])} chars)")
        print()

    print("\n3. AUTRES ENDPOINTS:")
    print("=" * 60)
    other_endpoints = ['webcache', 'eliglastviewed']

    for ep in other_endpoints:
        data = endpoints_found[ep]
        status = "✅ TROUVÉ" if data['found'] else "❌ NON TROUVÉ"
        has_data = "AVEC DONNÉES" if data['returns_data'] else "SANS DONNÉES"
        print(f"  {ep.upper():<15} - {status} - {has_data}")
        print(f"                Purpose: {data['purpose']}")
        print()

    print("\n4. ANALYSE ET RECOMMANDATIONS:")
    print("=" * 60)

    utilization_data = endpoints_found.get('utilizationHistory', {})
    if utilization_data.get('returns_data'):
        print("🔥 CRITIQUE: L'endpoint 'utilizationHistory' retourne des données importantes!")
        print("   - Contient l'historique complet des services dentaires")
        print("   - Inclut les procédures, fréquences, limites d'âge")
        print("   - RECOMMANDATION: Ajouter cet endpoint à notre script")
        print()

    claims_data = endpoints_found.get('claimsummary', {})
    if claims_data.get('found'):
        print("⚠️ L'endpoint 'claimsummary' est disponible mais ne retourne pas de données dans ce HAR")
        print("   - Peut contenir l'historique des réclamations")
        print("   - RECOMMANDATION: Tester avec différents paramètres")
        print()

    treatment_data = endpoints_found.get('treatmentplan', {})
    if treatment_data.get('found'):
        print("ℹ️ L'endpoint 'treatmentplan' est disponible")
        print("   - Peut contenir les plans de traitement pré-approuvés")
        print("   - RECOMMANDATION: Évaluer si nécessaire selon les besoins")
        print()

    print("\n5. CONCLUSION:")
    print("=" * 60)
    print("Notre script UHC actuel utilise 3 endpoints sur 8 disponibles.")
    print("L'endpoint 'utilizationHistory' semble ESSENTIEL et devrait être ajouté.")
    print("Cela donnerait un workflow à 4 étapes au lieu de 3.")
    print()
    print("WORKFLOW RECOMMANDÉ:")
    print("1. POST /member → obtenir memberContrivedKey")
    print("2. POST /eligsummary → obtenir productId et données d'éligibilité")
    print("3. GET /benefitsummary → obtenir détails des bénéfices")
    print("4. GET /utilizationHistory → obtenir historique des services ⭐ NOUVEAU")

    # Afficher les détails de utilizationHistory si disponible
    if utilization_data.get('returns_data') and 'response' in utilization_data:
        print("\n6. DÉTAILS DE L'ENDPOINT utilizationHistory:")
        print("=" * 60)
        try:
            json_resp = json.loads(utilization_data['response'])
            if isinstance(json_resp, dict) and 'result' in json_resp:
                result = json_resp['result']
                if 'dentalServiceHistory' in result:
                    history = result['dentalServiceHistory']
                    print(f"URL: {utilization_data.get('url', 'N/A')}")
                    print(f"Méthode: {utilization_data.get('method', 'N/A')}")
                    print(f"Membre: {history.get('memberName', {})}")
                    print(f"Relation: {history.get('memberRelationship', 'N/A')}")
                    print(f"Nombre de procédures: {len(history.get('procedures', []))}")

                    if 'procedures' in history and history['procedures']:
                        print("\nExemples de procédures disponibles:")
                        for i, proc in enumerate(history['procedures'][:3]):  # Show first 3
                            print(f"  - {proc.get('procedure', {}).get('codeValue', 'N/A')}: {proc.get('procedure', {}).get('codeDesc', 'N/A')}")
                        if len(history['procedures']) > 3:
                            print(f"  ... et {len(history['procedures']) - 3} autres procédures")
        except Exception as e:
            print(f"Erreur d'analyse: {e}")

if __name__ == "__main__":
    final_analysis()