#!/usr/bin/env python3
"""
Analyseur HAR intelligent pour MetLife
Lit progressivement le fichier HAR sans exploser les tokens
"""
import json
import sys
import os
from urllib.parse import urlparse, parse_qs, unquote
from collections import defaultdict
from datetime import datetime
import base64

class MetLifeHARAnalyzer:
    def __init__(self, har_file='metlife_requests.har'):
        self.har_file = har_file
        if os.path.exists(har_file):
            self.file_size = os.path.getsize(har_file) / (1024 * 1024)  # MB
            print(f"📁 Fichier HAR: {har_file} ({self.file_size:.2f} MB)")
        else:
            print(f"❌ Fichier {har_file} non trouvé")
            sys.exit(1)

    def extract_summary(self):
        """Première passe: extraire un résumé sans charger tout le contenu"""
        print("\n🔍 ANALYSE DU FICHIER HAR - PHASE 1: RÉSUMÉ")
        print("="*60)

        with open(self.har_file, 'r') as f:
            har_data = json.load(f)

        entries = har_data.get('log', {}).get('entries', [])
        print(f"📊 Total: {len(entries)} requêtes capturées\n")

        summary = {
            'total_requests': len(entries),
            'timestamp': datetime.now().isoformat(),
            'api_endpoints': defaultdict(lambda: {'count': 0, 'methods': set(), 'statuses': set()}),
            'graphql_queries': defaultdict(int),
            'domains': defaultdict(int),
            'cookies': set(),
            'auth_tokens': {},
            'interesting_entries': [],
            'patient_related': [],
            'eligibility_related': [],
            'claims_related': []
        }

        # Patterns à rechercher
        interesting_patterns = {
            'patient': ['patient', 'member', 'subscriber', 'dependent'],
            'eligibility': ['eligibility', 'benefit', 'coverage', 'plan'],
            'claims': ['claim', 'eob', 'payment', 'authorization'],
            'provider': ['provider', 'dentist', 'practice', 'office']
        }

        for i, entry in enumerate(entries):
            request = entry['request']
            response = entry['response']
            url = request['url']
            parsed = urlparse(url)
            domain = parsed.hostname

            # Compter les domaines
            if domain:
                summary['domains'][domain] += 1

            # Ignorer les ressources statiques
            if any(ext in url for ext in ['.png', '.jpg', '.gif', '.css', '.woff', '.ico']):
                continue

            # Ignorer les domaines de tracking/analytics
            skip_domains = ['google', 'facebook', 'doubleclick', 'analytics',
                          'googletagmanager', 'adobe', 'omniture']
            if domain and any(d in domain.lower() for d in skip_domains):
                continue

            # Analyser les cookies et tokens
            for header in request.get('headers', []):
                name = header['name'].lower()
                value = header['value']

                if name == 'cookie':
                    cookies = value.split('; ')
                    for cookie in cookies:
                        if '=' in cookie:
                            cookie_name = cookie.split('=')[0]
                            if any(key in cookie_name.lower() for key in
                                  ['token', 'session', 'auth', 'jwt', 'api']):
                                summary['cookies'].add(cookie_name)

                elif name in ['authorization', 'x-auth-token', 'x-api-key', 'x-session-id']:
                    summary['auth_tokens'][name] = value[:50] + '...' if len(value) > 50 else value

            # Analyser les endpoints API
            if '/api/' in url or 'service' in url or 'rest' in url:
                endpoint = parsed.path
                method = request['method']
                status = response['status']

                summary['api_endpoints'][endpoint]['count'] += 1
                summary['api_endpoints'][endpoint]['methods'].add(method)
                summary['api_endpoints'][endpoint]['statuses'].add(status)

                # Marquer comme intéressant
                url_lower = url.lower()
                for category, patterns in interesting_patterns.items():
                    if any(p in url_lower for p in patterns):
                        entry_info = {
                            'index': i,
                            'url': url,
                            'method': method,
                            'status': status,
                            'category': category
                        }

                        summary['interesting_entries'].append(entry_info)

                        if category == 'patient':
                            summary['patient_related'].append(entry_info)
                        elif category == 'eligibility':
                            summary['eligibility_related'].append(entry_info)
                        elif category == 'claims':
                            summary['claims_related'].append(entry_info)

            # Extraire les queries GraphQL
            if 'graphql' in url.lower() and request.get('postData'):
                try:
                    body = json.loads(request['postData']['text'])
                    query_name = body.get('operationName', 'Unknown')
                    summary['graphql_queries'][query_name] += 1
                except:
                    pass

        return summary

    def display_summary(self, summary):
        """Afficher le résumé de manière lisible"""
        print("\n📌 RÉSUMÉ DE LA CAPTURE")
        print("-"*40)
        print(f"Total requêtes: {summary['total_requests']}")
        print(f"Domaines uniques: {len(summary['domains'])}")
        print(f"Endpoints API: {len(summary['api_endpoints'])}")

        print("\n🌐 TOP DOMAINES:")
        for domain, count in sorted(summary['domains'].items(),
                                   key=lambda x: x[1], reverse=True)[:5]:
            print(f"  • {domain}: {count} requêtes")

        if summary['cookies']:
            print(f"\n🍪 COOKIES IMPORTANTS ({len(summary['cookies'])}):")
            for cookie in sorted(summary['cookies'])[:10]:
                print(f"  • {cookie}")

        if summary['auth_tokens']:
            print(f"\n🔐 TOKENS D'AUTHENTIFICATION:")
            for header, value in summary['auth_tokens'].items():
                print(f"  • {header}: {value}")

        print(f"\n📡 TOP ENDPOINTS API:")
        for endpoint, data in sorted(summary['api_endpoints'].items(),
                                    key=lambda x: x[1]['count'], reverse=True)[:10]:
            methods = ', '.join(data['methods'])
            statuses = ', '.join(map(str, data['statuses']))
            print(f"  • [{data['count']}x] {endpoint}")
            print(f"    Methods: {methods} | Status: {statuses}")

        if summary['graphql_queries']:
            print(f"\n🔮 QUERIES GRAPHQL:")
            for query, count in sorted(summary['graphql_queries'].items(),
                                      key=lambda x: x[1], reverse=True):
                print(f"  • [{count}x] {query}")

        # Afficher les requêtes par catégorie
        categories = [
            ('patient_related', '👤 REQUÊTES PATIENT'),
            ('eligibility_related', '✅ REQUÊTES ÉLIGIBILITÉ'),
            ('claims_related', '📋 REQUÊTES RÉCLAMATIONS')
        ]

        for key, title in categories:
            if summary[key]:
                print(f"\n{title} ({len(summary[key])}):")
                for entry in summary[key][:5]:
                    print(f"  [{entry['index']}] {entry['method']} {entry['url'][:80]}")
                    print(f"      Status: {entry['status']}")

    def extract_entry_detail(self, index):
        """Extraire les détails d'une requête spécifique"""
        with open(self.har_file, 'r') as f:
            har_data = json.load(f)

        if index >= len(har_data['log']['entries']):
            print(f"❌ Index {index} invalide")
            return None

        entry = har_data['log']['entries'][index]

        # Extraire les infos essentielles
        detail = {
            'index': index,
            'timestamp': entry.get('startedDateTime', ''),
            'request': {
                'method': entry['request']['method'],
                'url': entry['request']['url'],
                'headers': {h['name']: h['value'] for h in entry['request'].get('headers', [])},
                'queryString': {q['name']: q['value'] for q in entry['request'].get('queryString', [])},
                'postData': None
            },
            'response': {
                'status': entry['response']['status'],
                'statusText': entry['response']['statusText'],
                'headers': {h['name']: h['value'] for h in entry['response'].get('headers', [])},
                'content': None
            }
        }

        # Extraire le body de la requête si présent
        if entry['request'].get('postData'):
            try:
                detail['request']['postData'] = json.loads(entry['request']['postData']['text'])
            except:
                detail['request']['postData'] = entry['request']['postData'].get('text', '')[:500]

        # Extraire le contenu de la réponse (limité)
        if entry['response'].get('content', {}).get('text'):
            content = entry['response']['content']['text']
            try:
                detail['response']['content'] = json.loads(content)
            except:
                detail['response']['content'] = content[:1000]

        return detail

    def save_summary(self, summary):
        """Sauvegarder le résumé dans un fichier JSON"""
        # Convertir les sets en listes pour JSON
        for endpoint in summary['api_endpoints'].values():
            endpoint['methods'] = list(endpoint['methods'])
            endpoint['statuses'] = list(endpoint['statuses'])

        summary['cookies'] = list(summary['cookies'])

        output_file = 'har_summary.json'
        with open(output_file, 'w') as f:
            json.dump(summary, f, indent=2)
        print(f"\n💾 Résumé sauvegardé dans {output_file}")

    def interactive_mode(self):
        """Mode interactif pour explorer les requêtes"""
        summary = self.extract_summary()

        print("\n" + "="*60)
        print("🔎 MODE INTERACTIF")
        print("="*60)
        print("Commandes:")
        print("  • Numéro : Voir les détails de la requête")
        print("  • 's' : Afficher le résumé")
        print("  • 'p' : Lister les requêtes patient")
        print("  • 'e' : Lister les requêtes éligibilité")
        print("  • 'c' : Lister les requêtes réclamations")
        print("  • 'q' : Quitter")

        while True:
            command = input("\n> ").strip().lower()

            if command == 'q':
                break
            elif command == 's':
                self.display_summary(summary)
            elif command == 'p':
                for entry in summary['patient_related'][:10]:
                    print(f"[{entry['index']}] {entry['url'][:100]}")
            elif command == 'e':
                for entry in summary['eligibility_related'][:10]:
                    print(f"[{entry['index']}] {entry['url'][:100]}")
            elif command == 'c':
                for entry in summary['claims_related'][:10]:
                    print(f"[{entry['index']}] {entry['url'][:100]}")
            else:
                try:
                    index = int(command)
                    detail = self.extract_entry_detail(index)
                    if detail:
                        print(f"\n--- Requête #{index} ---")
                        print(f"URL: {detail['request']['url']}")
                        print(f"Method: {detail['request']['method']}")
                        print(f"Status: {detail['response']['status']}")
                        if detail['request']['postData']:
                            print(f"POST Data: {json.dumps(detail['request']['postData'], indent=2)[:500]}")
                        if detail['response']['content']:
                            print(f"Response: {json.dumps(detail['response']['content'], indent=2)[:500]}")
                except ValueError:
                    print("Commande invalide")

def main():
    if len(sys.argv) > 1:
        har_file = sys.argv[1]
    else:
        har_file = 'metlife_requests.har'

    analyzer = MetLifeHARAnalyzer(har_file)

    # Extraire et afficher le résumé
    summary = analyzer.extract_summary()
    analyzer.display_summary(summary)

    # Sauvegarder le résumé
    analyzer.save_summary(summary)

    # Proposer le mode interactif
    print("\n" + "="*60)
    choice = input("Voulez-vous explorer les requêtes en mode interactif? (o/n): ")
    if choice.lower() == 'o':
        analyzer.interactive_mode()

if __name__ == "__main__":
    main()