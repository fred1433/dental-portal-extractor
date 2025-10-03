# Denticon API Reverse Engineering - Guide Complet

## 🔑 LA CLÉ DU SUCCÈS (TRÈS IMPORTANT!)

**Avant d'exécuter n'importe quel script d'extraction, il FAUT d'abord ouvrir cette URL :**

```
https://c1.denticon.com/aspx/home/advancedmypage.aspx?chk=tls
```

Cette URL établit le contexte de session nécessaire sur le domaine `c1.denticon.com` qui permet ensuite d'appeler les endpoints de l'API.

## 📊 Scripts Principaux

### `c1_insurance_carrier_subscriber.js` ⭐
✅ **Script d'assurance (c1.denticon.com)**

Ce script extrait :
- **Carrier Name** (nom de l'assureur)
- **Subscriber ID** (numéro d'abonné)
- Patient ID, nom, téléphone, email
- Date de naissance, statut d'éligibilité
- Statistiques par assureur

Résultats obtenus : **271 patients** sur **24 jours** avec **61 assureurs différents**

### `a1_calendar_with_enrichment.js` ⭐
✅ **Script calendrier + enrichissement (a1.denticon.com)**

Ce script extrait :
- Liste des rendez-vous (calendrier)
- Enrichissement avec détails complets :
  - Date de naissance (DOB)
  - Téléphones (work, home, cell)
  - Procédures détaillées avec codes CDT et prix
  - Notes de rendez-vous

**Note** : Le détail des patients ne fonctionne pas encore complètement, mais on espère le résoudre avec la découverte de l'URL c1

## 🎯 Endpoint API Principal

```
GET https://c1.denticon.com/EligibilityVerificationReport/GetPatientEligibilityTableData
```

### Paramètres :
- `PGID=3169` - Practice Group ID
- `OID=102` - Office ID
- `APPTPRDR=ALL` - Tous les providers
- `APTDATE=10/3/2025` - Date du rendez-vous (format M/D/YYYY)
- `ELIGSTATUS=ALL` - Tous les statuts d'éligibilité
- `_=[timestamp]` - Cache buster

### Headers requis :
```javascript
headers: {
    'X-Requested-With': 'XMLHttpRequest'
}
```

## 📋 Instructions Étape par Étape

### 1. Préparer la Session
```
1. Ouvrir le navigateur
2. Se connecter à Denticon
3. OUVRIR : https://c1.denticon.com/aspx/home/advancedmypage.aspx?chk=tls
4. Attendre que la page charge complètement
```

### 2. Ouvrir la Console
```
F12 (Windows/Linux) ou Cmd+Option+I (Mac)
Aller dans l'onglet "Console"
```

### 3. Copier/Coller le Script
```javascript
// Pour les données d'assurance (Carrier + Subscriber ID) :
// → Copier le contenu de c1_insurance_carrier_subscriber.js

// Pour le calendrier avec enrichissement (DOB + Phones) :
// → Copier le contenu de a1_calendar_with_enrichment.js

// Coller dans la console et appuyer sur Entrée
```

### 4. Récupérer les Données
```javascript
// Option 1 : Copier dans le presse-papier
copy(JSON.stringify(window.octoberExport, null, 2))

// Option 2 : Télécharger comme fichier JSON
downloadJSON(window.octoberExport, "october_2025_insurance_data.json")

// Option 3 : Afficher dans la console
console.log(JSON.stringify(window.octoberExport, null, 2))
```

## 🏆 Résultats Obtenus (Octobre 2025)

### Statistiques Globales
- **271 patients** avec données d'assurance
- **61 assureurs** différents
- **24 jours** avec rendez-vous

### Top 5 Assureurs
1. **UHC-TEXAS-MEDICAID** - 23 patients (8.5%)
2. **United Concordia** - 21 patients (7.7%)
3. **MCNA-TEXAS-MEDICAID** - 20 patients (7.4%)
4. **Delta Dental** - 17 patients (6.3%)
5. **Cigna** - 15 patients (5.5%)

## 📁 Structure des Données Extraites

```json
{
  "metadata": {
    "extraction_date": "ISO timestamp",
    "month": "October 2025",
    "total_patients": 271,
    "total_carriers": 61,
    "days_with_appointments": 24
  },

  "carriers_summary": [
    {
      "carrier_name": "UHC-TEXAS-MEDICAID",
      "carrier_id": "12345",
      "patient_count": 23,
      "percentage": "8.49",
      "examples": [...]
    }
  ],

  "patients": [
    {
      "date": "10/1/2025",
      "patient_id": "123",
      "patient_name": "DOE, JOHN",
      "date_of_birth": "01/15/1990",
      "phone_cell": "(555) 123-4567",
      "email": "john@example.com",
      "appointment_time": "10:00 AM",
      "primary_insurance": {
        "carrier_id": "12345",
        "carrier_name": "Delta Dental",
        "subscriber_id": "ABC123456",
        "subscriber_name": "JOHN DOE",
        "plan_id": "PLAN001",
        "eligibility_status": "Verified",
        "last_verified": "09/30/2025",
        "verified_by": "System"
      }
    }
  ]
}
```

## 🔍 Scripts de Debug (Optionnels)

- `debug_eligibility.js` - Debug de l'endpoint c1 pour comprendre la structure
- `test_eligibility_endpoint.js` - Test c1 avec affichage détaillé des 3 premiers patients

## ⚠️ Points Importants

### Domaines
- ✅ **c1.denticon.com** - Pour les données d'assurance/éligibilité (endpoint GetPatientEligibilityTableData)
- ✅ **a1.denticon.com** - Pour les calendriers/rendez-vous (endpoint getsched.aspx)

### Limitations
- Ne pas faire trop de requêtes simultanées (risque de ban)
- Respecter les pauses entre requêtes (300-500ms minimum)
- Toujours vérifier le statut de la réponse avant de parser

### Sécurité
- ⚠️ Un endpoint POST existe (`SaveInsurancePlan`) mais **NE PAS L'UTILISER** sans mesures de sécurité
- Lecture seule uniquement pour l'instant
- Les tokens anti-CSRF sont présents mais pas nécessaires pour les GET

## 🚀 Cas d'Usage Futurs

1. **Extraction quotidienne automatisée** - Modifier le script pour date du jour
2. **Analyse des tendances** - Comparer les assureurs mois par mois
3. **Priorisation des intégrations** - Basé sur le volume par carrier
4. **Vérification d'éligibilité en masse** - Avant les rendez-vous

## 📝 Historique

- **2025-10-02** - Découverte de l'endpoint GetPatientEligibilityTableData
- **2025-10-02** - Extraction réussie de 271 patients d'octobre 2025
- **2025-10-02** - Création du script d'export final structuré
