# 🔧 Guide de Reverse Engineering MetLife API

## 🎯 Méthode Complète : HAR → Analyse → Automation

### 1️⃣ **Capture HAR Complète (100% des requêtes)**
```bash
playwright codegen --save-har=metlife_requests.har https://dentalprovider.metlife.com
```
- ✅ Capture TOUTES les requêtes (246 dans notre cas)
- ✅ Headers, cookies, POST data, réponses
- ✅ 25MB de données complètes

### 2️⃣ **Analyse Intelligente du HAR**

**Stratégie qui a fonctionné :**
1. Chercher ce qu'on voit à l'écran dans les réponses
2. Identifier les requêtes qui contiennent ces données
3. Analyser la structure de ces requêtes
4. Reverse-engineer les paramètres

**Résultat :**
- Trouvé "AVERLY TEDFORD" dans la réponse #158
- Endpoint: `POST /prov/execute/LastName`
- 20KB de HTML avec TOUS les membres de la famille

### 3️⃣ **Structure de l'API Découverte**

```
POST https://metdental.metlife.com/prov/execute/LastName
Content-Type: application/x-www-form-urlencoded

Paramètres:
- lastName: [Nom de famille]
- pepText: [Token encodé contenant le subscriber ID]
- fwdName: (vide)
- formName: (vide)
- appPath: (vide)
- InputId: (vide)
```

### 4️⃣ **Décodage du Token pepText**

Format découvert:
```
pepText (URL encoded) → Base64 decode → Format propriétaire

Structure:
^up34~0^^up406~FALSE^^up202~[SUBSCRIBER_ID]^^up400~plan^^up401~[IDS]^^up50~[USERNAME]
```

Contient:
- **635140654** = Subscriber ID
- **payorportal4771** = Username
- **plan** = Type de requête

### 5️⃣ **Workflow d'Automatisation**

```python
# 1. Se connecter et capturer la session
await login(username, password)

# 2. Pour chaque patient:
for subscriber_id, last_name in patients:
    # Construire le pepText
    token = build_pep_token(subscriber_id)

    # Appeler l'API
    response = post('/prov/execute/LastName', {
        'lastName': last_name,
        'pepText': token
    })

    # Extraire les données
    extract_patient_data(response)
```

## 📊 Données Extractibles

### Depuis `/prov/execute/LastName`:
- ✅ Tous les membres de la famille (5 dans notre cas)
- ✅ Dates de naissance
- ✅ Genres
- ✅ Relations (Self, Spouse, Dependent)
- ✅ Adresse complète
- ✅ Subscriber ID

### Depuis `/prov/execute/MultipleProviders`:
- ✅ Liste des dentistes
- ✅ NPI des providers
- ✅ Coverage percentage
- ✅ Plan details

## 🔑 Points Clés du Reverse Engineering

1. **Session-based**: Nécessite les cookies de session MetLife
2. **Token pepText**: Encodage propriétaire mais reproductible
3. **Legacy API**: JSP/Servlet (pas REST moderne)
4. **HTML Response**: Parse HTML, pas JSON

## 🚀 Comment Utiliser

### Option 1: Script Automatique
```bash
python metlife_api_automation.py
```

### Option 2: Replay Manuel avec cURL
```bash
# Extraire le cURL depuis le HAR
python -c "from har_deep_analysis import SmartHARAnalyzer;
analyzer = SmartHARAnalyzer('metlife_requests.har');
print(analyzer.phase5_extract_curl(158))"

# Modifier les paramètres pour un autre patient
# Exécuter le cURL
```

## 💡 Leçons Apprises

1. **Si c'est visible à l'écran → c'est dans le HAR**
2. **Chercher par le contenu, pas par les URLs**
3. **Les endpoints legacy cachent souvent plus de données**
4. **Le pepText encode les vraies données patient**

## 📈 Potentiel d'Extraction

Avec cette méthode, on peut:
- ✅ Extraire TOUS les patients d'une clinique
- ✅ Automatiser la vérification d'éligibilité
- ✅ Collecter les données de couverture
- ✅ Exporter vers une base de données

## ⚠️ Limitations

- Nécessite une session valide (cookies)
- Le pepText pourrait changer de format
- Rate limiting possible
- MFA peut bloquer l'automation complète

---

**Cette méthode HAR → Analyse → Reverse Engineering fonctionne !**

On a réussi à transformer une capture de navigation manuelle en API automatisable.