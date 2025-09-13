/**
 * Parse and normalize Benefits data from DOT API response
 * All the data is already in the API response - we just need to structure it properly
 */

export interface ParsedBenefits {
  // Plan & Product Info
  planInfo: {
    productName: string;
    planAcronym: string;
    clientName: string;
    clientId: string;
    subClientName: string;
    subClientId: string;
    groupType: string;
    enrollmentType: string;
  };

  // Eligibility & Status  
  eligibility: {
    status: string;
    effectiveDate: string;
    contractStartDate: string;
    contractEndDate: string;
    benefitPeriodStart: string;
    benefitPeriodEnd: string;
    accumulationPeriodType: string;
  };

  // Networks
  networks: Array<{
    name: string;
    networkId: string;
    alternateName?: string;
  }>;

  // Coverage by Category with percentages and exclusions
  coverages: Array<{
    category: string;
    procedureId: string;
    networks: string[];
    coverage: {
      percent: string;
      coPayFee?: string;
      hasCoPay: boolean;
    };
    exclusionsAndLimitations: string[];
    waitingPeriods?: any;
  }>;

  // Maximums & Deductibles with amounts/used/remaining
  maximumsAndDeductibles: Array<{
    type: 'Maximum' | 'Deductible';
    category: 'General' | 'Orthodontic';
    name: string;
    description: string;
    isLifetime: boolean;
    individualAmount: number;
    individualUsed: number;
    individualRemaining: number;
    familyAmount?: number;
    familyUsed?: number;
    familyRemaining?: number;
    period: {
      startDate: string;
      endDate: string;
    };
  }>;

  // Orthodontic specifics
  ortho: {
    lifetimeMax: number;
    ageLimits: {
      subscriber: { min: number; max: number; rule: string };
      spouse: { min: number; max: number; rule: string };
      dependent: { min: number; max: number; rule: string };
    };
  };

  // COB Information
  cob: {
    enabled: boolean;
    internalCOB: boolean;
    externalCOB: boolean;
    paymentOrder: string;
    paymentOption: string;
    appliesTo: string[];
  };

  // Age Limitations
  ageLimitations: {
    childMaxAge: string;
    childMaxAgeType: string;
    studentMaxAge: string;
    studentMaxAgeType: string;
  };

  // Out of Pocket Maximum
  outOfPocketMax?: any;
}

export function parseBenefits(raw: any): ParsedBenefits | null {
  if (!raw) return null;

  try {
    // Extract plan info
    const planInfo = {
      productName: raw.productName || '',
      planAcronym: raw.client?.planAcronym || '',
      clientName: raw.client?.clientName || '',
      clientId: raw.client?.clientSpecifiedId || '',
      subClientName: raw.client?.subClientName || '',
      subClientId: raw.client?.subClientSpecifiedId || '',
      groupType: raw.client?.clientType || '',
      enrollmentType: raw.contract?.enrollmentType || ''
    };

    // Extract eligibility (from member search data typically)
    const eligibility = {
      status: 'Active', // This comes from member search, not benefits
      effectiveDate: raw.contract?.startDate || '',
      contractStartDate: raw.contract?.startDate || '',
      contractEndDate: raw.contract?.endDate || '',
      benefitPeriodStart: raw.contract?.benefitPeriodStartDate || '',
      benefitPeriodEnd: raw.contract?.benefitPeriodEndDate || '',
      accumulationPeriodType: raw.contract?.accumulationPeriodType || ''
    };

    // Extract networks
    const networks = (raw.networks || []).map((n: any) => ({
      name: n.name,
      networkId: n.networkId,
      alternateName: n.alternateName
    }));

    // Extract coverages from networkBenefits
    const coverages: any[] = [];
    if (raw.networkBenefits) {
      for (const nb of raw.networkBenefits) {
        if (nb.coverages) {
          for (const cov of nb.coverages) {
            coverages.push({
              category: cov.procedure,
              procedureId: cov.procedureId,
              networks: nb.networks || [],
              coverage: {
                percent: cov.coverage?.percent || '0',
                coPayFee: cov.coverage?.coPayFee,
                hasCoPay: cov.coverage?.hasCoPay || false
              },
              exclusionsAndLimitations: cov.exclusionsAndLimitations || [],
              waitingPeriods: cov.waitingPeriods
            });
          }
        }
      }
    }

    // Extract maximums and deductibles
    const maximumsAndDeductibles: any[] = [];
    if (raw.maximumsAndDeductions) { // Note the typo in API: "Deductions"
      for (const md of raw.maximumsAndDeductions) {
        if (md.accumulators) {
          for (const acc of md.accumulators) {
            maximumsAndDeductibles.push({
              type: acc.accumulatorType as 'Maximum' | 'Deductible',
              category: acc.categoryType as 'General' | 'Orthodontic',
              name: acc.name,
              description: acc.description || '',
              isLifetime: acc.isLifetime || false,
              individualAmount: acc.individualAmount || 0,
              individualUsed: acc.individualAmountUsed || 0,
              individualRemaining: acc.individualAmountRemaining || 0,
              familyAmount: acc.familyAmount,
              familyUsed: acc.familyAmountUsed,
              familyRemaining: acc.familyAmountRemaining,
              period: {
                startDate: acc.startDate || '',
                endDate: acc.endDate || ''
              }
            });
          }
        }
      }
    }

    // Extract orthodontic info
    const orthoMax = maximumsAndDeductibles.find(m => 
      m.type === 'Maximum' && m.category === 'Orthodontic'
    );
    
    const orthoAgeConfig = raw.orthoAgeLimitConfig?.[0] || {};
    const ortho = {
      lifetimeMax: orthoMax?.individualAmount || 0,
      ageLimits: {
        subscriber: {
          min: orthoAgeConfig.subscriberMinAge || 0,
          max: orthoAgeConfig.subscriberMaxAge || 99,
          rule: orthoAgeConfig.subscriberRule || ''
        },
        spouse: {
          min: orthoAgeConfig.spouseMinAge || 0,
          max: orthoAgeConfig.spouseMaxAge || 99,
          rule: orthoAgeConfig.spouseRule || ''
        },
        dependent: {
          min: orthoAgeConfig.minorMinAge || 0,
          max: orthoAgeConfig.minorMaxAge || 99,
          rule: orthoAgeConfig.minorRule || ''
        }
      }
    };

    // Extract COB info
    const cobConfig = raw.contract?.cobConfig || {};
    const cob = {
      enabled: cobConfig.internalCOBIndicator || cobConfig.externalCOBIndicator || false,
      internalCOB: cobConfig.internalCOBIndicator || false,
      externalCOB: cobConfig.externalCOBIndicator || false,
      paymentOrder: cobConfig.paymentOrdertype || '',
      paymentOption: cobConfig.paymentOptionType || '',
      appliesTo: [
        ...(cobConfig.internalMemberTypes || []).map((m: any) => m.value),
        ...(cobConfig.externalMemberTypes || []).map((m: any) => m.value)
      ].filter((v, i, a) => a.indexOf(v) === i) // unique values
    };

    // Extract age limitations
    const ageConfig = raw.contract?.ageLimitations || {};
    const ageLimitations = {
      childMaxAge: ageConfig.childMaxAgeLimit || '',
      childMaxAgeType: ageConfig.childMaxAgeLimitType || '',
      studentMaxAge: ageConfig.studentMaxAgeLimit || '',
      studentMaxAgeType: ageConfig.studentMaxAgeLimitType || ''
    };

    // Out of pocket max if exists
    const outOfPocketMax = raw.outOfPocketMax;

    return {
      planInfo,
      eligibility,
      networks,
      coverages,
      maximumsAndDeductibles,
      ortho,
      cob,
      ageLimitations,
      outOfPocketMax
    };

  } catch (error) {
    console.error('Error parsing benefits:', error);
    return null;
  }
}

