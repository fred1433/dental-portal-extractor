# MetLife HAR Complete - Capture et Reverse Engineering

## 🎯 Méthodologie de Capture Complète HAR

Cette approche capture **100% des requêtes réseau** pendant la navigation, permettant un reverse engineering complet de l'API MetLife.

## 📋 Workflow Complet

### 1. Capture avec Playwright Codegen

```bash
# Rendre le script exécutable (première fois seulement)
chmod +x launch_codegen.sh

# Lancer la capture
./launch_codegen.sh
```

**Ce qui va se passer:**
- Un navigateur s'ouvre sur le portail MetLife
- Vous naviguez normalement (connexion, patients, eligibility, claims)
- Playwright capture TOUT:
  - Chaque requête HTTP/HTTPS
  - Tous les headers, cookies, tokens
  - Les requêtes et réponses complètes
  - Les timings et métadonnées

**Fichiers générés:**
- `metlife_navigation.py` - Code Python de votre navigation
- `metlife_requests.har` - TOUTES les requêtes (peut faire 50-200 MB!)
- `metlife_auth.json` - État d'authentification

### 2. Analyse Intelligente du HAR

```bash
# Analyser le fichier HAR
python analyze_har.py
```

**L'analyseur fait:**
1. **Phase 1 - Résumé** (sans exploser les tokens)
   - Compte les requêtes par domaine
   - Identifie les endpoints API
   - Extrait cookies et tokens
   - Catégorise (patient, eligibility, claims)

2. **Phase 2 - Exploration Interactive**
   - Mode interactif pour examiner requête par requête
   - Extraction ciblée sans charger tout en mémoire

### 3. Extraction des Données

```bash
# Utiliser les endpoints découverts
python extract_data.py
```

## 🔍 Navigation Recommandée pour Capture Maximale

1. **Connexion**
   - Page de login
   - MFA si nécessaire
   - Dashboard initial

2. **Exploration Patients**
   - Liste des patients
   - Recherche patient
   - Sélectionner 2-3 patients différents
   - Voir détails de chaque patient

3. **Eligibility & Benefits**
   - Vérifier l'éligibilité
   - Voir les plans
   - Détails des couvertures
   - Limitations et exclusions

4. **Claims**
   - Historique des réclamations
   - Soumettre une réclamation (sans finaliser)
   - Statut des réclamations
   - EOB (Explanation of Benefits)

5. **Provider Info**
   - Profil du provider
   - Informations de la clinique
   - Préférences et settings

## 📊 Structure du Fichier HAR

Le fichier HAR contient:
```json
{
  "log": {
    "entries": [
      {
        "request": {
          "method": "GET/POST",
          "url": "https://...",
          "headers": [...],
          "cookies": [...],
          "postData": {...}
        },
        "response": {
          "status": 200,
          "headers": [...],
          "content": {
            "text": "..." // Réponse complète
          }
        }
      }
    ]
  }
}
```

## 🛠️ Outils Disponibles

| Script | Description |
|--------|------------|
| `launch_codegen.sh` | Lance Playwright pour capturer |
| `analyze_har.py` | Analyse intelligente du HAR |
| `extract_data.py` | Extrait les données via l'API |
| `har_to_api.py` | Convertit HAR en documentation API |

## 💡 Tips pour la Capture

1. **Naviguer Lentement**
   - Attendez le chargement complet de chaque page
   - Les requêtes AJAX peuvent prendre du temps

2. **Explorer Largement**
   - Cliquez sur différents onglets
   - Ouvrez plusieurs patients
   - Testez différentes fonctionnalités

3. **Capturer les Erreurs**
   - Essayez des actions invalides
   - Ça révèle souvent des endpoints cachés

4. **Session Longue**
   - Plus vous naviguez, plus vous découvrez
   - Le HAR capture tout, même les requêtes de refresh token

## 🔐 Sécurité

- Les fichiers HAR contiennent des données sensibles (cookies, tokens, données patient)
- Ne jamais commiter les fichiers `.har` sur Git
- Ajouter au `.gitignore`: `*.har`, `*_auth.json`

## 📈 Analyse Avancée

Pour une analyse plus poussée:

```python
# Extraire toutes les requêtes API
python analyze_har.py | grep "/api/"

# Voir uniquement les GraphQL
python analyze_har.py | grep "graphql"

# Exporter en Postman/Insomnia
python har_to_postman.py metlife_requests.har
```

## 🚀 Prochaines Étapes

1. Lancer `./launch_codegen.sh`
2. Naviguer dans MetLife (10-15 minutes)
3. Analyser avec `python analyze_har.py`
4. Explorer les endpoints découverts
5. Créer des scripts d'extraction automatique

---

**Note:** Cette méthode capture ABSOLUMENT TOUT. Le fichier HAR peut être volumineux mais contient une mine d'or pour le reverse engineering.