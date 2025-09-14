// src/benefits.ts
import type { APIRequestContext } from '@playwright/test';
import { getJson } from './http';

async function getWithEnrollee(api: APIRequestContext, path: string, enrolleeId: string, referer?: string) {
  const headers: Record<string, string> = { enrolleeid: enrolleeId };
  if (referer) headers['referer'] = referer;

  return await getJson(api, `/provider-tools/v2/api${path}`, { headers });
}

export async function getEligibilityBundle(api: APIRequestContext, enrolleeId: string) {
  // On peut sur-spécifier le referer pour imiter la UI
  const ref = 'https://www.deltadentalins.com/provider-tools/v2/eligibility-benefits';

  const [pkg, maxDed, wait, addl, hist, mails, persons] = await Promise.all([
    getWithEnrollee(api, '/benefits/benefits-package', enrolleeId, ref),
    getWithEnrollee(api, '/benefits/maximums-deductibles', enrolleeId, ref),
    getWithEnrollee(api, '/benefits/waiting-periods', enrolleeId, ref),
    getWithEnrollee(api, '/benefits/additional-benefits', enrolleeId, ref),
    getWithEnrollee(api, '/treatment-history', enrolleeId, ref),
    getWithEnrollee(api, '/eligibility/claim-mailing-addresses', enrolleeId, ref),
    getWithEnrollee(api, '/eligibility/persons', enrolleeId, ref),
  ]);
  return { pkg, maxDed, wait, addl, hist, mails, persons };
}