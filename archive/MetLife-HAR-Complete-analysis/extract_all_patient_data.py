#!/usr/bin/env python3
"""
Extraction AGRESSIVE de TOUTES les données patient du HAR
Si c'était visible à l'écran, c'est dans le HAR !
"""
import json
import base64
import re
from urllib.parse import unquote
import html

def decode_all_formats(text):
    """Essayer de décoder avec toutes les méthodes possibles"""
    results = []

    # 1. Essayer base64
    try:
        # Chercher les strings base64 potentielles
        b64_pattern = r'[A-Za-z0-9+/]{20,}={0,2}'
        for match in re.findall(b64_pattern, text[:5000]):
            try:
                decoded = base64.b64decode(match + '==').decode('utf-8', errors='ignore')
                if len(decoded) > 10 and any(c.isalpha() for c in decoded):
                    results.append(('BASE64', decoded[:200]))
            except:
                pass
    except:
        pass

    # 2. URL decode
    try:
        decoded = unquote(text)
        if decoded != text:
            results.append(('URL_DECODE', decoded[:500]))
    except:
        pass

    # 3. HTML entities
    try:
        decoded = html.unescape(text)
        if decoded != text:
            results.append(('HTML_DECODE', decoded[:500]))
    except:
        pass

    return results

def extract_patient_info(text):
    """Extraire toutes les infos patient possibles"""
    info = {}

    # Patterns pour les données patient
    patterns = {
        'SSN': r'\b\d{3}-?\d{2}-?\d{4}\b',
        'Member_ID': r'\b\d{9}\b',
        'DOB': r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
        'Phone': r'\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b',
        'Coverage': r'\b\d{1,3}%\b',
        'Deductible': r'\$\d+(?:,\d{3})*(?:\.\d{2})?',
        'Max_Benefit': r'(?:maximum|max).*?\$\d+(?:,\d{3})*',
        'Copay': r'(?:copay|co-pay).*?\$?\d+',
        'Provider_ID': r'\b631\d{2}\b',
        'Claim_Number': r'\b[A-Z]{2,}\d{6,}\b'
    }

    for name, pattern in patterns.items():
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            info[name] = list(set(matches))[:5]  # Max 5 uniques

    # Chercher les noms
    if 'TEDFORD' in text.upper():
        # Extraire le contexte autour
        idx = text.upper().find('TEDFORD')
        context = text[max(0, idx-50):idx+100]
        info['TEDFORD_CONTEXT'] = context

    if 'CHOU' in text.upper():
        idx = text.upper().find('CHOU')
        context = text[max(0, idx-50):idx+100]
        info['CHOU_CONTEXT'] = context

    # Chercher les mots-clés importants
    keywords = ['eligible', 'effective', 'termination', 'benefit', 'deductible',
                'preventive', 'basic', 'major', 'orthodontic', 'implant',
                'root canal', 'crown', 'filling', 'cleaning', 'exam']

    found_keywords = []
    for kw in keywords:
        if kw.lower() in text.lower():
            found_keywords.append(kw)

    if found_keywords:
        info['Keywords'] = found_keywords

    return info

print("🔍 RECHERCHE EXHAUSTIVE DES DONNÉES PATIENT")
print("="*60)

# Charger le HAR
with open('metlife_requests.har', 'r') as f:
    har = json.load(f)

entries = har['log']['entries']
print(f"📊 Analyse de {len(entries)} requêtes\n")

# Analyser TOUTES les réponses avec du contenu
patient_data_found = []
decoded_data = []

for i, entry in enumerate(entries):
    url = entry['request']['url']

    # Ignorer les images et CSS
    if any(ext in url for ext in ['.gif', '.png', '.jpg', '.css', '.woff']):
        continue

    # Vérifier la réponse
    if entry['response'].get('content', {}).get('text'):
        response_text = entry['response']['content']['text']

        # Seulement si la réponse est assez grosse
        if len(response_text) > 1000:

            # 1. Chercher les données directement
            direct_info = extract_patient_info(response_text)

            if direct_info:
                patient_data_found.append({
                    'index': i,
                    'url': url.split('?')[0] if '?' in url else url,
                    'size': len(response_text),
                    'info': direct_info
                })

            # 2. Essayer de décoder
            decoded_results = decode_all_formats(response_text)
            for method, decoded in decoded_results:
                decoded_info = extract_patient_info(decoded)
                if decoded_info:
                    decoded_data.append({
                        'index': i,
                        'method': method,
                        'url': url.split('?')[0] if '?' in url else url,
                        'info': decoded_info
                    })

# Afficher les résultats
print("📋 DONNÉES PATIENT TROUVÉES DIRECTEMENT:")
print("-"*40)

for item in patient_data_found:
    print(f"\n[{item['index']}] {item['url']}")
    print(f"    Taille: {item['size']} octets")
    for key, value in item['info'].items():
        if key.endswith('_CONTEXT'):
            print(f"    {key}: {value[:100]}...")
        else:
            print(f"    {key}: {value}")

if decoded_data:
    print("\n📋 DONNÉES TROUVÉES APRÈS DÉCODAGE:")
    print("-"*40)

    for item in decoded_data[:10]:  # Limiter à 10
        print(f"\n[{item['index']}] {item['url']} (via {item['method']})")
        for key, value in item['info'].items():
            print(f"    {key}: {value}")

# Chercher spécifiquement les pages avec eligibility/benefits
print("\n🎯 RECHERCHE SPÉCIFIQUE ELIGIBILITY/BENEFITS:")
print("-"*40)

eligibility_pages = []
for i, entry in enumerate(entries):
    if entry['response'].get('content', {}).get('text'):
        text = entry['response']['content']['text'].lower()

        # Score basé sur les mots-clés
        score = 0
        if 'eligib' in text: score += 10
        if 'benefit' in text: score += 5
        if 'coverage' in text: score += 5
        if 'deductible' in text: score += 5
        if 'effective date' in text: score += 10
        if 'patient' in text: score += 3

        if score >= 15:
            eligibility_pages.append({
                'index': i,
                'url': entry['request']['url'],
                'score': score,
                'size': len(entry['response']['content']['text'])
            })

# Trier par score
eligibility_pages.sort(key=lambda x: x['score'], reverse=True)

print(f"\nTrouvé {len(eligibility_pages)} pages avec données eligibility/benefits:")
for page in eligibility_pages[:5]:
    print(f"  [{page['index']}] Score {page['score']}: {page['url'][:80]}...")
    print(f"      Taille: {page['size']} octets")

# Sauvegarder les indices pour analyse manuelle
results = {
    'patient_data_indices': [item['index'] for item in patient_data_found],
    'decoded_data_indices': [item['index'] for item in decoded_data],
    'eligibility_pages': [page['index'] for page in eligibility_pages[:10]],
    'total_analyzed': len(entries)
}

with open('patient_data_indices.json', 'w') as f:
    json.dump(results, f, indent=2)

print(f"\n💾 Indices sauvegardés dans patient_data_indices.json")
print(f"   Pages avec données: {len(patient_data_found)}")
print(f"   Pages avec données décodées: {len(decoded_data)}")
print(f"   Pages eligibility: {len(eligibility_pages)}")