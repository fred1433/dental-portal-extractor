// src/ddinsApi.ts
import { request, APIRequestContext } from '@playwright/test';

export type DdinsApiOptions = {
  storageStatePath: string;
  ptUserId: string;  // ex: "Payoraccess4771"
};

export async function createDdinsApi(opts: DdinsApiOptions): Promise<APIRequestContext> {
  return await request.newContext({
    baseURL: 'https://www.deltadentalins.com',
    storageState: opts.storageStatePath,
    extraHTTPHeaders: {
      accept: 'application/json',
      'content-type': 'application/json',
      'pt-userid': opts.ptUserId
    }
  });
}

export async function closeApi(api: APIRequestContext): Promise<void> {
  await api.dispose();
}