#!/usr/bin/env python3
"""
Text-to-SQL Pipeline - English version
Full schema + domains (115KB context)
With logging to preserve results
"""

import sqlite3
import json
import os
import re
import time
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

try:
    import google.generativeai as genai
    api_key = os.getenv('GEMINI_API_KEY')
    model_smart = os.getenv('GEMINI_MODEL_SMART', 'gemini-2.5-flash')
    model_fast = os.getenv('GEMINI_MODEL_FAST', 'gemini-2.5-flash-lite')

    genai.configure(api_key=api_key)
    model_sql = genai.GenerativeModel(model_smart)  # Smart model for SQL generation
    model_answer = genai.GenerativeModel(model_fast)  # Fast model for answers
    print(f"🤖 Hybrid mode: SQL={model_smart}, Answer={model_fast}")
except:
    print("pip install google-generativeai")
    exit(1)

# Load resources from the ddins bundle regardless of where the script runs
BASE_DIR = Path(__file__).resolve().parent
DDINS_DIR = BASE_DIR / 'ddins'
SCHEMA_PATH = DDINS_DIR / 'schema_sqlite.sql'
DOMAINS_PATH = DDINS_DIR / 'domains.json'
RECORDS_DB_PATH = DDINS_DIR / 'ddins_full_records.db'

with SCHEMA_PATH.open('r', encoding='utf-8') as f:
    SCHEMA = f.read()  # 27KB - ALL 53 tables with ALL columns

with DOMAINS_PATH.open('r', encoding='utf-8') as f:
    DOMAINS = f.read()  # 66KB - ALL observed values

# SQL RULES AND COMPREHENSIVE SELECT REQUIREMENTS
CODEBOOK = """DATABASE CONTEXT: This contains Delta Dental insurance eligibility, claims data and other data.

IMPORTANT SQL RULES:
- All joins use parent_id foreign keys
- Amounts are stored as TEXT, use CAST(amount AS REAL) for calculations
- Dates are in MM/DD/YYYY format, use substr(date,-4,4) to extract year

SELECT AS MUCH RELEVANT INFORMATION AS POSSIBLE - join all related tables that could help answer the question comprehensively.

CRITICAL: ALWAYS SELECT DESCRIPTIVE COLUMNS (not just values):
- For deductiblesinfo__amountinfo: SELECT type from deductibledetails AND remainingamount
- For maximumsinfo__amountinfo: SELECT type from maximumdetails AND remainingamount
- For procedures: SELECT code AND description (never just code)
- For claims: SELECT patient firstname, lastname along with claim data
- For coveragedetail: SELECT benefitcoveragelevel AND amounttype (PERCENT/DOLLAR)

EXAMPLE - DEDUCTIBLE QUERY:
WRONG: SELECT remainingamount FROM deductiblesinfo__amountinfo
RIGHT: SELECT DD.type, AI.remainingamount
       FROM deductiblesinfo__amountinfo AI
       JOIN deductiblesinfo__deductibledetails DD ON ...

CRITICAL DATA LOCATIONS:
- DEDUCTIBLE TYPE: root__eligibility__maxded__deductiblesinfo__deductibledetails (has 'type')
- MAXIMUM TYPE: root__eligibility__maxded__maximumsinfo__maximumdetails (has 'type')
- PROCEDURES: root__eligibility__hist__procedures (has code AND description)
"""

def generate_sql(question: str) -> tuple:
    """Generate SQL with full context using SMART model"""

    prompt = f"""You are a SQL expert. Generate ONLY SQL code that corresponds to the data that corresponds to the question asked by the dentist. No explanations, no text.

DATABASE SCHEMA:
{SCHEMA}

POSSIBLE VALUES IN COLUMNS:
{DOMAINS}

{CODEBOOK}

QUESTION: {question}

SQL only:"""

    start = time.time()
    response = model_sql.generate_content(prompt)  # Use smart model
    elapsed = time.time() - start

    sql = response.text.strip()

    # Clean SQL if wrapped in markdown
    if '```' in sql:
        match = re.search(r'```(?:sql)?\s*(.*?)\s*```', sql, re.DOTALL)
        if match:
            sql = match.group(1).strip()

    # Remove any prefix like "sqlite" or "sql"
    sql = re.sub(r'^(sqlite|sql|ite)\s+', '', sql, flags=re.I).strip()

    return sql, len(prompt), elapsed

