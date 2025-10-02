#!/bin/bash
# Setup Python pour les tests locaux uniquement

echo "🔧 Installation des dépendances Python pour text-to-SQL..."

# Option 1: Installation globale user (recommandé pour dev local)
pip install --user google-generativeai python-dotenv

# Option 2: Avec venv (si vous préférez)
# python3 -m venv dental_venv
# source dental_venv/bin/activate
# pip install google-generativeai python-dotenv

echo "✅ Setup terminé"
echo ""
echo "Pour tester:"
echo "  python test_minimal_prompt.py"