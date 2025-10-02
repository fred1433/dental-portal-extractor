#!/usr/bin/env python3
import json
import sys
from urllib.parse import urlparse, parse_qs
from collections import defaultdict

def analyze_har(har_file):
    """
    Analyse un fichier HAR pour extraire les endpoints API intéressants
    """
    with open(har_file, 'r') as f:
        har_data = json.load(f)

    entries = har_data.get('log', {}).get('entries', [])

    # Catégoriser les requêtes
    api_calls = defaultdict(list)
    graphql_queries = []
    interesting_responses = []

    print(f"\n📊 Analyse de {len(entries)} requêtes\n")
    print("="*80)

    for entry in entries:
        request = entry['request']
        response = entry['response']
        url = request['url']
        parsed = urlparse(url)

        # Ignorer les ressources statiques et analytics
        skip_domains = ['cdn', 'analytics', 'metrics', 'omtrdc', 'glassbox', 'qualtrics']
        if any(d in parsed.hostname for d in skip_domains):
            continue

        # Capturer les appels API
        if '/api/' in url:
            endpoint = parsed.path
            method = request['method']

            # Catégoriser par type d'API
            if 'graphql' in endpoint:
                # Extraire la query GraphQL
                if request.get('postData'):
                    try:
                        body = json.loads(request['postData']['text'])
                        query_name = body.get('operationName', 'Unknown')
                        graphql_queries.append({
                            'name': query_name,
                            'url': url,
                            'variables': body.get('variables', {}),
                            'response_status': response['status']
                        })
                    except:
                        pass
            else:
                api_calls[endpoint].append({
                    'method': method,
                    'url': url,
                    'status': response['status'],
                    'params': parse_qs(parsed.query)
                })

            # Capturer les réponses intéressantes
            if response['status'] == 200 and response.get('content', {}).get('text'):
                try:
                    response_data = json.loads(response['content']['text'])
                    # Chercher des données patient/eligibility
                    if any(key in str(response_data).lower() for key in ['patient', 'member', 'eligibility', 'claim', 'benefit']):
                        interesting_responses.append({
                            'url': endpoint,
                            'data_keys': list(response_data.keys()) if isinstance(response_data, dict) else 'array',
                            'sample': str(response_data)[:200]
                        })
                except:
                    pass

    # Afficher les résultats
    print("\n🔌 ENDPOINTS API TROUVÉS:")
    print("-"*40)
    for endpoint, calls in sorted(api_calls.items()):
        methods = set(c['method'] for c in calls)
        statuses = set(c['status'] for c in calls)
        print(f"\n{endpoint}")
        print(f"  Méthodes: {', '.join(methods)}")
        print(f"  Status: {', '.join(map(str, statuses))}")
        if calls[0]['params']:
            print(f"  Params: {list(calls[0]['params'].keys())}")

    print("\n\n📋 REQUÊTES GRAPHQL:")
    print("-"*40)
    for query in graphql_queries:
        print(f"\n{query['name']}")
        print(f"  Status: {query['response_status']}")
        if query['variables']:
            print(f"  Variables: {list(query['variables'].keys())}")

    if interesting_responses:
        print("\n\n💡 RÉPONSES INTÉRESSANTES (patient/eligibility/claims):")
        print("-"*40)
        for resp in interesting_responses[:5]:  # Limiter à 5
            print(f"\n{resp['url']}")
            print(f"  Clés: {resp['data_keys']}")
            print(f"  Aperçu: {resp['sample']}...")

    # Sauvegarder l'analyse
    analysis = {
        'api_endpoints': dict(api_calls),
        'graphql_queries': graphql_queries,
        'interesting_responses': interesting_responses
    }

    output_file = har_file.replace('.har', '_analysis.json')
    with open(output_file, 'w') as f:
        json.dump(analysis, f, indent=2)

    print(f"\n\n💾 Analyse sauvegardée dans: {output_file}")

    return analysis

if __name__ == "__main__":
    if len(sys.argv) > 1:
        har_file = sys.argv[1]
    else:
        har_file = "uhc_requests.har"

    try:
        analyze_har(har_file)
    except FileNotFoundError:
        print(f"❌ Fichier {har_file} introuvable.")
        print("Lancez d'abord ./launch_codegen.sh pour capturer les requêtes.")
    except Exception as e:
        print(f"❌ Erreur: {e}")