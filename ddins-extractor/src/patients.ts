// src/patients.ts
import type { APIRequestContext } from '@playwright/test';
import { postJson } from './http';

export type RosterParams = {
  mtvPlocId: string;
  pageSize?: number;
  contractType?: 'FFS' | 'PPO' | 'ALL';
  sortBy?: 'MODIFIED_DATE' | 'NAME' | 'DOB';
};

function capRosterPageSize(size?: number) {
  const env = parseInt(process.env.ROSTER_PAGE_SIZE || '', 10);
  const desired = Number.isFinite(env) ? env : (size ?? 15);
  return Math.max(1, Math.min(15, desired)); // max autorisé = 15
}

export async function* iterateRoster(api: APIRequestContext, p: RosterParams) {
  let page = 1;
  const pageSize = capRosterPageSize(p.pageSize);

  for (;;) {
    const json = await postJson(api, '/provider-tools/v2/api/patient-mgnt/patient-roster', {
      data: {
        mtvPlocId: p.mtvPlocId,
        pageNumber: page,
        pageSize,
        patientView: 'PATIENTVIEW',
        sortBy: p.sortBy ?? 'MODIFIED_DATE',
        contractType: p.contractType ?? 'FFS'
      }
    });

    const items = json?.patients ?? json?.data ?? json?.items ?? [];
    if (!items.length) break;
    yield items;

    const total = json?.totalCount ?? json?.total ?? items.length;
    const seen = page * pageSize;
    if (seen >= total) break;
    page += 1;
  }
}

export async function getPatientFamily(api: APIRequestContext, enrolleeId: string) {
  return await postJson(api, '/provider-tools/v2/api/patient-mgnt/patient-family', {
    data: { e1: enrolleeId }
  });
}