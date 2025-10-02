#!/usr/bin/env python3
"""
Test avec profil Chrome persistant
Utilise un vrai profil Chrome (comme ton navigateur normal)
"""

from playwright.sync_api import sync_playwright
import time


def test_persistent_profile():
    """
    Lance Chrome avec un profil persistant
    C'est comme utiliser ton Chrome normal mais automatisé
    """
    print("🧪 Testing with persistent Chrome profile")
    print("="*60)

    with sync_playwright() as p:
        try:
            # Lance un contexte persistant (comme un vrai Chrome)
            context = p.chromium.launch_persistent_context(
                user_data_dir="/tmp/mcna_test_profile",  # Profil temporaire
                headless=False,
                channel="chrome",  # Utilise le vrai Chrome installé
                args=[
                    '--disable-blink-features=AutomationControlled',
                ]
            )

            page = context.pages[0] if context.pages else context.new_page()

            print("📍 Navigating to MCNA portal...")
            page.goto("https://portal.mcna.net/login/index.html")

            # Attendre un peu pour voir ce qui se charge
            time.sleep(3)

            # Vérifier si on voit la vraie page ou le 404
            page_content = page.content()

            if "Welcome to the MCNA Online Portal" in page_content:
                print("✅ SUCCESS! Real login page loaded!")
                print("   No detection - we see the welcome message")

                print("\n" + "="*60)
                print("👆 You can now login manually")
                print("="*60)

                # Attendre que l'utilisateur se connecte
                print("Waiting for login... (you have 3 minutes)")
                page.wait_for_url("**/provider**", timeout=180000)

                print("\n✅ Login successful!")

                # Sauvegarder
                context.storage_state(path="mcna_session.json")
                print("💾 Session saved to mcna_session.json")

                print("\nKeeping browser open for 30s for you to test...")
                time.sleep(30)

            elif "doesn't exist" in page_content:
                print("❌ DETECTED! Site returns 404 page")
                print("   Playwright is still being detected")

                print("\nKeeping browser open 10s so you can see...")
                time.sleep(10)

            else:
                print("⚠️  Unknown page loaded")
                print("   Keeping browser open for inspection...")
                time.sleep(30)

            context.close()

        except Exception as e:
            print(f"❌ Error: {e}")


if __name__ == "__main__":
    test_persistent_profile()