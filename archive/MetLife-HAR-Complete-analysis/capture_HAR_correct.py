#!/usr/bin/env python3
"""
Script CORRECT pour capturer le HAR avec Playwright
"""
import asyncio
from playwright.async_api import async_playwright
from datetime import datetime

async def capture_avec_har():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    har_file = f"metlife_COMPLET_{timestamp}.har"

    print("🚀 CAPTURE HAR METLIFE (Version Correcte)")
    print("="*60)
    print(f"📹 Capture dans: {har_file}")
    print("="*60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)

        # LA BONNE MÉTHODE: record_har_path dans le context !
        context = await browser.new_context(
            record_har_path=har_file,
            record_har_content='attach'  # Capturer le contenu des réponses
        )

        page = await context.new_page()

        # Aller au login
        await page.goto("https://dentalprovider.metlife.com/presignin")

        print("\n📋 NAVIGATION À FAIRE:")
        print("="*40)
        print("1️⃣  LOGIN:")
        print("   • Username: payorportal4771")
        print("   • Password: Dental24!")
        print("\n2️⃣  RECHERCHE:")
        print("   • ID: 635140654")
        print("   • Nom: TEDFORD (si demandé)")
        print("\n3️⃣  NAVIGATION IMPORTANTE:")
        print("   • Cliquer sur AVERLY G TEDFORD")
        print("   • Choisir un provider")
        print("   • Cliquer 'Maximums & Deductibles'")
        print("   • Cliquer 'Benefit Levels'")
        print("   • Cliquer tous les onglets!")
        print("="*40)
        print("\n⏱️  Vous avez 5 MINUTES pour naviguer")
        print("   Le HAR capture TOUT en arrière-plan!\n")

        # Attendre 5 minutes avec countdown
        for i in range(30):
            remaining = 300 - (i * 10)
            mins = remaining // 60
            secs = remaining % 60
            print(f"⏳ Temps restant: {mins}:{secs:02d}", end='\r')
            await asyncio.sleep(10)

        print("\n\n📦 Fermeture et sauvegarde du HAR...")

        # IMPORTANT: Fermer le context pour sauvegarder le HAR
        await context.close()
        await browser.close()

        print(f"✅ SUCCÈS! Fichier HAR créé: {har_file}")
        print(f"📊 Utilisez ce fichier pour l'analyse")

        return har_file

if __name__ == "__main__":
    try:
        har = asyncio.run(capture_avec_har())
        print(f"\n🎯 Prochaine étape: python analyze_har.py {har}")
    except KeyboardInterrupt:
        print("\n⚠️ Interrompu - Le HAR pourrait être incomplet")