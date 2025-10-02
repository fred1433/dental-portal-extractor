#!/usr/bin/env python3
"""
Méthode d'analyse HAR intelligente sans exploser les tokens
"""
import json
import os
from urllib.parse import urlparse, parse_qs
import base64
import re

class SmartHARAnalyzer:
    def __init__(self, har_file):
        self.har_file = har_file
        self.har_size = os.path.getsize(har_file) / (1024*1024)
        print(f"📊 Fichier HAR: {self.har_size:.2f} MB")

        # Charger le HAR une seule fois
        with open(har_file, 'r') as f:
            self.har = json.load(f)
        self.entries = self.har['log']['entries']
        print(f"📊 Total: {len(self.entries)} requêtes\n")

    def phase1_overview(self):
        """PHASE 1: Vue d'ensemble sans lire le contenu"""
        print("="*60)
        print("PHASE 1: VUE D'ENSEMBLE (rapide, sans contenu)")
        print("="*60)

        stats = {
            'total': len(self.entries),
            'by_status': {},
            'by_method': {},
            'by_domain': {},
            'interesting_urls': []
        }

        for i, entry in enumerate(self.entries):
            url = entry['request']['url']
            method = entry['request']['method']
            status = entry['response']['status']
            parsed = urlparse(url)
            domain = parsed.hostname

            # Compter par status
            stats['by_status'][status] = stats['by_status'].get(status, 0) + 1

            # Compter par méthode
            stats['by_method'][method] = stats['by_method'].get(method, 0) + 1

            # Compter par domaine
            if domain:
                stats['by_domain'][domain] = stats['by_domain'].get(domain, 0) + 1

            # Marquer les URLs intéressantes (sans lire le contenu!)
            if self._is_interesting_url(url, method, status):
                stats['interesting_urls'].append({
                    'index': i,
                    'method': method,
                    'status': status,
                    'url': url[:100],
                    'size': entry['response'].get('bodySize', 0)
                })

        # Afficher les stats
        print("\n📈 STATISTIQUES:")
        print(f"  • GET: {stats['by_method'].get('GET', 0)}")
        print(f"  • POST: {stats['by_method'].get('POST', 0)}")
        print(f"  • Status 200: {stats['by_status'].get(200, 0)}")
        print(f"  • Status 302: {stats['by_status'].get(302, 0)}")
        print(f"  • Domaines: {len(stats['by_domain'])}")

        print("\n🏆 TOP DOMAINES:")
        for domain, count in sorted(stats['by_domain'].items(), key=lambda x: x[1], reverse=True)[:5]:
            print(f"  • {domain}: {count} requêtes")

        print(f"\n🎯 URLs intéressantes trouvées: {len(stats['interesting_urls'])}")

        return stats

    def phase2_filter_apis(self, stats):
        """PHASE 2: Identifier les vrais endpoints API"""
        print("\n" + "="*60)
        print("PHASE 2: FILTRAGE DES APIs (toujours sans contenu)")
        print("="*60)

        api_endpoints = {}

        for item in stats['interesting_urls']:
            i = item['index']
            entry = self.entries[i]
            url = entry['request']['url']

            # Parser l'URL
            parsed = urlparse(url)
            path = parsed.path

            # Ignorer les ressources statiques
            if any(ext in path for ext in ['.gif', '.jpg', '.png', '.css', '.js', '.woff']):
                continue

            # Ignorer les domaines de tracking
            if parsed.hostname and any(track in parsed.hostname for track in
                ['google', 'facebook', 'adobe', 'analytics', 'kampyle', 'decibelinsight']):
                continue

            # Garder les endpoints qui semblent être des APIs
            if any(pattern in url for pattern in ['/execute/', '/api/', '/service/', '/rest/', 'json']):
                endpoint_key = f"{parsed.hostname}{path}"
                if endpoint_key not in api_endpoints:
                    api_endpoints[endpoint_key] = []

                api_endpoints[endpoint_key].append({
                    'index': i,
                    'method': entry['request']['method'],
                    'status': entry['response']['status'],
                    'has_post_data': bool(entry['request'].get('postData')),
                    'response_size': item['size']
                })

        print(f"\n📡 ENDPOINTS API TROUVÉS: {len(api_endpoints)}")
        for endpoint, calls in list(api_endpoints.items())[:10]:
            print(f"\n  • {endpoint}")
            for call in calls[:2]:
                print(f"    [{call['index']}] {call['method']} - Status {call['status']}")
                if call['has_post_data']:
                    print(f"        ✓ A des données POST")
                if call['response_size'] > 1000:
                    print(f"        ✓ Grosse réponse: {call['response_size']} bytes")

        return api_endpoints

    def phase3_analyze_auth(self):
        """PHASE 3: Extraire les cookies et tokens d'auth"""
        print("\n" + "="*60)
        print("PHASE 3: ANALYSE AUTH (cookies, tokens)")
        print("="*60)

        auth_data = {
            'cookies': set(),
            'auth_headers': {},
            'tokens': []
        }

        for entry in self.entries[:50]:  # Analyser seulement les 50 premières
            # Chercher les cookies
            for header in entry['request'].get('headers', []):
                if header['name'].lower() == 'cookie':
                    cookies = header['value'].split('; ')
                    for cookie in cookies:
                        if '=' in cookie:
                            name = cookie.split('=')[0]
                            # Garder les cookies importants
                            if any(key in name.lower() for key in
                                  ['session', 'auth', 'token', 'jwt', 'id']):
                                auth_data['cookies'].add(name)

                # Chercher les headers d'auth
                if header['name'].lower() in ['authorization', 'x-auth-token', 'x-api-key']:
                    auth_data['auth_headers'][header['name']] = header['value'][:50] + '...'

        print("\n🍪 COOKIES D'AUTH:")
        for cookie in sorted(auth_data['cookies']):
            print(f"  • {cookie}")

        if auth_data['auth_headers']:
            print("\n🔐 HEADERS D'AUTH:")
            for name, value in auth_data['auth_headers'].items():
                print(f"  • {name}: {value}")

        return auth_data

    def phase4_deep_dive(self, api_endpoints, max_inspect=5):
        """PHASE 4: Analyse profonde de quelques requêtes clés"""
        print("\n" + "="*60)
        print(f"PHASE 4: ANALYSE PROFONDE (top {max_inspect} requêtes)")
        print("="*60)

        # Prioriser les requêtes à analyser
        priority_requests = []
        for endpoint, calls in api_endpoints.items():
            for call in calls:
                # Score basé sur: POST > GET, grosse réponse, status 200
                score = 0
                if call['method'] == 'POST': score += 10
                if call['status'] == 200: score += 5
                if call['response_size'] > 5000: score += 5
                if 'patient' in endpoint.lower(): score += 10
                if 'eligib' in endpoint.lower(): score += 10
                if 'claim' in endpoint.lower(): score += 10

                priority_requests.append({
                    'endpoint': endpoint,
                    'call': call,
                    'score': score
                })

        # Trier par score
        priority_requests.sort(key=lambda x: x['score'], reverse=True)

        # Analyser le top
        for req in priority_requests[:max_inspect]:
            i = req['call']['index']
            entry = self.entries[i]

            print(f"\n🔍 [{i}] {req['endpoint']}")
            print(f"   Score: {req['score']} | {entry['request']['method']} | Status {entry['response']['status']}")

            # Analyser les données POST
            if entry['request'].get('postData', {}).get('text'):
                post_data = entry['request']['postData']['text'][:200]
                print(f"   POST Data: {post_data}...")

            # Analyser la réponse (prudemment!)
            if entry['response'].get('content', {}).get('text'):
                response = entry['response']['content']['text']
                print(f"   Response size: {len(response)} chars")

                # Chercher des patterns importants
                patterns_found = []
                if 'TEDFORD' in response.upper(): patterns_found.append('TEDFORD')
                if 'CHOU' in response.upper(): patterns_found.append('CHOU')
                if re.search(r'\d{9}', response): patterns_found.append('SSN/ID')
                if 'eligib' in response.lower(): patterns_found.append('ELIGIBILITY')
                if 'benefit' in response.lower(): patterns_found.append('BENEFITS')
                if 'claim' in response.lower(): patterns_found.append('CLAIMS')

                if patterns_found:
                    print(f"   ✅ Contient: {', '.join(patterns_found)}")

                # Essayer d'extraire du JSON
                if response.startswith('{') or response.startswith('['):
                    try:
                        data = json.loads(response)
                        print(f"   📋 JSON valide avec {len(data)} clés" if isinstance(data, dict) else f"   📋 JSON array avec {len(data)} items")
                    except:
                        pass

    def phase5_extract_curl(self, index):
        """PHASE 5: Convertir une requête spécifique en cURL"""
        entry = self.entries[index]
        req = entry['request']

        curl = f"curl '{req['url']}'"

        # Ajouter la méthode
        if req['method'] != 'GET':
            curl += f" -X {req['method']}"

        # Ajouter les headers importants
        for header in req['headers']:
            if header['name'].lower() not in ['accept-encoding', 'connection']:
                curl += f" \\\n  -H '{header['name']}: {header['value']}'"

        # Ajouter les données POST
        if req.get('postData', {}).get('text'):
            data = req['postData']['text'].replace("'", "\\'")
            curl += f" \\\n  --data '{data}'"

        return curl

    def _is_interesting_url(self, url, method, status):
        """Helper: déterminer si une URL est intéressante"""
        # Ignorer les erreurs et redirections
        if status >= 400 or status < 0:
            return False

        # Ignorer les ressources statiques
        static_exts = ['.gif', '.jpg', '.png', '.ico', '.css', '.woff', '.ttf']
        if any(ext in url for ext in static_exts):
            return False

        # Garder les POST et les API
        if method == 'POST':
            return True

        if any(pattern in url for pattern in ['/execute/', '/api/', '/service/']):
            return True

        return False

    def run_full_analysis(self):
        """Lancer l'analyse complète"""
        print("\n🚀 ANALYSE HAR INTELLIGENTE")
        print("="*60)
        print("Méthode: Analyse progressive sans exploser les tokens")
        print("="*60)

        # Phase 1
        stats = self.phase1_overview()

        # Phase 2
        api_endpoints = self.phase2_filter_apis(stats)

        # Phase 3
        auth_data = self.phase3_analyze_auth()

        # Phase 4
        if api_endpoints:
            self.phase4_deep_dive(api_endpoints)

        print("\n" + "="*60)
        print("ANALYSE TERMINÉE")
        print("="*60)
        print("\n💡 Pour examiner une requête spécifique:")
        print("   analyzer.phase5_extract_curl(INDEX)")

        return {
            'stats': stats,
            'api_endpoints': api_endpoints,
            'auth_data': auth_data
        }


if __name__ == "__main__":
    analyzer = SmartHARAnalyzer('metlife_requests.har')
    results = analyzer.run_full_analysis()

    # Sauvegarder les résultats
    with open('har_analysis_results.json', 'w') as f:
        # Convertir les sets en listes pour JSON
        save_data = {
            'stats': {
                'total': results['stats']['total'],
                'by_status': results['stats']['by_status'],
                'by_method': results['stats']['by_method'],
                'interesting_count': len(results['stats']['interesting_urls'])
            },
            'api_endpoints': list(results['api_endpoints'].keys()),
            'auth_cookies': list(results['auth_data']['cookies'])
        }
        json.dump(save_data, f, indent=2)

    print("\n💾 Résultats sauvés dans har_analysis_results.json")