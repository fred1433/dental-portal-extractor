# Scripts Denticon

Scripts pour extraire et manipuler les données du PMS Denticon.

## 📂 Structure du projet

```
denticon/
├── extract-insurance-full-api.js    # Extraction Sept+Oct via 3 API endpoints (rapide)
├── extract-patient-records.js       # Extraction complète avec scraping Patient Overview
├── write-patient-note.js            # Écriture sécurisée dans les notes patient
├── README.md                        # Documentation
├── data/                            # Fichiers de données (JSON, CSV)
└── archive/                         # Scripts de debug/test archivés
```

## 🎯 Scripts principaux

### `extract-insurance-full-api.js`
**Extraction rapide via 3 API endpoints** (2-3 min pour 591 patients)

**Sources de données:**
1. `a1/getsched` - Calendrier (tous les patients)
2. `a1/GetApptDetails` - DOB, gender, phones
3. `c1/EligibilityVerification` - Assurance, subscriber ID

**Données extraites:**
- ✅ Patient ID, Nom, Prénom
- ✅ DOB patient, Genre
- ✅ Phones (cell, home, work)
- ✅ Assureur, Subscriber ID, Subscriber DOB
- ✅ Provider, Appointment date
- ❌ Adresse/ZIP (nécessite scraping)
- ❌ Relationship (nécessite scraping)

**Usage:**
```bash
node extract-insurance-full-api.js
```

**Sortie:** `data/insurance-full-api-results.{json,csv}`

### `extract-patient-records.js`
**Extraction complète avec scraping Patient Overview** (5-10 min)

**Sources de données:**
- 3 API endpoints (comme ci-dessus)
- + Patient Overview scraping (Playwright)

**Données additionnelles:**
- ✅ Adresse complète (street, city, state, ZIP)
- ✅ Relationship to subscriber
- ✅ Emergency contact
- ✅ Medical alerts, balances, recalls

**⚠️ Problème actuel:**
Erreur "You are not authorized to view this page" - permissions insuffisantes pour Patient Overview

**Usage:**
```bash
node extract-patient-records.js
```

### `write-patient-note.js`
**Écriture sécurisée d'URLs dans notes patient**

**Sécurité:** 7 validations avant écriture
- Vérification PATID
- Vérification RPID
- Validation URL
- Confirmation patient
- etc.

**Usage:**
```bash
node write-patient-note.js
```

## 📊 Données disponibles

### Fichiers dans `data/`
- `insurance-full-api-results.json` - 591 patients (Sept+Oct 2025)
- `insurance-full-api-results.csv` - Même données en CSV
- `data-quality-analysis.json` - Analyse de vérifiabilité assurance
- `verifiable-patients.csv` - 367 patients vérifiables (62%)

### Statistiques clés
- **Total patients:** 591 (Sept: 295, Oct: 296)
- **Vérifiables:** 367 (62%) - données complètes pour assurance
- **Sans assurance:** 159 (27%) - cash/self-pay
- **Avec assurance mais données incomplètes:** 65 (11%)

### Critères de vérifiabilité
Un patient est **vérifiable** s'il a:
- ✅ Prénom + Nom
- ✅ Date de naissance (patient DOB)
- ✅ Subscriber ID
- ✅ Assureur (carrier)

## 🔧 Archive

Le dossier `archive/` contient les scripts de debug/test:
- Scripts de debug c1
- Scripts d'analyse de données
- Anciennes versions
- Tests de scraping

## 🚀 Prochaines étapes

1. **Résoudre permissions Patient Overview** - Pour obtenir adresse/ZIP/relationship
2. **Tester scraping sur 1 patient** - Vérifier autorisation
3. **Si OK: Tester sur 50 patients** - Mesurer temps + données
4. **Lancer extraction complète** - 591 patients avec toutes les données
