// src/locations.ts
import type { APIRequestContext } from '@playwright/test';

export async function getPracticeLocations(api: APIRequestContext, mtvPlocId?: string) {
  // Si l'API attend un body avec mtvPlocId, on le passe ; sinon envoie {}.
  const body = mtvPlocId ? { mtvPlocId } : {};
  const res = await api.post('/provider-tools/v2/api/practice-location/locations', { data: body });
  if (!res.ok()) throw new Error(`locations failed: ${res.status()} ${await res.text()}`);
  return await res.json();
}