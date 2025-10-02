/**
 * Gemini Client - Interface with Google's Generative AI
 * Uses smart model for query generation, fast model for answers
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_SMART = process.env.GEMINI_MODEL_SMART || 'gemini-2.0-flash-exp';
const MODEL_FAST = process.env.GEMINI_MODEL_FAST || 'gemini-2.0-flash-exp';

if (!API_KEY) {
  throw new Error('GEMINI_API_KEY not found in environment');
}

const genAI = new GoogleGenerativeAI(API_KEY);
const modelSmart = genAI.getGenerativeModel({ model: MODEL_SMART });
const modelFast = genAI.getGenerativeModel({ model: MODEL_FAST });

console.log(`🤖 Gemini Client initialized: Smart=${MODEL_SMART}, Fast=${MODEL_FAST}`);

/**
 * LLM #1: Generate JSON queries from structure
 */
async function generateQueries(structure, question, patientAge, conversationHistory = []) {
  // Build conversation context if history exists
  let historyContext = '';
  if (conversationHistory.length > 0) {
    historyContext = '\nCONVERSATION HISTORY (for context):\n';
    conversationHistory.forEach((exchange, i) => {
      historyContext += `Q${i + 1}: ${exchange.user}\nA${i + 1}: ${exchange.assistant}\n\n`;
    });
  }

  const prompt = `You are a database expert. Generate ONLY JSON queries that correspond to the data needed to answer the dentist's question. No explanations, no text, ONLY a JSON array of query objects.

PATIENT JSON STRUCTURE (unique paths with examples):
${structure}

PATIENT AGE: ${patientAge || 'Unknown'}
${historyContext}
CURRENT QUESTION: ${question}

AVAILABLE QUERY ACTIONS:
- find_procedure_limitation: Find procedure by CDT code and get limitations (auto-filters by age)
- get_annual_maximum: Get annual maximum info
- get_deductible: Get deductible info (specify type: 'individual' or 'family')
- check_history: Get procedure history by CDT code
- get_coverage_percentage: Get coverage % for category ('preventive', 'basic', 'major')

QUERY FORMAT EXAMPLES:
[
  {"action": "find_procedure_limitation", "cdt_code": "D0272", "network": "##PPO"},
  {"action": "get_annual_maximum"},
  {"action": "check_history", "cdt_code": "D0272"}
]

IMPORTANT:
- Return ONLY the JSON array, no markdown, no explanation
- Include ALL queries needed to fully answer the question
- If asking about a specific procedure, use find_procedure_limitation
- Use patient age for age-dependent limitations

RESPOND WITH JSON ARRAY ONLY:`;

  const startTime = Date.now();
  const result = await modelSmart.generateContent(prompt);
  const elapsed = Date.now() - startTime;

  let text = result.response.text().trim();

  // Clean if wrapped in markdown
  if (text.includes('```')) {
    const match = text.match(/```(?:json)?\s*(.*?)\s*```/s);
    if (match) {
      text = match[1].trim();
    }
  }

  // Parse JSON
  const queries = JSON.parse(text);

  return {
    queries,
    promptSize: prompt.length,
    elapsed,
    model: MODEL_SMART
  };
}

/**
 * LLM #2: Generate final answer from query results
 */
async function generateAnswer(question, queries, queryResults, conversationHistory = []) {
  // Build conversation context
  let historyContext = '';
  if (conversationHistory.length > 0) {
    historyContext = '\nPREVIOUS CONVERSATION:\n';
    conversationHistory.forEach((exchange, i) => {
      historyContext += `User: ${exchange.user}\nAssistant: ${exchange.assistant}\n\n`;
    });
  }

  const prompt = `You are a helpful dental insurance assistant. Answer the dentist's question based on the data retrieved.
${historyContext}
CURRENT QUESTION: ${question}

QUERIES EXECUTED:
${JSON.stringify(queries, null, 2)}

QUERY RESULTS:
${JSON.stringify(queryResults, null, 2)}

Provide a clear, accurate answer to the dentist. Be specific about:
- Coverage percentages
- Frequency limitations
- Which age group applies (if relevant)
- Remaining benefits
- Any important notes or restrictions

Keep the answer concise but complete:`;

  const startTime = Date.now();
  const result = await modelFast.generateContent(prompt);
  const elapsed = Date.now() - startTime;

  const answer = result.response.text().trim();

  return {
    answer,
    elapsed,
    model: MODEL_FAST
  };
}

module.exports = {
  generateQueries,
  generateAnswer
};
