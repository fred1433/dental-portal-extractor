// Maps Normalized DA format data to verification form fields
// This module bridges the gap between Normalized DA JSON and the HTML form

function mapDAToForm(normalizedDAData) {
  const formData = {};

  // Extract PatientVerification data (first element of array)
  const pv = normalizedDAData.PatientVerification?.[0] || {};

  // Patient & Subscriber Information
  formData['Patient Name'] = pv.FamilyMemberName || '';
  formData['Patient DOB'] = convertDateToInput(pv.FamilyMemberDateOfBirth);
  formData['Subscriber/Policy Holder Name'] = pv.SubscriberName || '';
  formData['Subscriber/Policy Holder DOB'] = convertDateToInput(pv.SubscriberDateOfBirth);
  formData['Member ID'] = pv.SubscriberId || pv.FamilyMemberId || '';

  // Insurance / Policy Information
  formData['Insurance Name'] = pv.InsuranceName || pv.Payer || '';
  // Fix: Include both group name and number properly
  if (pv.GroupName && pv.GroupNumber) {
    formData['Group Name / #'] = `${pv.GroupName} / ${pv.GroupNumber}`;
  } else if (pv.GroupName) {
    formData['Group Name / #'] = pv.GroupName;
  } else if (pv.GroupNumber) {
    formData['Group Name / #'] = pv.GroupNumber;
  } else {
    formData['Group Name / #'] = '';
  }
  formData['Payor ID'] = pv.ClaimPayerID || '';
  formData['Claims Mailing Address'] = pv.ClaimMailingAddress || pv.ClaimsAddress || '';

  // Benefit Breakdown
  formData['Effective Date'] = convertDateToInput(pv.SubscriberEffectiveDate);
  formData['Annual Maximum'] = formatCurrency(pv.IndividualAnnualMaximumBenefits);
  formData['Family Deductible'] = formatCurrency(pv.FamilyAnnualDeductible);
  formData['Remaining Maximum'] = formatCurrency(pv.IndividualAnnualRemainingBenefit);
  formData['Individual Deductible'] = formatCurrency(pv.IndividualAnnualDeductible);
  formData['Coverage Start Date'] = convertDateToInput(pv.FamilyMemberEffectiveDate);
  formData['Coverage End Date'] = convertDateToInput(pv.FamilyMemberEndDate);

  // Special fields for radio buttons and selects
  formData.specialFields = {
    'cob-type': 'primary', // Default to primary since this is usually the main insurance
    'coordination-benefits': pv.CoordinationofBenefits === 'Yes' ? 'Yes' : 'No',
    'benefit-year': pv.BenefitPeriod === 'Calendar Year' ? 'Calendar Year' : 'Benefit Year',
    'network-participation': pv.InNetworkOutNetwork ? 'In-Network' : 'Out-of-Network',
    'assignment-benefits': pv.AssignmentOfBenefits === 'Yes' ? 'Yes' : 'No',
    'missing-tooth': (pv.MissingToothClause && pv.MissingToothClause !== 'Missing tooth clause does not apply.') ? 'yes' : 'no',
    'waiting-period': pv.FamilyMemberWaitingPeriod && pv.FamilyMemberWaitingPeriod !== 'None' ? 'yes' : 'no'
  };

  // Map procedure codes from EligibilityBenefits
  if (normalizedDAData.EligibilityBenefits && Array.isArray(normalizedDAData.EligibilityBenefits)) {
    formData.procedures = {};

    normalizedDAData.EligibilityBenefits.forEach(benefit => {
      const code = benefit.ProcedureCode;
      if (!code) return;

      // Create procedure entry
      formData.procedures[code] = {
        frequency: benefit.limitation || '',
        limitations: benefit.limitation || '',
        lastDOS: convertDateToInput(benefit.ServiceHistory),
        notes: `${benefit.Benefits} coverage${benefit.DeductibleApplies === 'Yes' ? ', deductible applies' : ''}`
      };
    });
  }

  // Map treatment history from ServiceTreatmentHistory
  if (normalizedDAData.ServiceTreatmentHistory && Array.isArray(normalizedDAData.ServiceTreatmentHistory)) {
    normalizedDAData.ServiceTreatmentHistory.forEach(history => {
      const code = history.ProcedureCode;
      if (!code || !formData.procedures[code]) return;

      // Update with history data if available
      if (history.History && history.History !== 'No History') {
        formData.procedures[code].lastDOS = convertDateToInput(history.History);
      }
      if (history.LimitationText) {
        formData.procedures[code].limitations = history.LimitationText;
      }
    });
  }

  // Extract coverage percentages (estimate from common patterns)
  const preventiveBenefit = normalizedDAData.EligibilityBenefits?.find(b =>
    b.unit === 'Preventive' || b.ProcedureCode?.startsWith('D01') || b.ProcedureCode?.startsWith('D02')
  );
  const basicBenefit = normalizedDAData.EligibilityBenefits?.find(b =>
    b.unit === 'Basic' || b.ProcedureCode?.startsWith('D23') || b.ProcedureCode?.startsWith('D24')
  );
  const majorBenefit = normalizedDAData.EligibilityBenefits?.find(b =>
    b.unit === 'Major' || b.ProcedureCode?.startsWith('D27') || b.ProcedureCode?.startsWith('D28')
  );

  formData['Preventive / Diagnostic (% Covered)'] = preventiveBenefit?.Benefits || '100%';
  formData['Basic Services (% Covered)'] = basicBenefit?.Benefits || '80%';
  formData['Major Services (% Covered)'] = majorBenefit?.Benefits || '50%';

  return formData;
}

// Helper function to convert date formats
function convertDateToInput(dateStr) {
  if (!dateStr || dateStr === 'No History') return '';

  // Handle MM/DD/YYYY format
  if (dateStr.includes('/')) {
    const [month, day, year] = dateStr.split('/');
    if (year && month && day) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // Handle YYYY-MM-DD format (already correct)
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }

  return '';
}

// Helper function to format currency
function formatCurrency(value) {
  if (!value) return '';
  // Remove any existing $ and format
  const num = parseFloat(String(value).replace(/[$,]/g, ''));
  if (isNaN(num)) return '';
  return `$${num.toFixed(2)}`;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { mapDAToForm };
}

// Export for browser
if (typeof window !== 'undefined') {
  window.mapDAToForm = mapDAToForm;
}