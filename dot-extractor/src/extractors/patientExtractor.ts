import type { APIRequestContext } from 'playwright';
import {
  memberSearch,
  memberBenefits,
  routineProcedures,
  claimSearch,
  priorAuthCodes,
  clientInfo
} from '../sdk/dotClient';
import { logger } from '../util/logger';
import { retryWithBackoff, formatDateToISO, parseRelationship, sleep } from '../util/helpers';

export interface Person {
  personId: string;
  role: 'Subscriber' | 'Spouse' | 'Dependent' | 'Unknown';
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  memberId?: string;
}

export interface PatientInput {
  memberId?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string; // MM/DD/YYYY format
  from?: string; // ISO format
  to?: string; // ISO format
}

export interface PatientBundle {
  input: PatientInput;
  subscriber: Person;
  family: Person[];
  benefits: any;
  routineProcedures: any;
  claims: any[];
  priorAuth?: any;
  client?: any;
  meta: {
    planAcronym?: string;
    clientSpecifiedId?: string;
    subClientSpecifiedId?: string;
    benefitProgramOid?: string;
    extractedAt: string;
  };
}

/**
 * Extract complete patient data from DOT
 */
export async function extractPatient(
  api: APIRequestContext,
  input: PatientInput
): Promise<PatientBundle> {
  logger.info('Starting patient extraction', { memberId: input.memberId });
  
  // Step 1: Search for member
  logger.progress('Searching for member...');
  const searchResult = await retryWithBackoff(() =>
    memberSearch(api, {
      memberId: input.memberId,
      firstName: input.firstName,
      lastName: input.lastName,
      birthDate: input.birthDate,
      responseTypeIndicator: 'XML'
    })
  );
  
  // Extract IDs and metadata from search result
  // Note: Actual field names may vary based on real API response
  const subscriberPersonId = searchResult?.subscriberPersonId || 
                           searchResult?.data?.subscriber?.personId ||
                           searchResult?.subscriber?.personId;
                           
  const memberPersonId = searchResult?.memberPersonId || 
                        searchResult?.data?.member?.personId ||
                        searchResult?.member?.personId;
                        
  const planAcronym = searchResult?.memberPlanAcronym || 
                     searchResult?.data?.planAcronym || 
                     searchResult?.planAcronym || 
                     'DDMN';
                     
  const clientSpecifiedId = searchResult?.clientSpecifiedId || 
                          searchResult?.data?.clientSpecifiedId ||
                          searchResult?.client?.specifiedId;
                          
  const subClientSpecifiedId = searchResult?.subClientSpecifiedId || 
                             searchResult?.data?.subClientSpecifiedId ||
                             searchResult?.subClient?.specifiedId;
                             
  const benefitProgramOid = searchResult?.benefitProgramOid || 
                          searchResult?.data?.benefitProgramOid;
  
  if (!subscriberPersonId || !memberPersonId) {
    throw new Error('Could not extract person IDs from search result');
  }
  
  logger.success(`Found member: PersonID ${memberPersonId}`);
  
  // Extract family members
  const familyMembers = searchResult?.familyMembers || 
                       searchResult?.data?.familyMembers || 
                       searchResult?.family || 
                       [];
                       
  const family: Person[] = familyMembers.map((member: any) => ({
    personId: member.personId || member.id,
    role: parseRelationship(member.relationship || member.role || 'Unknown'),
    firstName: member.firstName,
    lastName: member.lastName,
    birthDate: member.birthDate || member.dateOfBirth,
    memberId: member.memberId
  }));
  
  logger.info(`Found ${family.length} family members`);
  
  // Add rate limiting delay
  await sleep(500);
  
  // Step 2: Get member benefits
  logger.progress('Fetching member benefits...');
  const benefitsData = await retryWithBackoff(() =>
    memberBenefits(api, {
      clientSpecifiedId,
      subClientSpecifiedId,
      memberPersonId,
      subscriberPersonId,
      memberDateOfBirth: formatDateToISO(input.birthDate!),
      memberPlanAcronym: planAcronym,
      relationshipToSubscriber: 'Subscriber'
    })
  );
  
  logger.success('Benefits retrieved');
  await sleep(500);
  
  // Step 3: Get routine procedures
  logger.progress('Fetching routine procedures...');
  const routineData = await retryWithBackoff(() =>
    routineProcedures(api, {
      clientId: clientSpecifiedId,
      subClientId: subClientSpecifiedId,
      benefitProgramOid,
      memberPersonId,
      subscriberPersonId,
      memberBirthDate: formatDateToISO(input.birthDate!),
      planAcronym,
      relationshipToSubscriber: 'Subscriber'
    })
  );
  
  logger.success('Routine procedures retrieved');
  await sleep(500);
  
  // Step 4: Get claims with pagination
  logger.progress('Fetching claims history...');
  const fromDate = input.from || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const toDate = input.to || new Date().toISOString();
  
  const personIds = [memberPersonId, ...family.map(f => f.personId)].filter(Boolean);
  const allClaims: any[] = [];
  const pageSize = 200;
  let beginIndex = 0;
  let hasMore = true;
  
  while (hasMore) {
    const claimsResponse = await retryWithBackoff(() =>
      claimSearch(api, {
        searchType: 'FC-AB',
        beginIndex,
        endIndex: beginIndex + pageSize,
        startDate: fromDate,
        endDate: toDate,
        patientPersonId: personIds,
        subscriberPersonId,
        procedureCodes: [],
        areaofArch: [],
        toothCodes: [],
        carrierAcronym: ''
      })
    );
    
    const items = claimsResponse?.items || 
                 claimsResponse?.claims || 
                 claimsResponse?.data?.claims || 
                 [];
                 
    allClaims.push(...items);
    logger.info(`Retrieved ${items.length} claims (total: ${allClaims.length})`);
    
    hasMore = items.length === pageSize;
    beginIndex += pageSize;
    
    if (hasMore) {
      await sleep(800); // Rate limit between pages
    }
  }
  
  logger.success(`Total claims retrieved: ${allClaims.length}`);
  await sleep(500);
  
  // Step 5: Get prior auth codes (optional)
  let priorAuthData = null;
  try {
    logger.progress('Fetching prior authorization codes...');
    priorAuthData = await retryWithBackoff(() =>
      priorAuthCodes(api, {
        payerAcronym: planAcronym,
        groupSpecifiedIdentifier: clientSpecifiedId,
        subgroupSpecifiedIdentifier: subClientSpecifiedId,
        memberType: 'Subscriber',
        asOf: toDate.split('T')[0],
        dateOfBirth: input.birthDate!,
        procedureCodes: [],
        toothToProcedureCodeArray: [],
        encryptedDate: false
      })
    );
    logger.success('Prior auth codes retrieved');
  } catch (error) {
    logger.warn('Could not fetch prior auth codes (may not be available)');
  }
  
  await sleep(500);
  
  // Step 6: Get client info (optional)
  let clientData = null;
  try {
    logger.progress('Fetching client information...');
    clientData = await retryWithBackoff(() =>
      clientInfo(api, {
        planAcronym,
        client: { specifiedId: clientSpecifiedId },
        subClient: { specifiedId: subClientSpecifiedId }
      })
    );
    logger.success('Client info retrieved');
  } catch (error) {
    logger.warn('Could not fetch client info (may not be available)');
  }
  
  // Build final bundle
  const bundle: PatientBundle = {
    input,
    subscriber: {
      personId: subscriberPersonId,
      role: 'Subscriber',
      firstName: input.firstName,
      lastName: input.lastName,
      birthDate: input.birthDate,
      memberId: input.memberId
    },
    family,
    benefits: benefitsData,
    routineProcedures: routineData,
    claims: allClaims,
    priorAuth: priorAuthData,
    client: clientData,
    meta: {
      planAcronym,
      clientSpecifiedId,
      subClientSpecifiedId,
      benefitProgramOid,
      extractedAt: new Date().toISOString()
    }
  };
  
  logger.success('Patient extraction completed successfully');
  return bundle;
}