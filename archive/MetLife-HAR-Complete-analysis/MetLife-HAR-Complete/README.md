# UHC Provider Portal - Reverse Engineering

## Résumé des découvertes

### Données utiles identifiées:

**1. Informations du dentiste/provider:**
- Nom complet du dentiste de service
- MPIN (Medical Provider Identification Number)
- Nom de la clinique corporative
- TIN/NPI (Tax ID Number)
- UHC Provider ID

**2. Informations de la clinique:**
- Nom de l'organisation
- Organization ID
- TIN de la clinique
- Relation avec le dentiste

**3. Informations utilisateur:**
- Username: payorportal4771
- Email: payorportal02@sdbmail.com
- Téléphone: +1 (612) 562-8245
- UUID: 60ef2dee-2113-41ab-8eda-937809e4be21

## Fichiers créés

- `uhc_api_analysis.md` - Documentation détaillée des endpoints
- `uhc_data_extractor.py` - Script Python pour extraire les données

## Utilisation du script

```bash
cd UHC
python uhc_data_extractor.py
```

Le script extrait automatiquement:
- Les infos du JWT token
- Les données provider via GraphQL
- Les infos utilisateur
- Sauvegarde dans `uhc_extracted_data.json`

## Prochaines étapes recommandées

1. **Capturer les requêtes patients** - Naviguer vers la liste des patients pour capturer:
   - Endpoint de liste des patients
   - Structure des données patient
   - Informations d'éligibilité

2. **Endpoints à rechercher:**
   - `/api/eligibility/*` - Vérification d'éligibilité
   - `/api/claims/*` - Historique des réclamations
   - `/api/patients/*` - Liste et détails des patients
   - `/api/benefits/*` - Plans et bénéfices

3. **Automatisation complète:**
   - Intégrer avec Playwright pour navigation automatique
   - Extraire les données de tous les patients
   - Sauvegarder dans la base de données

## Notes importantes

- Le endpoint GraphQL `GetProviderPreference` contient la majorité des données utiles
- L'UUID `60ef2dee-2113-41ab-8eda-937809e4be21` est utilisé partout comme identifiant principal
- Le JWT token contient des infos personnelles décodables