#!/bin/bash

echo "🎭 Lancement de Playwright Codegen pour UHC Provider Portal"
echo "=============================================="
echo ""
echo "📝 INSTRUCTIONS:"
echo ""
echo "1. CONNEXION:"
echo "   - Entrez vos identifiants UHC"
echo "   - Complétez la MFA si nécessaire"
echo ""
echo "2. NAVIGATION À CAPTURER:"
echo "   ✓ Page d'accueil après connexion"
echo "   ✓ Cliquez sur 'Eligibility & Benefits' ou 'Claims'"
echo "   ✓ Sélectionnez un patient"
echo "   ✓ Consultez les détails d'éligibilité"
echo "   ✓ Consultez l'historique des réclamations"
echo ""
echo "3. IMPORTANT:"
echo "   - Naviguez lentement pour capturer toutes les requêtes"
echo "   - Ouvrez l'onglet Network dans DevTools du navigateur"
echo "   - Filtrez par 'Fetch/XHR' pour voir les API calls"
echo ""
echo "4. SAUVEGARDE:"
echo "   - Le code sera généré dans: uhc_navigation.py"
echo "   - Les requêtes HAR dans: uhc_requests.har"
echo ""
echo "Appuyez sur Entrée pour lancer..."
read

# Activer l'environnement virtuel
source ../.venv/bin/activate

# Lancer codegen avec sauvegarde du HAR et du code
playwright codegen \
  --target python-async \
  --save-har=uhc_requests.har \
  --save-storage=uhc_auth.json \
  -o uhc_navigation.py \
  https://secure.uhcprovider.com

echo ""
echo "✅ Codegen terminé!"
echo ""
echo "Fichiers créés:"
echo "  - uhc_navigation.py (code de navigation)"
echo "  - uhc_requests.har (toutes les requêtes réseau)"
echo "  - uhc_auth.json (état d'authentification)"