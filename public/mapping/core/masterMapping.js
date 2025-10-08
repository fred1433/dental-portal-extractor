import { coalesce, formatCurrency } from '../shared/utils.js';
import { extractProcedureHistory, mapProcedureHistory } from './procedureHistory.js';
export function toFormFieldMap(normalized, raw) {
    const map = {};
    // Manual fields for ACE form
    map["Today's Date"] = new Date().toISOString().slice(0, 10);
    map["Employee's Initials"] = '';
    map["Rep's Name"] = 'Dentistry Automation';
    // Optional PMS appointment data (if available from Denticon, etc.)
    if (raw?.appointment?.date) {
        map["Appointment Date"] = raw.appointment.date;
    }
    const additionalBenefits = normalized.additionalBenefits ?? {};
    const getBenefit = (header) => {
        const key = header.trim().toLowerCase();
        return additionalBenefits[key];
    };
    const maskSSN = (value) => {
        if (!value) {
            return '';
        }
        const digits = value.replace(/\D/g, '');
        if (digits.length === 9) {
            return `***-**-${digits.slice(-4)}`;
        }
        if (/[\*Xx]/.test(value)) {
            return value;
        }
        return '';
    };
    // Office/Provider Information
    if (normalized.provider) {
        map['Practice Name'] = normalized.provider.practiceName ?? '';
        map['Provider Name'] = normalized.provider.name ?? '';
        // Phone number can come from provider or be looked up from clinic credentials
        map['Phone Number'] = normalized.provider.phoneNumber ?? '';
    }
    const patientName = normalized.member.name ?? raw.summary?.patientName;
    const patientDob = normalized.member.dob ?? raw.patient?.dateOfBirth;
    const memberId = normalized.member.memberId ?? raw.summary?.memberId ?? raw.patient?.subscriberId;
    map['Patient Name'] = patientName ?? '';
    map['Patient DOB'] = normalized.member.dob ?? formatDateValue(patientDob);
    map['Subscriber/Policy Holder Name'] = patientName ?? '';
    map['Subscriber/Policy Holder DOB'] = normalized.member.dob ?? formatDateValue(patientDob);
    if (normalized.member.relationship) {
        map['Relationship to Patient'] = normalized.member.relationship;
    }
    map['Member ID'] = memberId ?? '';
    if (normalized.member.insuranceNumber) {
        map['Insurance Number'] = normalized.member.insuranceNumber;
    }
    const maskedSSN = maskSSN(normalized.member.ssn);
    if (maskedSSN) {
        map['SSN'] = maskedSSN;
    }
    map['Insurance Name'] =
        normalized.member.productName ??
            raw.summary?.planName ??
            raw.portal ??
            '';
    const groupParts = [normalized.member.groupName, normalized.member.groupNumber, normalized.member.divisionNumber]
        .filter(Boolean)
        .join(' / ');
    map['Group Name / #'] = groupParts;
    // Also provide Group Name and Group Number separately for flexibility
    map['Group Name'] = normalized.member.groupName ?? '';
    map['Group Number'] = normalized.member.groupNumber ?? '';
    map['COB Type'] = 'Primary';
    map['Coordination of Benefits'] = 'Yes';
    map['Other Insurance on File?'] = 'No';
    // Payor ID: prefer claimPayerId (e.g., 94276 for Delta) over taxId
    map['Payor ID'] = normalized.claimPayerId ?? normalized.provider?.taxId ?? '';
    map['Claims Mailing Address'] = normalized.claimsMailingAddress ?? '';
    map['City'] = normalized.claimsCity ?? '';
    map['State'] = normalized.claimsState ?? '';
    map['Zip Code'] = normalized.claimsZipCode ?? '';
    const effectiveDate = normalized.member.coverageStart ?? raw.summary?.planStartDate;
    map['Effective Date'] = effectiveDate ?? '';
    map['Coverage Start Date'] = effectiveDate ?? '';
    map['Coverage End Date'] = normalized.member.coverageEnd ?? '';
    const annualTotal = coalesce(normalized.maximums.annualTotal, raw.summary?.annualMaximum?.amount);
    const annualRemaining = coalesce(normalized.maximums.annualRemaining, raw.summary?.annualMaximum?.remaining);
    map['Annual Maximum'] = typeof annualTotal === 'string'
        ? annualTotal
        : formatCurrency(annualTotal);
    map['Maximum Used'] = formatCurrency(normalized.maximums.annualUsed);
    map['Remaining Maximum'] = typeof annualRemaining === 'string'
        ? annualRemaining
        : formatCurrency(annualRemaining);
    if (normalized.maximums.yearType) {
        map['Benefit Year'] = normalized.maximums.yearType === 'CALENDAR' ? 'Calendar Year' : 'Benefit Year';
    }
    const individualDeductible = coalesce(normalized.deductibles.individual.amount, raw.summary?.deductible?.amount);
    map['Individual Deductible'] = typeof individualDeductible === 'string'
        ? individualDeductible
        : formatCurrency(individualDeductible);
    map['Deductible Remaining'] = formatCurrency(normalized.deductibles.individual.remaining);
    map['Family Deductible'] = formatCurrency(normalized.deductibles.family.amount);
    if (normalized.deductibles.individual.appliesTo?.length) {
        map['Deductible Applies To'] = normalized.deductibles.individual.appliesTo.join(', ');
    }
    else if (coalesce(normalized.deductibles.individual.amount, raw.summary?.deductible?.amount) === 0) {
        map['Deductible Applies To'] = 'None';
    }
    const copayBenefit = getBenefit('copay amount') || getBenefit('copay');
    if (copayBenefit) {
        const numericCopay = Number(copayBenefit);
        map['Co-Pay'] = Number.isFinite(numericCopay)
            ? formatCurrency(numericCopay)
            : copayBenefit;
    }
    else {
        const copayNotes = getBenefit('member cost share notes');
        if (copayNotes) {
            map['Co-Pay'] = copayNotes;
        }
    }
    map['Network Participation'] = normalized.member.productName?.includes('PPO') ? 'In-Network' : 'In-Network';
    const basisOfPaymentValue = getBenefit('basis of payment');
    map['If OON, Paid As'] = basisOfPaymentValue ? basisOfPaymentValue : 'N/A';
    const assignmentBenefit = getBenefit('Assignment of Benefits');
    if (assignmentBenefit) {
        const lower = assignmentBenefit.toLowerCase();
        if (lower.includes('not') || lower.includes('no')) {
            map['Assignment of Benefits Accepted?'] = 'No';
        }
        else if (lower.includes('accept')) {
            map['Assignment of Benefits Accepted?'] = 'Yes';
        }
    }
    else if (normalized.extraNotes.some(note => note.includes('assignment of benefits'))) {
        map['Assignment of Benefits Accepted?'] = 'Yes';
    }
    else {
        map['Assignment of Benefits Accepted?'] = 'Yes';
    }
    map['Fee Schedule Used'] = getBenefit('program description') || basisOfPaymentValue || normalized.member.productName || '';
    const cobBenefit = getBenefit('COB Rule');
    if (cobBenefit) {
        const lower = cobBenefit.toLowerCase();
        if (lower.includes('not') && lower.includes('coordinate')) {
            map['Coordination of Benefits'] = 'No';
        }
        else if (lower.includes('n/a')) {
            map['Coordination of Benefits'] = 'No';
        }
        else {
            map['Coordination of Benefits'] = 'Yes';
        }
    }
    const dualCoverageBenefit = getBenefit('Group Internal Dual Coverage');
    if (dualCoverageBenefit) {
        const lower = dualCoverageBenefit.toLowerCase();
        if (lower.includes('n/a') || lower.includes('not a benefit') || lower.includes('does not')) {
            map['Other Insurance on File?'] = 'No';
        }
        else {
            map['Other Insurance on File?'] = 'Yes';
        }
    }
    const basisOfPayment = getBenefit('Basis of Payment');
    if (basisOfPayment) {
        let condensed = basisOfPayment;
        const basisLower = basisOfPayment.toLowerCase();
        if (basisLower.includes('ppo') && basisLower.includes('premier')) {
            condensed = 'PPO schedule / Premier schedule';
        }
        else if (basisLower.includes('ppo')) {
            condensed = 'PPO schedule';
        }
        map['Fee Schedule Used'] = condensed;
    }
    if (normalized.coveragePct.preventive != null) {
        map['Preventive / Diagnostic (% Covered)'] = `${normalized.coveragePct.preventive}%`;
    }
    if (normalized.coveragePct.basic != null) {
        map['Basic Services (% Covered)'] = `${normalized.coveragePct.basic}%`;
    }
    if (normalized.coveragePct.major != null) {
        map['Major Services (% Covered)'] = `${normalized.coveragePct.major}%`;
    }
    // Add waiting periods information
    if (normalized.waitingPeriods?.length > 0) {
        // Categorize waiting periods
        const preventiveWait = findWaitingPeriod(normalized.waitingPeriods, ['PV', 'DI']);
        const basicWait = findWaitingPeriod(normalized.waitingPeriods, ['RS', 'PD', 'EN', 'OS', 'GS']);
        const majorWait = findWaitingPeriod(normalized.waitingPeriods, ['CS', 'PF', 'PR', 'OR']);
        if (preventiveWait) {
            map['Preventive Wait Period'] = `${preventiveWait.months} months`;
        }
        if (basicWait) {
            map['Basic Wait Period'] = `${basicWait.months} months`;
        }
        if (majorWait) {
            map['Major Wait Period'] = `${majorWait.months} months`;
        }
    }
    else {
        map['Preventive Wait Period'] = 'None';
        map['Basic Wait Period'] = 'None';
        map['Major Wait Period'] = 'None';
    }
    // Add Missing Tooth Clause to form
    if (typeof normalized.member.missingTooth === 'boolean') {
        map['Missing Tooth Clause'] = normalized.member.missingTooth ? 'Yes' : 'No';
    }
    // Add more Special Notes answers
    // Cast to any to allow additional fields
    const extendedMap = map;
    // Check treatment categories for Basic/Major classification
    const treatments = raw.eligibility?.pkg?.treatment;
    if (treatments) {
        const treatmentList = Array.isArray(treatments) ? treatments : [treatments];
        // SRP (Periodontics)
        const pdTreatment = treatmentList.find(t => t.treatmentCode === 'PD');
        if (pdTreatment?.summaryValues?.[0]?.maximumCoverage) {
            const coverage = pdTreatment.summaryValues[0].maximumCoverage;
            extendedMap['SRP Category'] = coverage >= 80 ? 'Basic' : 'Major';
        }
        // Endodontics
        const enTreatment = treatmentList.find(t => t.treatmentCode === 'EN');
        if (enTreatment?.summaryValues?.[0]?.maximumCoverage) {
            const coverage = enTreatment.summaryValues[0].maximumCoverage;
            extendedMap['Endo Category'] = coverage >= 80 ? 'Basic' : 'Major';
        }
        // Extractions (Oral Surgery)
        const osTreatment = treatmentList.find(t => t.treatmentCode === 'OS');
        if (osTreatment?.summaryValues?.[0]?.maximumCoverage) {
            const coverage = osTreatment.summaryValues[0].maximumCoverage;
            extendedMap['Extraction Category'] = coverage >= 80 ? 'Basic' : 'Major';
        }
        // Orthodontics
        const orTreatment = treatmentList.find(t => t.treatmentCode === 'OR');
        extendedMap['Orthodontic Coverage'] = orTreatment ? 'Yes' : 'No';
    }
    // Waiting period answer
    extendedMap['Waiting Period'] = normalized.waitingPeriods?.length > 0 ? 'Yes' : 'No';
    // Add NPI from provider
    if (raw.claims?.[0]?.renderingProvider?.npi) {
        extendedMap['NPI'] = raw.claims[0].renderingProvider.npi;
    }
    // Add provider address
    const providerAddress = raw.claims?.[0]?.renderingProvider?.contacts?.address;
    if (providerAddress) {
        const addressParts = [
            providerAddress.addressLine1,
            providerAddress.city,
            providerAddress.state,
            providerAddress.zipCode
        ].filter(Boolean);
        if (addressParts.length > 0) {
            extendedMap['Provider Address'] = addressParts.join(', ');
        }
    }
    // Add procedure history data
    const procedureHistory = extractProcedureHistory(raw);
    const procedureMap = mapProcedureHistory(procedureHistory);
    // Merge procedure data into main map
    Object.assign(map, procedureMap);
    if (normalized.procedureLimitations) {
        const dynamicMap = map;
        for (const [code, info] of Object.entries(normalized.procedureLimitations)) {
            if (!code || !info)
                continue;
            // Add coverage % (CRITICAL for ACE form)
            if (info.coverage) {
                dynamicMap[`${code}_coverage_pct`] = info.coverage;
            }
            // Add age limit (for Fluoride, Sealants, etc.)
            if (info.ageLimit) {
                dynamicMap[`${code}_age_limit`] = `${info.ageLimit} years`;
            }
            if (info.frequency) {
                dynamicMap[`${code}_frequency`] = info.frequency;
            }
            if (info.limitations) {
                dynamicMap[`${code}_limitations`] = info.limitations;
            }
            if (info.additionalRequirements) {
                const notesKey = `${code}_notes`;
                const extra = info.additionalRequirements.trim();
                if (extra) {
                    dynamicMap[notesKey] = dynamicMap[notesKey]
                        ? `${dynamicMap[notesKey]} — ${extra}`
                        : extra;
                }
            }
        }
    }
    // Add orthodontics data
    if (normalized.orthodontics) {
        map['Ortho Coverage'] = normalized.orthodontics.hasCoverage ? 'Yes' : 'No';
        if (normalized.orthodontics.hasCoverage) {
            if (normalized.orthodontics.coveragePct != null) {
                map['Ortho Coverage %'] = `${normalized.orthodontics.coveragePct}%`;
            }
            if (normalized.orthodontics.ageLimit != null) {
                map['Ortho Age Limit'] = `${normalized.orthodontics.ageLimit} years`;
            }
            if (normalized.orthodontics.lifetimeMax != null) {
                map['Ortho Lifetime Maximum'] = formatCurrency(normalized.orthodontics.lifetimeMax);
            }
        }
    }
    // Add Coverage Questions (ACE form requirement - specific policy questions)
    const dynamicMapForQuestions = map;
    // Check if D9232 (anesthesia) is covered
    if (normalized.procedureLimitations?.['D9232']) {
        dynamicMapForQuestions['D9232 Coverage'] = 'Yes';
    }
    else {
        dynamicMapForQuestions['D9232 Coverage'] = 'Not covered or not found';
    }
    // Sealant age limit (already extracted via procedureLimitations)
    if (normalized.procedureLimitations?.['D1351']?.ageLimit) {
        dynamicMapForQuestions['Sealant Age Limit'] = `${normalized.procedureLimitations['D1351'].ageLimit} years`;
    }
    // Time between SRP and Perio Maintenance
    const d4910Freq = normalized.procedureLimitations?.['D4910']?.frequency;
    if (d4910Freq) {
        // If D4910 says "4 per year" or similar, that's typically 3 months between
        if (d4910Freq.includes('4 per year') || d4910Freq.includes('3 month')) {
            dynamicMapForQuestions['Time Between SRP and Perio Maintenance'] = '3 months';
        }
        else if (d4910Freq.includes('2 per year') || d4910Freq.includes('6 month')) {
            dynamicMapForQuestions['Time Between SRP and Perio Maintenance'] = '6 months';
        }
        else {
            dynamicMapForQuestions['Time Between SRP and Perio Maintenance'] = d4910Freq;
        }
    }
    // Composite downgrade detection
    // Check if composite fillings (D2391-D2394) have limitations mentioning "amalgam" or "downgrade"
    let compositeDowngrade = false;
    for (const code of ['D2391', 'D2392', 'D2393', 'D2394']) {
        const limitation = normalized.procedureLimitations?.[code];
        if (limitation?.limitations) {
            const limText = limitation.limitations.toLowerCase();
            if (limText.includes('amalgam') || limText.includes('downgrade') || limText.includes('paid at') || limText.includes('alternate benefit')) {
                compositeDowngrade = true;
                break;
            }
        }
        if (limitation?.additionalRequirements) {
            const reqText = limitation.additionalRequirements.toLowerCase();
            if (reqText.includes('amalgam') || reqText.includes('downgrade') || reqText.includes('paid at') || reqText.includes('alternate benefit')) {
                compositeDowngrade = true;
                break;
            }
        }
    }
    dynamicMapForQuestions['Composite Downgrade'] = compositeDowngrade ? 'Yes' : 'No';
    // Does Perio Maintenance share frequency with prophy?
    // This is typically "Yes" if both D1110 and D4910 have the same frequency limit
    const d1110Freq = normalized.procedureLimitations?.['D1110']?.frequency;
    if (d1110Freq && d4910Freq) {
        // Simple heuristic: if they both mention "per year", they likely share
        if (d1110Freq.includes('per year') && d4910Freq.includes('per year')) {
            dynamicMapForQuestions['Perio Maintenance Shares Frequency'] = 'Yes';
        }
        else {
            dynamicMapForQuestions['Perio Maintenance Shares Frequency'] = 'No';
        }
    }
    // Add aggregated history fields (ACE form requirement - right column)
    const getLastDate = (code) => map[`${code}_last_date`] || '';
    map['Exam History'] = getLastDate('D0150') || getLastDate('D0120') || getLastDate('D0140');
    map['Prophy History'] = getLastDate('D1110') || getLastDate('D1120');
    map['Fluoride History'] = getLastDate('D1208') || getLastDate('D1206');
    map['Xray History'] = getLastDate('D0210') || getLastDate('D0274') || getLastDate('D0330');
    map['Sealant History'] = getLastDate('D1351');
    map['Filling History'] = getLastDate('D2391') || getLastDate('D2330') || getLastDate('D2331');
    map['SRP History'] = getLastDate('D4341');
    map['EXT History'] = getLastDate('D7240') || getLastDate('D7140');
    map['Crown History'] = getLastDate('D2740');
    map['Bridge History'] = '';
    map['Build Up History'] = getLastDate('D2950');
    map['Post & Core History'] = getLastDate('D2954');
    map['Denture History'] = getLastDate('D5110') || getLastDate('D5221') || getLastDate('D5213');

    // ACE-specific field name aliases (for compatibility with ACE compact form)
    // Waiting periods: ACE uses different field names
    if (map['Basic Wait Period']) {
        map['Waiting Period Basic'] = map['Basic Wait Period'];
    }
    if (map['Major Wait Period']) {
        map['Waiting Period Major'] = map['Major Wait Period'];
    }

    // Time between SRP and Perio: ACE uses shorter name
    if (map['Time Between SRP and Perio Maintenance']) {
        map['Time between SRP and Prophy'] = map['Time Between SRP and Perio Maintenance'];
    }

    // Composite downgrade: ACE calls it "SRP Downgrade"
    if (map['Composite Downgrade']) {
        map['SRP Downgrade'] = map['Composite Downgrade'];
    }

    // Perio maintenance shares frequency: ACE uses different name
    if (map['Perio Maintenance Shares Frequency']) {
        map['Share Freq with Prophy'] = map['Perio Maintenance Shares Frequency'];
    }

    return map;
}
function findWaitingPeriod(waitingPeriods, codes) {
    return waitingPeriods.find(wp => {
        const treatmentCodes = wp.treatmentCodes ?? [];
        return codes.some(code => treatmentCodes.includes(code));
    });
}
function formatDateValue(value) {
    if (!value)
        return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(value))
        return value.slice(0, 10);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        const [month, day, year] = value.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return '';
}
//# sourceMappingURL=toForm.js.map