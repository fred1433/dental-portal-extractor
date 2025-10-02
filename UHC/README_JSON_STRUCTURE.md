# UHC JSON Structure - Guide d'utilisation

## 🎯 Données ESSENTIELLES pour un cabinet dentaire

### 1. **Patient** (Identification)
```json
{
  "name": "ZIA MORGAN",         // ✅ GARDER
  "dob": "09/17/2019",          // ✅ GARDER (pour vérifier limites d'âge)
  "memberId": "132236890",      // ✅ GARDER (pour facturation)
  "relationship": "DAUGHTER"     // ✅ GARDER (type de couverture)
}
```

### 2. **Benefits** (Couverture)
```json
{
  "eligibilityStatus": "Y",     // ✅ CRITIQUE - Patient actif ou non
  "planName": "...",             // ✅ GARDER
  "groupName": "...",            // ✅ GARDER (employeur)
  "annualMax": null,             // ✅ CRITIQUE - Limite annuelle
  "usedAmount": "0",             // ✅ CRITIQUE - Déjà utilisé
  "effectiveDate": "2025-02-01" // ✅ UTILE
}
```

### 3. **Procedures.details** (Le plus important!)
Pour CHAQUE procédure :
```json
{
  "procedure": {
    "codeValue": "D0120",        // ✅ CRITIQUE
    "codeDesc": "periodic oral evaluation"  // ✅ UTILE
  },
  "inNetworkFrequency": "2 - F - 12M",     // ✅ CRITIQUE (limites)
  "ageLimit": "0 - 18",                    // ✅ CRITIQUE
  "alternateBenefit": "D0140",             // ✅ IMPORTANT (downgrades)
  "services": [{
    "serviceDate": "2025-03-18"            // ✅ HISTORIQUE - DÉJÀ FAIT!
  }]
}
```

## ⚠️ Données à IGNORER

- `memberContrivedKey`, `productId` → IDs internes UHC
- `procedures.categories` → Redondant avec `details`
- `extraction` → Métadonnées techniques
- `rawData` → Sauf pour franchises/co-assurance

## 💡 Structure OPTIMISÉE recommandée

```json
{
  "patient": {
    "name": "...",
    "dob": "...",
    "memberId": "...",
    "relationship": "..."
  },
  "coverage": {
    "isActive": true,
    "plan": "...",
    "group": "...",
    "annualMax": 0,
    "usedAmount": 0,
    "deductible": 150,        // Extrait de rawData
    "coinsurance": {          // Extrait de rawData
      "preventive": 100,
      "basic": 95,
      "major": 50
    }
  },
  "procedures": [
    {
      "code": "D0120",
      "description": "periodic oral evaluation",
      "frequency": "2 per year",
      "ageLimit": "0-18",
      "lastDone": "2025-03-18",  // NULL si jamais fait
      "remaining": 1              // Calculé : limite - utilisé
    }
  ]
}
```

## 📏 Taille des données

- JSON actuel : ~108 KB
- Sans rawData : ~35 KB (68% d'économie)
- Structure optimisée : ~20 KB (81% d'économie)

## 🔑 Points clés pour le dentiste

1. **Vérifier `eligibilityStatus`** en premier
2. **Regarder `services.serviceDate`** pour l'historique
3. **Calculer ce qui reste** : fréquence - déjà utilisé
4. **Attention aux `alternateBenefit`** (downgrades)
5. **Vérifier `ageLimit`** pour les enfants