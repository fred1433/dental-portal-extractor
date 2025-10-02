#!/usr/bin/env python3
"""
MCNA CAPTCHA Solver with OpenAI Vision
========================================
Utilise GPT-4o pour résoudre les CAPTCHAs automatiquement
"""

import os
import re
import json
import time
import base64
from typing import List, Optional
from pathlib import Path

# Charger les variables d'environnement depuis le .env parent
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)


def solve_captcha_with_openai(page, max_retries: int = 2) -> bool:
    """
    Résout le CAPTCHA MCNA automatiquement avec OpenAI Vision
    Réessaye automatiquement avec un nouveau puzzle si échec

    Args:
        page: Page Playwright avec le CAPTCHA affiché
        max_retries: Nombre de tentatives (default: 2)

    Returns:
        True si résolu avec succès, False sinon
    """
    try:
        from openai import OpenAI
    except ImportError:
        print("   ❌ OpenAI package not installed. Run: pip install openai")
        return False

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("   ❌ OPENAI_API_KEY not found in environment")
        return False

    # Récupérer le modèle depuis .env (default: gpt-4o)
    vision_model = os.environ.get("OPENAI_VISION_MODEL", "gpt-4o")
    print(f"   🎯 Using model: {vision_model}")

    client = OpenAI(api_key=api_key)

    # Boucle de retry
    for attempt in range(max_retries):
        if attempt > 0:
            print(f"\n🔄 Retry attempt {attempt + 1}/{max_retries}...")
            # Cliquer sur refresh pour avoir un nouveau puzzle
            refresh_button = page.locator('#amzn-btn-refresh-internal')
            if refresh_button.count() > 0:
                print("   🔄 Getting new puzzle...")
                refresh_button.click()
                time.sleep(3)  # Attendre que le nouveau puzzle se charge

        print(f"🤖 Attempting CAPTCHA resolution (attempt {attempt + 1}/{max_retries})...")

        try:
            # 0. Cliquer sur "Begin" si c'est la page d'intro
            if click_captcha_begin_if_present(page):
                print("   ✅ Intro page passed, now on CAPTCHA puzzle")

            # 1. Extraire l'instruction du CAPTCHA
            print("   🔍 Looking for CAPTCHA instruction...")
            instruction_elem = page.locator('div[style*="margin-bottom: 0.5em"]')

            if instruction_elem.count() == 0:
                print("   ❌ Could not find instruction element")
                continue  # Essayer retry

            instruction_text = instruction_elem.text_content()
            print(f"   📝 Instruction: {instruction_text}")

            # Extraire l'objet ciblé (ex: "the curtains")
            target_match = re.search(r'the ([a-z ]+)', instruction_text.lower())
            if target_match:
                target_object = target_match.group(1).strip()
            else:
                em_elem = page.locator('div[style*="margin-bottom: 0.5em"] em')
                target_object = em_elem.text_content().strip()

            print(f"   🎯 Target: '{target_object}'")

            # 2. Screenshot du canvas
            canvas = page.locator('canvas')
            screenshot_bytes = canvas.screenshot()
            screenshot_b64 = base64.b64encode(screenshot_bytes).decode()

            # 3. Construire le prompt
            prompt = f"""You are analyzing a 3x3 CAPTCHA grid with 9 numbered squares (1-9, left to right, top to bottom).

Grid layout:
1  2  3
4  5  6
7  8  9

Task: Identify which numbered squares contain {target_object}.

IMPORTANT:
- Only select squares that CLEARLY show {target_object}
- Be precise and conservative
- Return ONLY a JSON object: {{"squares": [list of numbers]}}
- Example: {{"squares": [3, 4, 5, 6, 8]}}

Respond with ONLY the JSON, nothing else."""

            # 4. Appel OpenAI
            print("   ⏳ Calling OpenAI Vision API...")

            # Paramètres selon le modèle
            call_params = {
                "model": vision_model,
                "messages": [{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{screenshot_b64}",
                                "detail": "high"
                            }
                        }
                    ]
                }]
            }

            # GPT-5 a des paramètres différents
            if "gpt-5" in vision_model:
                call_params["max_completion_tokens"] = 200
                # GPT-5 n'accepte pas temperature=0, utilise default (1)
            else:
                call_params["max_tokens"] = 200
                call_params["temperature"] = 0  # Déterministe pour les autres modèles

            response = client.chat.completions.create(**call_params)

            # 5. Parser la réponse
            response_text = response.choices[0].message.content
            print(f"   🤖 Response: {response_text}")

            json_match = re.search(r'\{[^}]+\}', response_text)
            if json_match:
                result = json.loads(json_match.group(0))
                squares = result.get('squares', [])
            else:
                numbers = re.findall(r'\b([1-9])\b', response_text)
                squares = [int(n) for n in numbers if 1 <= int(n) <= 9]

            if not squares:
                print("   ❌ Could not parse response")
                continue

            squares = sorted(list(set(squares)))
            print(f"   ✅ Squares to click: {squares}")

            # 6. Cliquer sur le canvas (coordonnées)
            canvas_elem = page.locator('canvas')
            square_size = 320 / 3

            for square_num in squares:
                if 1 <= square_num <= 9:
                    row = (square_num - 1) // 3
                    col = (square_num - 1) % 3
                    x = col * square_size + square_size / 2
                    y = row * square_size + square_size / 2

                    print(f"   ✓ Clicking square {square_num} at ({int(x)}, {int(y)})")
                    canvas_elem.click(position={'x': x, 'y': y})
                    time.sleep(0.3)

            # 7. Confirm
            time.sleep(0.5)
            page.locator('#amzn-btn-verify-internal').click()
            print("   ✓ Clicked Confirm")

            # 8. Vérifier si résolu
            print("   ⏳ Waiting for resolution...")
            time.sleep(3)

            if page.locator('canvas button').count() == 0:
                print("   ✅ CAPTCHA solved successfully!")
                return True

            time.sleep(2)
            if page.locator('canvas button').count() == 0:
                print("   ✅ CAPTCHA solved!")
                return True

            print(f"   ❌ Attempt {attempt + 1} failed")

        except Exception as e:
            print(f"   ❌ Error on attempt {attempt + 1}: {e}")

    # Toutes les tentatives échouées
    print(f"\n❌ All {max_retries} attempts failed")
    return False