def run_question(num: int, question: str) -> dict:
    """Complete pipeline for one question with logging"""

    total_start = time.time()  # Start total timer

    result = {
        "num": num,
        "question": question,
        "timestamp": datetime.now().isoformat()
    }

    print(f"\n{'='*60}")
    print(f"Q{num}: {question}")
    print('='*60)

    try:
        # 1. Generate SQL
        sql, prompt_size, sql_time = generate_sql(question)
        print(f"📏 Context: {prompt_size:,} chars | ⏱️ SQL generation: {sql_time:.1f}s")
        print(f"📝 SQL: {sql[:100]}...")

        result["sql"] = sql
        result["prompt_size"] = prompt_size
        result["sql_time"] = sql_time

        # 2. Execute SQL
        conn = sqlite3.connect(str(RECORDS_DB_PATH))
        cursor = conn.cursor()
        cursor.execute(sql)
        rows = cursor.fetchall()
        cols = [d[0] for d in cursor.description] if cursor.description else []
        conn.close()

        if rows:
            print(f"✅ {len(rows)} result(s): {dict(zip(cols, rows[0]))}")
            result["data"] = [dict(zip(cols, row)) for row in rows[:3]]

            # 3. Generate English answer (with FAST model)
            data_str = json.dumps(result["data"], ensure_ascii=False)
            answer_prompt = f"""Based on this SQL query and its results, answer the question.

Question: {question}

SQL executed:
{sql[:500]}

Results:
{data_str}

Provide a clear, accurate answer (if multiple values, consider if they should be summed):"""
            answer_start = time.time()
            answer = model_answer.generate_content(answer_prompt).text.strip()  # Use fast model
            answer_time = time.time() - answer_start
            result["answer_time"] = answer_time

            total_time = time.time() - total_start
            result["total_time"] = total_time

            print(f"⏱️ Answer generation: {answer_time:.1f}s | Total time: {total_time:.1f}s")
            print(f"💬 {answer}")
            result["answer"] = answer
            result["success"] = True
        else:
            print("⚠️ No results found")

            # Still use LLM to provide helpful explanation
            no_results_prompt = f"""The following dental insurance question returned no results from the database.

Question: {question}

SQL executed (returned 0 results):
{sql[:500]}

Provide a helpful explanation for why there might be no results. Consider:
- The procedure/code might not be covered by this plan
- The code might be incorrect or not exist in Delta Dental's system
- Suggest alternative codes or procedures if applicable

Keep response concise and helpful for the dentist:"""

            answer_start = time.time()
            answer = model_answer.generate_content(no_results_prompt).text.strip()
            answer_time = time.time() - answer_start
            result["answer_time"] = answer_time

            total_time = time.time() - total_start
            result["total_time"] = total_time

            print(f"⏱️ Answer generation: {answer_time:.1f}s | Total time: {total_time:.1f}s")
            print(f"💬 {answer}")
            result["answer"] = answer
            result["success"] = False  # Still mark as unsuccessful for tracking

    except Exception as e:
        print(f"❌ Error: {str(e)[:100]}")
        result["success"] = False
        result["error"] = str(e)[:200]

    # Save immediately with full details
    result["sql_full"] = sql  # Keep full SQL for analysis
    with open('test_results_detailed.json', 'a') as f:
        f.write(json.dumps(result, ensure_ascii=False, indent=2) + "\n")

    return result

# TEST WITH 3 SUCCESSFUL QUESTIONS
questions = [
    "What procedures has Estelle had done this year and what was covered by insurance?",  # Q1 - Success
    "How many times per year can Estelle get prophylaxis (D1110) and what's the frequency limitation?",  # Q4 - Success
    "Is orthodontic treatment covered for Estelle, what's the coverage percentage and lifetime maximum?"  # Q8 - Success
]

# RUN TESTS
print("\n" + "="*70)
print("TEXT-TO-SQL PIPELINE TEST - ENGLISH VERSION")
print(f"Start: {datetime.now().strftime('%H:%M:%S')}")
print("Results saved to: test_results.json")
print("="*70)

results = []
successes = 0

for i, q in enumerate(questions, 1):
    result = run_question(i, q)
    results.append(result)
    if result.get("success"):
        successes += 1
    time.sleep(1)  # Pause between questions

# SUMMARY
print(f"\n{'='*70}")
print("📊 FINAL SUMMARY")
print('='*70)
print(f"✅ Successful: {successes}/3")
print(f"❌ Failed: {3-successes}/3")
print(f"📊 Context size: ~115KB per question")

# Calculate timing stats
total_sql_time = sum(r.get("sql_time", 0) for r in results)
total_answer_time = sum(r.get("answer_time", 0) for r in results)
total_overall_time = sum(r.get("total_time", 0) for r in results)

print(f"\n⏱️ TIMING BREAKDOWN:")
print(f"   SQL generation:    {total_sql_time:.1f}s total ({total_sql_time/len(results):.1f}s avg)")
print(f"   Answer generation: {total_answer_time:.1f}s total ({total_answer_time/len(results):.1f}s avg)")
print(f"   Total time:        {total_overall_time:.1f}s total ({total_overall_time/len(results):.1f}s avg)")

print(f"\nEnd: {datetime.now().strftime('%H:%M:%S')}")

# Show final answers
print("\n📝 FINAL ANSWERS:")
for r in results:
    if r.get("success"):
        print(f"Q{r['num']}: {r.get('answer', 'N/A')}")

print("\n✅ Test complete! Full results in test_results.json")
