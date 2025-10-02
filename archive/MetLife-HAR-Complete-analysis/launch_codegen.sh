#!/bin/bash

echo "🎭 Lancement de Playwright Codegen pour MetLife"
echo "=============================================="
echo ""
echo "📝 CAPTURE COMPLÈTE HAR - TOUTES LES REQUÊTES"
echo ""
echo "Ce script va:"
echo "  ✓ Ouvrir le portail MetLife dans un navigateur"
echo "  ✓ Capturer TOUTES les requêtes réseau (100%)"
echo "  ✓ Sauvegarder le code de navigation"
echo "  ✓ Sauvegarder l'état d'authentification"
echo ""
echo "🔍 NAVIGATION RECOMMANDÉE:"
echo "  1. Connexion au portail"
echo "  2. Page d'accueil / Dashboard"
echo "  3. Liste des patients"
echo "  4. Sélectionner 2-3 patients différents"
echo "  5. Vérification d'éligibilité (Eligibility)"
echo "  6. Historique des réclamations (Claims)"
echo "  7. Plans et bénéfices (Benefits)"
echo ""
echo "📊 FICHIERS QUI SERONT GÉNÉRÉS:"
echo "  • metlife_navigation.py   - Code Python de votre navigation"
echo "  • metlife_requests.har    - TOUTES les requêtes réseau (API, images, tout!)"
echo "  • metlife_auth.json       - État d'authentification (cookies, storage)"
echo ""
echo "⚠️ IMPORTANT: Naviguez lentement et attendez le chargement complet"
echo "             de chaque page pour capturer toutes les requêtes"
echo ""
echo "Appuyez sur Entrée pour lancer la capture..."
read

# Activer l'environnement virtuel
source ../.venv/bin/activate

# S'assurer que Playwright est installé
if ! command -v playwright &> /dev/null; then
    echo "Installation de Playwright..."
    pip install playwright
    playwright install chromium
fi

# URL du portail MetLife Dental
METLIFE_URL="https://dentalprovider.metlife.com/presignin"

echo ""
echo "🚀 Lancement du navigateur..."
echo ""

# Lancer codegen avec capture complète HAR
playwright codegen \
  --target python-async \
  --save-har=metlife_requests.har \
  --save-storage=metlife_auth.json \
  -o metlife_navigation.py \
  "$METLIFE_URL"

echo ""
echo "✅ Capture terminée!"
echo ""
echo "📁 Fichiers créés:"
ls -lh metlife_*.* 2>/dev/null | awk '{print "  • " $9 " (" $5 ")"}'
echo ""
echo "Pour analyser les requêtes capturées:"
echo "  python analyze_har.py"
echo ""