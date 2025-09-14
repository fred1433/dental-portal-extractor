// src/http.ts
import type { APIResponse, APIRequestContext } from '@playwright/test';

export async function parseJsonSafe(res: APIResponse): Promise<any> {
  const status = res.status();
  if (status === 204) return null;

  const ctype = (res.headers()['content-type'] || '').toLowerCase();
  const text = await res.text();
  if (!text || !text.trim()) return null;

  // Certaines réponses peuvent être du 'application/ion+json'
  const looksJson = ctype.includes('json') || ctype.includes('ion+json');
  if (!looksJson) {
    // Renvoie le texte brut si le serveur n'envoie pas un vrai JSON MIME
    try { return JSON.parse(text); } catch { return text; }
  }

  try {
    return JSON.parse(text);
  } catch {
    // JSON vide/cassé → renvoyer null pour ne pas faire planter l'extracteur
    return null;
  }
}

const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 500
): Promise<T> {
  let attempt = 0;
  let lastErr: any;
  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const status = err?.status ?? err?.statusCode;
      if (!RETRY_STATUSES.has(status) || attempt === maxRetries) break;
      const wait = baseDelayMs * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, wait));
      attempt++;
    }
  }
  throw lastErr;
}

// Petit helper GET/POST avec retry et parse JSON tolérant
export async function getJson(
  api: APIRequestContext,
  url: string,
  opts: Parameters<APIRequestContext['get']>[1] = {},
  maxRetries = 2
) {
  return withRetry(async () => {
    const res = await api.get(url, opts);
    if (!res.ok()) {
      const body = await res.text();
      const e: any = new Error(`GET ${url} failed: ${res.status()} ${body}`);
      e.status = res.status();
      throw e;
    }
    return parseJsonSafe(res);
  }, maxRetries);
}

export async function postJson(
  api: APIRequestContext,
  url: string,
  opts: Parameters<APIRequestContext['post']>[1] = {},
  maxRetries = 2
) {
  return withRetry(async () => {
    const res = await api.post(url, opts);
    if (!res.ok()) {
      const body = await res.text();
      const e: any = new Error(`POST ${url} failed: ${res.status()} ${body}`);
      e.status = res.status();
      throw e;
    }
    return parseJsonSafe(res);
  }, maxRetries);
}