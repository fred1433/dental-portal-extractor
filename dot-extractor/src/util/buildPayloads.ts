/**
 * Build Benefits payload that actually works with DOT API
 * FIXED: Using correct field names for Benefits vs Routine
 */
export function buildBenefitsPayload(params: {
  clientId?: string;
  subClientId?: string;
  clientSpecifiedId?: string;  // Fallback option
  subClientSpecifiedId?: string;  // Fallback option
  benefitProgramOid: string;  // REQUIRED - this was the missing piece!
  memberPersonId: string;
  subscriberPersonId: string;
  memberDOBISO: string;
  planAcronym: string;
  relationship: 'Subscriber' | 'Spouse' | 'Dependent';
  isEHBRequest?: boolean;  // Optional flags from successful captures
  isStandardRequest?: boolean;
}) {
  // Convert ISO date to the expected format with timezone
  const date = new Date(params.memberDOBISO);
  const formattedDate = date.toISOString().replace('Z', '-02:00');
  
  // Build TWO variants - one with clientId, one with clientSpecifiedId
  const basePayload: any = {
    benefitProgramOid: params.benefitProgramOid,  // Critical!
    memberDateOfBirth: formattedDate,  // ✅ CORRECT: memberDateOfBirth for Benefits (NOT memberBirthDate)
    memberPersonId: params.memberPersonId,
    subscriberPersonId: params.subscriberPersonId,
    memberPlanAcronym: params.planAcronym,  // ✅ CORRECT: memberPlanAcronym for Benefits (NOT planAcronym)
    relationshipToSubscriber: params.relationship
    // DO NOT include memberBenefitType - it causes 400 errors
  };
  
  // Add optional flags if provided (from successful captures)
  if (params.isEHBRequest !== undefined) {
    basePayload.isEHBRequest = params.isEHBRequest;
  }
  if (params.isStandardRequest !== undefined) {
    basePayload.isStandardRequest = params.isStandardRequest;
  }
  
  // Variant A: Try with clientId/subClientId first (more reliable)
  const variantA = params.clientId ? {
    clientId: params.clientId,
    subClientId: params.subClientId,
    ...basePayload
  } : null;
  
  // Variant B: Fallback with clientSpecifiedId/subClientSpecifiedId
  const variantB = params.clientSpecifiedId ? {
    clientSpecifiedId: params.clientSpecifiedId,
    subClientSpecifiedId: params.subClientSpecifiedId || '0001',
    ...basePayload
  } : null;
  
  // Return both variants for retry logic
  return { variantA, variantB };
}

/**
 * Build Routine Procedures payload (for reference)
 */
export function buildRoutineProceduresPayload(params: {
  clientId: string;
  benefitProgramOid: string;
  subClientId: string;
  memberPersonId: string;
  subscriberPersonId: string;
  memberDOBISO: string;
  planAcronym: string;
  relationship: 'Subscriber' | 'Spouse' | 'Dependent';
}) {
  const date = new Date(params.memberDOBISO);
  const formattedDate = date.toISOString().replace('Z', '-02:00');
  
  return {
    clientId: params.clientId,
    benefitProgramOid: params.benefitProgramOid,
    subClientId: params.subClientId,
    memberBirthDate: formattedDate,
    memberPersonId: params.memberPersonId,
    planAcronym: params.planAcronym,
    relationshipToSubscriber: params.relationship,
    memberBenefitType: null,
    subscriberPersonId: params.subscriberPersonId
  };
}

/**
 * Flatten claim detail into CSV-friendly rows
 */
export function flattenClaimDetail(claim: any, detail: any, patient: any) {
  const rows: any[] = [];
  const lines = detail?.lineItems || [];
  
  if (lines.length === 0) {
    // If no line items, create one row with claim-level data
    rows.push({
      subscriberName: patient?.subscriberName || '',
      patientName: `${detail?.patientFirstName || ''} ${detail?.patientLastName || ''}`.trim() || patient?.name || '',
      relationship: patient?.relationship || '',
      claimNumber: detail?.claimNumber || claim?.claimNumber || '',
      serviceDate: claim?.serviceDate || '',
      procedureCode: '',
      procedureDescription: '',
      tooth: '',
      surfaces: '',
      units: '',
      billedAmount: claim?.totalBilledAmount || '',
      allowedAmount: '',
      paidAmount: claim?.totalPaidAmount || '',
      status: detail?.claimStatus || claim?.status || '',
      providerNPI: detail?.renderingNPI || '',
      providerName: detail?.dentistName || claim?.providerName || '',
      planAcronym: detail?.planAcronym || '',
      groupId: patient?.groupId || '',
      subGroupId: patient?.subGroupId || ''
    });
  }
  
  for (const li of lines) {
    rows.push({
      subscriberName: patient?.subscriberName || '',
      patientName: `${detail?.patientFirstName || ''} ${detail?.patientLastName || ''}`.trim() || patient?.name || '',
      relationship: patient?.relationship || '',
      claimNumber: detail?.claimNumber || claim?.claimNumber || '',
      serviceDate: li?.serviceDate || claim?.serviceDate || '',
      procedureCode: li?.procedureCode || '',
      procedureDescription: li?.description || '',
      tooth: li?.toothCode || li?.teeth || '',
      surfaces: li?.toothSurfaces || '',
      units: li?.units || '1',
      billedAmount: li?.submittedAmount || '',
      allowedAmount: li?.allowedAmount || '',
      paidAmount: li?.planPayment || '',
      patientPayment: li?.patientPayment || '',
      status: li?.lineItemStatus || detail?.claimStatus || '',
      providerNPI: detail?.renderingNPI || '',
      providerName: detail?.dentistName || claim?.providerName || '',
      planAcronym: li?.planAcronym || detail?.planAcronym || '',
      groupId: patient?.groupId || '',
      subGroupId: patient?.subGroupId || ''
    });
  }
  
  return rows;
}