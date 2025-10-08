import { ensureArray, toISODate, uniqueStrings } from '../shared/utils.js';
function fallbackNormalized() {
    return {
        member: {},
        maximums: {},
        deductibles: {
            individual: {},
            family: {}
        },
        coveragePct: {},
        waitingPeriods: [],
        claimsMailingAddress: undefined,
        historyByCode: {},
        extraNotes: [],
        additionalBenefits: {},
        provider: {},
        procedureLimitations: {}
    };
}
function extractMemberName(data) {
    const patient = (data.patient || {});
    const name = typeof patient.name === 'string' && patient.name.trim()
        ? patient.name.trim()
        : [patient.firstName, patient.lastName]
            .map(value => (typeof value === 'string' ? value.trim() : ''))
            .filter(Boolean)
            .join(' ');
    return name || data.summary?.patientName;
}
function extractMemberId(data) {
    const patient = (data.patient || {});
    return [
        typeof patient.issuedId === 'string' ? patient.issuedId.trim() : undefined,
        typeof patient.subscriberId === 'string' ? patient.subscriberId.trim() : undefined,
        data.summary?.memberId
    ].find(value => typeof value === 'string' && value.length > 0);
}
function extractPlanLabel(data, enrichment) {
    const eligibilityHistory = data.eligibilityHistory;
    const firstHistory = eligibilityHistory?.[0];
    const candidateLabels = uniqueStrings([
        enrichment?.planLabel?.trim(),
        data.patientComplete?.plan?.trim(),
        data.patient?.plan?.trim(),
        data.summary?.planName?.trim(),
        data.overview?.structured?.plan?.trim(),
        firstHistory?.['Client Name']?.trim(),
        firstHistory?.['Benefit Plan']?.trim()
    ]);
    return candidateLabels.find(Boolean);
}
function extractCoverageDates(data) {
    const historyEntry = (data.eligibilityHistory?.[0]);
    const effectiveRaw = historyEntry?.['Benefit Effective Date'] ?? historyEntry?.['Effective Date'];
    const terminationRaw = historyEntry?.['Termination Date'];
    return {
        start: toISODate(effectiveRaw),
        end: toISODate(terminationRaw)
    };
}
function normalizeWaitingPeriods(value) {
    if (!value)
        return [];
    if (Array.isArray(value))
        return value;
    const waiting = value;
    const result = [];
    const mapping = [
        { field: 'preventive', codes: ['PV', 'DI'] },
        { field: 'basic', codes: ['RS', 'PD', 'EN', 'OS', 'GS'] },
        { field: 'major', codes: ['CS', 'PF', 'PR', 'OR'] }
    ];
    for (const { field, codes } of mapping) {
        const months = waiting[field];
        if (typeof months === 'number' && months > 0) {
            result.push({
                treatmentCodes: codes,
                months,
                effective: '',
                end: ''
            });
        }
    }
    return result;
}
function buildProcedureLimitations(procedures) {
    const limitations = {};
    Object.entries(procedures ?? {}).forEach(([code, rule]) => {
        if (!code || !rule)
            return;
        const entry = {};
        if (rule.frequency) {
            entry.frequency = rule.frequency;
        }
        if (rule.limitations) {
            entry.limitations = rule.limitations;
        }
        if (rule.additional_requirements) {
            entry.additionalRequirements = rule.additional_requirements;
        }
        if (rule.coverage) {
            entry.coverage = rule.coverage;
        }
        if (rule.source) {
            entry.source = rule.source;
        }
        if (Object.keys(entry).length > 0) {
            limitations[code] = entry;
        }
    });
    return limitations;
}
function buildHistoryFromServiceHistory(data) {
    const history = {};
    const entries = ensureArray(data.serviceHistory);
    for (const entry of entries) {
        if (!entry)
            continue;
        const codeRaw = entry.code ?? entry.Code;
        if (typeof codeRaw !== 'string' || !codeRaw.trim())
            continue;
        const code = codeRaw.trim();
        const isoDate = toISODate(entry.date ?? entry.Date);
        const existing = history[code] ?? { count: 0 };
        if (isoDate) {
            if (!existing.firstDate || isoDate < existing.firstDate) {
                existing.firstDate = isoDate;
            }
            if (!existing.lastDate || isoDate > existing.lastDate) {
                existing.lastDate = isoDate;
            }
        }
        const description = entry.description ?? entry.Description;
        if (typeof description === 'string' && description.trim() && !existing.description) {
            existing.description = description.trim();
        }
        existing.count = (existing.count ?? 0) + 1;
        history[code] = existing;
    }
    return history;
}
function buildProvider(data) {
    const patient = (data.patient || {});
    const patientComplete = data.patientComplete;
    const primaryCare = patientComplete?.primaryCareProvider;
    const name = typeof primaryCare?.Provider === 'string' && primaryCare.Provider.trim()
        ? primaryCare.Provider.trim()
        : typeof patientComplete?.Provider === 'string'
            ? patientComplete.Provider.trim()
            : undefined;
    const practiceName = typeof primaryCare?.Office === 'string' && primaryCare.Office.trim()
        ? primaryCare.Office.trim()
        : typeof patientComplete?.Office === 'string'
            ? patientComplete.Office.trim()
            : undefined;
    const phone = typeof patient?.primaryHomePhone === 'string' && patient.primaryHomePhone.trim()
        ? patient.primaryHomePhone.trim()
        : typeof patient?.workPhone === 'string'
            ? patient.workPhone.trim()
            : undefined;
    const address = typeof primaryCare?.['Service Location'] === 'string' && primaryCare['Service Location'].trim()
        ? primaryCare['Service Location'].trim()
        : typeof patientComplete?.['Primary Address'] === 'string'
            ? patientComplete['Primary Address'].trim()
            : undefined;
    return {
        name,
        practiceName,
        phoneNumber: phone,
        address
    };
}
function toNumberValue(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed || trimmed.toLowerCase() === 'unknown' || trimmed.toLowerCase() === 'unlimited') {
            return null;
        }
        const numeric = Number(trimmed.replace(/[^0-9.-]/g, ''));
        return Number.isFinite(numeric) ? numeric : null;
    }
    return null;
}
function toOptionalNumber(value) {
    return value ?? undefined;
}
function dispatchUnsupportedState(state, plan, message) {
    if (typeof window === 'undefined') {
        return;
    }
    window.dentaquestWarning = { state, plan, message };
    window.dispatchEvent(new CustomEvent('dentaquest:unsupported-state', {
        detail: {
            state,
            plan,
            message
        }
    }));
}
function buildAdditionalBenefits(notes, coverage) {
    const benefits = {};
    if (notes) {
        Object.entries(notes).forEach(([label, value]) => {
            if (typeof value === 'string' && value.trim()) {
                benefits[label.trim().toLowerCase()] = value.trim();
            }
        });
    }
    const memberShare = coverage?.member_cost_share;
    if (memberShare) {
        if (typeof memberShare.copay === 'number') {
            benefits['copay amount'] = String(memberShare.copay);
        }
        if (memberShare.copay_levels) {
            for (const [levelKey, info] of Object.entries(memberShare.copay_levels)) {
                if (!info)
                    continue;
                if (typeof info.office_visit === 'number' && typeof benefits['copay amount'] === 'undefined') {
                    benefits['copay amount'] = String(info.office_visit);
                }
                if (info.notes) {
                    benefits[`copay notes ${levelKey.toLowerCase()}`] = info.notes;
                }
                if (info.income_range) {
                    benefits[`copay income range ${levelKey.toLowerCase()}`] = info.income_range;
                }
            }
        }
        if (typeof memberShare.notes === 'string' && memberShare.notes.trim()) {
            benefits['member cost share notes'] = memberShare.notes.trim();
        }
    }
    if (coverage?.coordination_of_benefits && typeof coverage.coordination_of_benefits === 'object') {
        const cobNotes = coverage.coordination_of_benefits.notes;
        if (typeof cobNotes === 'string' && cobNotes.trim()) {
            benefits['coordination of benefits'] = cobNotes.trim();
        }
    }
    if (coverage?.annual_maximum_notes) {
        benefits['annual maximum notes'] = coverage.annual_maximum_notes;
    }
    return benefits;
}
export function normalizeDentaQuest(data) {
    const enrichment = data.intelligentExtraction?.enrichment ?? null;
    const summary = (data.summary ?? {});
    const planLabel = extractPlanLabel(data, enrichment);
    const coverageDates = extractCoverageDates(data);
    const state = enrichment?.state
        ?? (planLabel?.match(/^([A-Z]{2})\s/)?.[1]);
    const hasEnrichment = !!enrichment && enrichment.supported !== false;
    const message = enrichment?.message
        ?? (hasEnrichment ? '' : state
            ? `Coverage details for ${state} not yet collected. Please notify the development team to add this catalog.`
            : 'Coverage catalog not yet collected for this plan.');
    if (!hasEnrichment) {
        if (message) {
            dispatchUnsupportedState(state, planLabel, message);
        }
        const fallback = fallbackNormalized();
        fallback.member = {
            name: extractMemberName(data),
            dob: toISODate(data.patient?.dateOfBirth ?? data.patient?.dob),
            memberId: extractMemberId(data),
            groupName: planLabel,
            productName: planLabel,
            coverageStart: coverageDates.start,
            coverageEnd: coverageDates.end,
            missingTooth: null
        };
        const summaryMax = toNumberValue(summary?.annualMaximum?.amount ?? summary?.annualMaximum);
        const fallbackAnnualTotal = toOptionalNumber(summaryMax);
        const fallbackAnnualUsed = toOptionalNumber(toNumberValue(summary?.annualMaximum?.used));
        const fallbackAnnualRemaining = toOptionalNumber(toNumberValue(summary?.annualMaximum?.remaining)) ?? fallbackAnnualTotal;
        fallback.maximums = {
            annualTotal: fallbackAnnualTotal,
            annualUsed: fallbackAnnualUsed,
            annualRemaining: fallbackAnnualRemaining,
            yearType: 'CALENDAR'
        };
        const fallbackDeductibleAmount = toNumberValue(summary?.deductible?.amount) ?? 0;
        const fallbackDeductibleRemaining = toOptionalNumber(toNumberValue(summary?.deductible?.remaining));
        fallback.deductibles = {
            individual: {
                amount: fallbackDeductibleAmount,
                remaining: fallbackDeductibleRemaining ?? fallbackDeductibleAmount,
                appliesTo: ['All Services']
            },
            family: {
                amount: undefined,
                remaining: undefined
            }
        };
        fallback.coveragePct = {
            preventive: toNumberValue(summary?.coveragePercentages?.preventive),
            basic: toNumberValue(summary?.coveragePercentages?.basic),
            major: toNumberValue(summary?.coveragePercentages?.major)
        };
        fallback.waitingPeriods = normalizeWaitingPeriods(summary?.waitingPeriods);
        fallback.historyByCode = buildHistoryFromServiceHistory(data);
        fallback.additionalBenefits = message ? { unsupported_plan: message } : {};
        const extraNotes = [];
        if (message)
            extraNotes.push(message);
        const warning = summary?.enrichmentWarning;
        if (typeof warning === 'string' && warning.trim()) {
            extraNotes.push(warning.trim());
        }
        fallback.extraNotes = extraNotes;
        fallback.provider = buildProvider(data);
        fallback.claimsMailingAddress = typeof summary?.claimsMailingAddress === 'string'
            ? summary.claimsMailingAddress
            : undefined;
        fallback.procedureLimitations = {};
        return fallback;
    }
    const coverage = enrichment?.coverage ?? {};
    const normalized = fallbackNormalized();
    normalized.member = {
        name: extractMemberName(data),
        dob: toISODate(data.patient?.dateOfBirth ?? data.patient?.dob),
        memberId: extractMemberId(data),
        groupName: planLabel,
        productName: planLabel,
        coverageStart: coverageDates.start,
        coverageEnd: coverageDates.end,
        missingTooth: typeof coverage?.missing_tooth_clause === 'boolean'
            ? coverage.missing_tooth_clause
            : null
    };
    const annualMaximum = toNumberValue(coverage?.annual_maximum) ?? toNumberValue(summary?.annualMaximum?.amount);
    const annualTotal = toOptionalNumber(annualMaximum);
    const annualUsed = toOptionalNumber(toNumberValue(summary?.annualMaximum?.used));
    const annualRemaining = toOptionalNumber(toNumberValue(summary?.annualMaximum?.remaining)) ?? annualTotal;
    normalized.maximums = {
        annualTotal,
        annualUsed,
        annualRemaining,
        yearType: 'CALENDAR'
    };
    const deductibleInfo = coverage?.deductible;
    const deductibleAmount = toNumberValue(deductibleInfo?.amount ?? deductibleInfo) ?? toNumberValue(summary?.deductible?.amount) ?? 0;
    const deductibleApplies = Array.isArray(deductibleInfo?.applies_to)
        ? deductibleInfo.applies_to
        : ['All Services'];
    const summaryDeductRemaining = toOptionalNumber(toNumberValue(summary?.deductible?.remaining));
    normalized.deductibles = {
        individual: {
            amount: deductibleAmount,
            remaining: summaryDeductRemaining ?? deductibleAmount,
            appliesTo: deductibleApplies
        },
        family: {
            amount: undefined,
            remaining: undefined
        }
    };
    const coveragePct = coverage?.coverage_percentages ?? enrichment?.coverage?.coverage_percentages ?? summary?.coveragePercentages ?? {};
    normalized.coveragePct = {
        preventive: toNumberValue(coveragePct?.preventive),
        basic: toNumberValue(coveragePct?.basic),
        major: toNumberValue(coveragePct?.major)
    };
    normalized.waitingPeriods = normalizeWaitingPeriods(coverage?.waiting_periods ?? enrichment?.coverage?.waiting_periods ?? summary?.waitingPeriods);
    normalized.procedureLimitations = buildProcedureLimitations(enrichment?.procedures);
    normalized.historyByCode = buildHistoryFromServiceHistory(data);
    normalized.provider = buildProvider(data);
    normalized.additionalBenefits = buildAdditionalBenefits(enrichment?.specialNotes, coverage);
    const extraNotes = [];
    if (coverage?.annual_maximum_notes) {
        extraNotes.push(coverage.annual_maximum_notes);
    }
    if (typeof coverage?.member_cost_share?.notes === 'string') {
        extraNotes.push(coverage.member_cost_share.notes);
    }
    if (message) {
        extraNotes.push(message);
    }
    const warning = summary?.enrichmentWarning;
    if (typeof warning === 'string' && warning.trim()) {
        extraNotes.push(warning.trim());
    }
    normalized.extraNotes = extraNotes;
    normalized.claimsMailingAddress = typeof summary?.claimsMailingAddress === 'string'
        ? summary.claimsMailingAddress
        : undefined;
    return normalized;
}
//# sourceMappingURL=dentaquest.js.map