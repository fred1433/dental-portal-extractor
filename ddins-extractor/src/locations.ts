// src/locations.ts
import type { APIRequestContext } from '@playwright/test';
import { postJson } from './http';

export async function getPracticeLocations(api: APIRequestContext, mtvPlocId?: string) {
  // Si l'API attend un body avec mtvPlocId, on le passe ; sinon envoie {}.
  const body = mtvPlocId ? { mtvPlocId } : {};
  return await postJson(api, '/provider-tools/v2/api/practice-location/locations', { data: body });
}