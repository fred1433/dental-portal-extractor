import { request, APIRequestContext, APIResponse } from 'playwright';
import { getBearerFromStorage } from '../util/getBearer';

/**
 * Create DOT API client with session authentication
 * Uses Playwright's RequestContext to automatically handle cookies AND Bearer token
 */
export async function createDotApi(storagePath = 'dot-storage.json'): Promise<APIRequestContext> {
  // Extract Bearer token from the saved session
  const bearer = await getBearerFromStorage(storagePath);
  
  return await request.newContext({
    baseURL: 'https://www.dentalofficetoolkit.com',
    storageState: storagePath,
    extraHTTPHeaders: {
      'content-type': 'application/json',
      'accept': 'application/json',
      'authorization': `Bearer ${bearer}`,
      // Some gateways verify these headers
      'origin': 'https://www.dentalofficetoolkit.com',
      'referer': 'https://www.dentalofficetoolkit.com/dot-ui/home/'
    }
  });
}

/**
 * Helper to validate response and extract JSON
 */
async function validateAndParseResponse(response: APIResponse, endpoint: string) {
  if (!response.ok()) {
    const text = await response.text().catch(() => 'No response body');
    throw new Error(`${endpoint} failed: HTTP ${response.status()} - ${text}`);
  }
  
  const contentType = response.headers()['content-type'] || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`${endpoint} returned non-JSON response (session expired?). Content-Type: ${contentType}`);
  }
  
  return response.json();
}

// ============= DOT API Endpoints =============

/**
 * Search for member by ID or name
 */
export async function memberSearch(
  api: APIRequestContext,
  data: {
    memberId?: string;
    firstName?: string;
    lastName?: string;
    birthDate?: string;
    responseTypeIndicator?: string;
  }
) {
  const response = await api.post('/api/dot-gateway/v02/memberdetail/search', {
    data: {
      ...data,
      responseTypeIndicator: data.responseTypeIndicator || 'XML'
    }
  });
  
  return validateAndParseResponse(response, 'memberSearch');
}

/**
 * Get member benefits information
 */
export async function memberBenefits(
  api: APIRequestContext,
  data: {
    clientSpecifiedId: string;
    subClientSpecifiedId: string;
    memberPersonId: string;
    subscriberPersonId: string;
    memberDateOfBirth: string;
    memberPlanAcronym: string;
    relationshipToSubscriber: string;
  }
) {
  const response = await api.post('/api/dot-gateway/v1/benefit/memberbenefits/search', {
    data
  });
  
  return validateAndParseResponse(response, 'memberBenefits');
}

/**
 * Get routine procedures for member
 */
export async function routineProcedures(
  api: APIRequestContext,
  data: {
    clientId: string;
    subClientId: string;
    benefitProgramOid: string;
    memberPersonId: string;
    subscriberPersonId: string;
    memberBirthDate: string;
    planAcronym: string;
    relationshipToSubscriber: string;
  }
) {
  const response = await api.post('/api/dot-gateway/v1/benefit/memberbenefits/routineprocedures/search', {
    data
  });
  
  return validateAndParseResponse(response, 'routineProcedures');
}

/**
 * Search for claims within date range
 */
export async function claimSearch(
  api: APIRequestContext,
  data: {
    searchType: string;
    beginIndex: number;
    endIndex: number;
    startDate: string;
    endDate: string;
    patientPersonId: string[];
    subscriberPersonId: string;
    procedureCodes?: string[];
    areaofArch?: string[];
    toothCodes?: string[];
    carrierAcronym?: string;
  }
) {
  const response = await api.post('/api/dot-gateway/v1/claim/search', {
    data: {
      ...data,
      searchType: data.searchType || 'FC-AB',
      procedureCodes: data.procedureCodes || [],
      areaofArch: data.areaofArch || [],
      toothCodes: data.toothCodes || [],
      carrierAcronym: data.carrierAcronym || ''
    }
  });
  
  return validateAndParseResponse(response, 'claimSearch');
}

/**
 * Get prior authorization procedure codes
 */
export async function priorAuthCodes(
  api: APIRequestContext,
  data: {
    payerAcronym: string;
    groupSpecifiedIdentifier: string;
    subgroupSpecifiedIdentifier: string;
    memberType: string;
    asOf: string;
    dateOfBirth: string;
    procedureCodes?: string[];
    toothToProcedureCodeArray?: any[];
    encryptedDate?: boolean;
  }
) {
  const response = await api.post('/api/dot-gateway/v1/benefit/priorauthprocedurecodes/search', {
    data: {
      ...data,
      procedureCodes: data.procedureCodes || [],
      toothToProcedureCodeArray: data.toothToProcedureCodeArray || [],
      encryptedDate: data.encryptedDate || false
    }
  });
  
  return validateAndParseResponse(response, 'priorAuthCodes');
}

/**
 * Get client information
 */
export async function clientInfo(
  api: APIRequestContext,
  data: {
    planAcronym: string;
    client: { specifiedId: string };
    subClient: { specifiedId: string };
  }
) {
  const response = await api.post('/api/dot-gateway/v1/benefit/client/search', {
    data
  });
  
  return validateAndParseResponse(response, 'clientInfo');
}

/**
 * Close API context
 */
export async function closeApi(api: APIRequestContext) {
  await api.dispose();
}