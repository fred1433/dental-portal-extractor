#!/usr/bin/env python3
"""
CAPTURE COMPLÈTE DE TOUTES LES REQUÊTES METLIFE
Ce script capture ABSOLUMENT TOUT dans un HAR
"""
import asyncio
from playwright.async_api import async_playwright
from datetime import datetime

async def capture_complete_har():
    print("🚀 CAPTURE HAR COMPLÈTE METLIFE")
    print("="*60)
    print("⚠️  IMPORTANT: Ce script va capturer TOUTES les requêtes")
    print("    depuis le login jusqu'à la fin de votre navigation")
    print("="*60)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    har_filename = f"metlife_COMPLET_{timestamp}.har"

    async with async_playwright() as p:
        # Lancer avec HAR qui capture TOUT
        print("\n📹 Démarrage de la capture HAR...")
        browser = await p.chromium.launch(
            headless=False,
            args=[
                f'--save-har={har_filename}',
                '--save-har-glob=**'  # Capturer TOUTES les requêtes
            ]
        )

        # Nouveau contexte (pas de session existante pour tout capturer)
        print("🆕 Création d'un contexte propre (sans session)...")
        context = await browser.new_context()
        page = await context.new_page()

        print("\n" + "="*60)
        print("📋 NAVIGATION COMPLÈTE À EFFECTUER:")
        print("="*60)
        print("""
1️⃣  LOGIN:
   • Page de login va s'ouvrir
   • Entrez: payorportal4771 / Dental24!
   • Gérez le MFA si nécessaire

2️⃣  RECHERCHE PATIENT:
   • Sur PesSignIn, entrez: 635140654
   • Si demandé, entrez: TEDFORD

3️⃣  SÉLECTION MEMBRE:
   ⚠️  CLIQUEZ sur un membre (ex: AVERLY G TEDFORD)

4️⃣  SÉLECTION PROVIDER:
   • Sélectionnez un provider (peu importe lequel)

5️⃣  NAVIGATION DANS LES ONGLETS (TRÈS IMPORTANT!):

   a) Cliquez sur "Maximums & Deductibles"
      → Attendez que ça charge complètement
      → Vérifiez que vous voyez "$196" ou "Maximum Used to Date"

   b) Cliquez sur "Benefit Levels, Frequency & Limitations"
      → Attendez que ça charge
      → Vérifiez les dates de service (03/28/25, 03/10/25)

   c) Cliquez sur "Patient Summary"
      → Attendez que ça charge

   d) Si vous voyez d'autres onglets avec données, cliquez dessus aussi!

6️⃣  TERMINER:
   ⚠️  NE FERMEZ PAS le navigateur
   → Revenez ici et appuyez sur Entrée
        """)

        # Aller à la page de login
        print("\n🌐 Navigation vers la page de login...")
        await page.goto("https://dentalprovider.metlife.com/presignin")

        print("\n⏸️ MAINTENANT, EFFECTUEZ TOUTE LA NAVIGATION CI-DESSUS")
        print("   Prenez votre temps, naviguez sur TOUTES les pages importantes")
        input("\n✋ Appuyez sur Entrée ICI quand vous avez TOUT navigué...")

        # Capturer des infos finales
        final_url = page.url
        print(f"\n📍 URL finale capturée: {final_url}")

        # Sauvegarder le contenu de la dernière page
        content = await page.content()
        html_filename = f"page_finale_{timestamp}.html"
        with open(html_filename, 'w', encoding='utf-8') as f:
            f.write(content)

        # Vérifier quelques données
        found_data = []
        if '$196' in content:
            found_data.append("$196 Maximum Used")
        if '03/28/25' in content or '03/10/25' in content:
            found_data.append("Dates de service")
        if 'AVERLY' in content:
            found_data.append("Données patient AVERLY")

        if found_data:
            print(f"✅ Données trouvées dans la dernière page: {', '.join(found_data)}")

        # Sauvegarder la session pour réutilisation
        await context.storage_state(path=f"session_{timestamp}.json")

        # Fermer proprement
        await browser.close()

        print("\n" + "="*60)
        print("✅ CAPTURE TERMINÉE AVEC SUCCÈS!")
        print("="*60)
        print(f"\n📦 Fichiers créés:")
        print(f"   1. {har_filename} - TOUTES les requêtes réseau")
        print(f"   2. {html_filename} - Dernière page visitée")
        print(f"   3. session_{timestamp}.json - Session pour réutilisation")
        print("\n💡 Le HAR contient TOUT ce qui s'est passé depuis le début")
        print("   Utilisez ce fichier pour analyser toutes les requêtes")

        return har_filename

if __name__ == "__main__":
    har_file = asyncio.run(capture_complete_har())
    print(f"\n🎯 Pour analyser: python analyze_har.py {har_file}")