/**
 * Generate a human-readable summary of benefits
 */
export function generateBenefitsSummary(parsed: ParsedBenefits): string {
  const lines: string[] = [];
  
  lines.push('📋 BENEFITS SUMMARY');
  lines.push('==================\n');
  
  // Plan info
  lines.push(`Plan: ${parsed.planInfo.productName}`);
  lines.push(`Client: ${parsed.planInfo.clientName} (${parsed.planInfo.clientId})`);
  lines.push(`Sub-Client: ${parsed.planInfo.subClientName}\n`);
  
  // Maximums & Deductibles
  lines.push('💰 MAXIMUMS & DEDUCTIBLES:');
  for (const item of parsed.maximumsAndDeductibles) {
    lines.push(`  ${item.type} - ${item.name}:`);
    lines.push(`    Individual: $${item.individualAmount} (Used: $${item.individualUsed}, Remaining: $${item.individualRemaining})`);
    if (item.familyAmount) {
      lines.push(`    Family: $${item.familyAmount} (Used: $${item.familyUsed}, Remaining: $${item.familyRemaining})`);
    }
  }
  lines.push('');
  
  // Key coverages
  lines.push('🦷 KEY COVERAGES:');
  const keyCoverages = parsed.coverages.filter(c => 
    ['Diagnostic', 'Preventive', 'Basic Restorative', 'Major Restorative', 'Orthodontic Services'].includes(c.category)
  );
  for (const cov of keyCoverages) {
    lines.push(`  ${cov.category}: ${cov.coverage.percent}%`);
    if (cov.exclusionsAndLimitations.length > 0) {
      lines.push(`    Note: ${cov.exclusionsAndLimitations[0]}`);
    }
  }
  lines.push('');
  
  // Orthodontic
  if (parsed.ortho.lifetimeMax > 0) {
    lines.push('🦷 ORTHODONTIC:');
    lines.push(`  Lifetime Maximum: $${parsed.ortho.lifetimeMax}`);
    lines.push(`  Age Limits: ${parsed.ortho.ageLimits.dependent.min}-${parsed.ortho.ageLimits.dependent.max} years`);
    lines.push('');
  }
  
  // COB
  if (parsed.cob.enabled) {
    lines.push('🔄 COORDINATION OF BENEFITS:');
    lines.push(`  Payment Order: ${parsed.cob.paymentOrder}`);
    lines.push(`  Payment Option: ${parsed.cob.paymentOption}`);
    lines.push(`  Applies To: ${parsed.cob.appliesTo.join(', ')}`);
    lines.push('');
  }
  
  // Networks
  lines.push('🌐 NETWORKS:');
  for (const net of parsed.networks) {
    lines.push(`  • ${net.name}${net.alternateName ? ` (${net.alternateName})` : ''}`);
  }
  
  return lines.join('\n');
}