def click_captcha_begin_if_present(page) -> bool:
    """Clique sur Begin si présent et attend le canvas"""
    begin_button = page.locator('#amzn-captcha-verify-button')

    if begin_button.count() > 0:
        print("   🚪 Clicking 'Begin'...")
        begin_button.click()

        print("   ⏳ Waiting for puzzle...")
        try:
            page.wait_for_selector('canvas', timeout=10000)
            print("   ✅ Puzzle loaded!")
            time.sleep(1)
            return True
        except:
            print("   ⚠️  Puzzle did not load")
            return True

    return False


def detect_captcha(page) -> bool:
    """Détecte si un CAPTCHA est présent"""
    indicators = [
        'text="Let\'s confirm you are human"',
        '#amzn-captcha-verify-button',
        'canvas button',
        '#amzn-btn-verify-internal'
    ]

    for indicator in indicators:
        if page.locator(indicator).count() > 0:
            return True
    return False


def wait_for_manual_captcha_resolution(page, timeout: int = 120) -> bool:
    """Attend résolution manuelle du CAPTCHA"""

    click_captcha_begin_if_present(page)

    print("\n" + "="*60)
    print("🤖 CAPTCHA - Manual intervention required")
    print("="*60)
    print("👆 Please solve in the browser")
    print(f"⏱️  {timeout} seconds...")
    print("="*60 + "\n")

    start_time = time.time()
    last_update = 0

    while time.time() - start_time < timeout:
        if not detect_captcha(page):
            print("\n✅ CAPTCHA resolved!")
            return True

        elapsed = int(time.time() - start_time)
        if elapsed % 10 == 0 and elapsed != last_update:
            remaining = timeout - elapsed
            print(f"⏱️  {remaining} seconds remaining...")
            last_update = elapsed

        time.sleep(1)

    print("\n❌ CAPTCHA timeout!")
    return False


if __name__ == "__main__":
    print("This module provides CAPTCHA solving functions.")
    print("Import: from captcha_solver import solve_captcha_with_openai")