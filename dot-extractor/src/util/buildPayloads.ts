/**
 * Build Benefits payload that actually works with DOT API
 * Based on successful payload from working-benefits-payload.json
 */
export function buildBenefitsPayload(params: {
  clientId: string;
  subClientId: string;
  benefitProgramOid: string;
  memberPersonId: string;
  subscriberPersonId: string;
  memberDOBISO: string;
  planAcronym: string;
  relationship: 'Subscriber' | 'Spouse' | 'Dependent';
}) {
  // Convert ISO date to the expected format with timezone
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
    memberBenefitType: null, // Always null - don't omit it
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