# Delta Dental Insurance Extractor

Extracteur de données pour le portail Delta Dental Insurance (deltadentalins.com).

## Architecture

- **TypeScript** + **Playwright** pour l'automatisation
- **Session persistante** via `storageState` de Playwright
- **API directe** après authentification (pas de scraping HTML)
- **Sortie NDJSON** pour traitement en streaming

## Installation

```bash
npm install
```

## Configuration

Créer un fichier `.env` :

```env
DDINS_PT_USERID=Payoraccess4771    # Récupéré lors du login
DDINS_PLOC=107313380005            # ID de la location
MAX_PATIENTS=10                     # Limite pour tests (optionnel)
```

## Utilisation

### 1. Login manuel (première fois)

```bash
npm run login
# Se connecter manuellement dans le navigateur
# La session est sauvegardée dans ddins-storage.json
```

### 2. Tester la connexion

```bash
npm run test:locations
# Liste toutes les locations disponibles
```

### 3. Extraction des données

```bash
npm run extract
# Génère les fichiers dans out/:
# - patients.ndjson
# - eligibility.ndjson  
# - claims.ndjson
# - claim_details.ndjson
```

## Structure des données

### Patients
- Informations du roster
- Famille/dépendants
- Status d'éligibilité

### Eligibility/Benefits
- Package de benefits complet (334 codes CDT)
- Maximums et déductibles
- Périodes d'attente
- Historique de traitement

### Claims
- Liste des claims sur 12 mois
- Détails avec codes CDT
- Montants et statuts

## API Endpoints utilisés

- `/provider-tools/v2/api/practice-locations`
- `/provider-tools/v2/api/patient-mgnt/patient-roster`
- `/provider-tools/v2/api/patient-mgnt/patient-family`
- `/provider-tools/v2/api/benefits/*`
- `/provider-tools/v2/api/claims`
- `/provider-tools/v2/api/claim/{id}`

## Notes importantes

- **PageSize roster**: Max 15 (limitation API)
- **PageSize claims**: Par défaut 10
- **Concurrence**: 4 requêtes parallèles (p-limit)
- **Benefits volume**: ~1MB par patient (catalogue complet)