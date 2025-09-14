// src/claims.ts
import type { APIRequestContext } from '@playwright/test';
import { getJson } from './http';

export type ClaimsQuery = {
  practiceLocationId: string;
  timePeriod?: number;      // 1, 3, 6, 12...
  pageSize?: number;        // défaut 10, cap éventuel côté serveur
  claimTransactionType?: string; // 'All Claims'
  enrolleeId?: string;      // si supporté
};

function claimsPageSize(size?: number) {
  const env = parseInt(process.env.CLAIMS_PAGE_SIZE || '', 10);
  const desired = Number.isFinite(env) ? env : (size ?? 10);
  return Math.max(1, Math.min(50, desired)); // garde une limite raisonnable
}

export async function* iterateClaims(api: APIRequestContext, q: ClaimsQuery) {
  let pageNumber = 1;
  const pageSize = claimsPageSize(q.pageSize);

  for (;;) {
    const params = {
      practiceLocationId: q.practiceLocationId,
      timePeriod: q.timePeriod ?? 12,
      pageNumber,
      pageSize,
      claimTransactionType: q.claimTransactionType ?? 'All Claims'
    };

    const headers = q.enrolleeId ? { enrolleeid: q.enrolleeId } : undefined;

    const json = await getJson(api, '/provider-tools/v2/api/claims', { params, headers });
    const items = json?.claims ?? json?.data ?? json?.items ?? [];
    if (!items.length) break;
    yield items;

    const total = json?.totalCount ?? json?.total ?? items.length;
    if (pageNumber * pageSize >= total) break;
    pageNumber += 1;
  }
}

export async function getClaimDetail(api: APIRequestContext, claimId: string, practiceLocationId: string) {
  const json = await getJson(api, `/provider-tools/v2/api/claim/${claimId}`, {
    headers: { pmtvplocid: practiceLocationId }
  });
  return json;
}