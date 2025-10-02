import { ensureArray, parseNumber, toISODate, uniqueStrings } from '../shared/utils.js';
import { mapCoverageByCategory } from '../shared/coverage.js';
function calculateAge(dateOfBirth) {
    if (!dateOfBirth)
        return undefined;
    try {
        let dobDate;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateOfBirth)) {
            const [month, day, year] = dateOfBirth.split('/');
            dobDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        else if (/^\d{4}-\d{2}-\d{2}/.test(dateOfBirth)) {
            dobDate = new Date(dateOfBirth);
        }
        else {
            return undefined;
        }
        const today = new Date();
        let age = today.getFullYear() - dobDate.getFullYear();
        const monthDiff = today.getMonth() - dobDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
            age--;
        }
        return age >= 0 ? age : undefined;
    }
    catch {
        return undefined;
    }
}
export function normalizeDDINS(data) {
    const eligibility = data.eligibility ?? {};
    const pkg = eligibility.pkg ?? {};
    const maxDed = eligibility.maxDed ?? eligibility.maxded ?? {};
    const wait = eligibility.wait ?? {};
    const hist = eligibility.hist ?? {};
    const mails = eligibility.mails ?? {};
    const addl = eligibility.addl ?? {};
    const personsData = eligibility.persons ?? {};
    const claims = data.claims ?? [];
    const memberInfo = pkg.member ?? maxDed.memberInfo ?? {};
    const personId = memberInfo.personId ?? memberInfo.personid;
    const memberName = memberInfo.memberName ?? data.summary?.patientName;
    const dob = memberInfo.birthDate ?? data.patient?.dateOfBirth;
    const memberId = data.summary?.memberId ??
        data.patient?.subscriberId ??
        memberInfo.enrolleeId ??
        memberInfo.memberId;
    const groupName = memberInfo.groupName ?? addl.groupName;
    const groupNumber = memberInfo.groupNumber ?? addl.groupNumber;
    const divisionNumber = memberInfo.divisionNumber ?? addl.divisionNumber;
    const coverageStart = memberInfo.effectiveDate ?? addl.effectiveDate;
    const productName = memberInfo.product ? `Delta Dental ${memberInfo.product}` : undefined;
    const missingTooth = memberInfo.missingToothIndicator ?? pkg.missingToothIndicator ?? null;
    const maximumRows = ensureArray(maxDed.maximumsInfo ?? maxDed.maximumsinfo);
    const coverageEnd = memberInfo.endDate ??
        addl.endDate ??
        maximumRows[0]?.maximumDetails?.accumPeriodEndDate ??
        maximumRows[0]?.maximumdetails?.accumperiodenddate;
    const calendarMaximum = maximumRows.find(row => {
        const classifier = row?.maximumDetails?.calendarOrContractClassification ?? row?.maximumdetails?.calendarorcontractclassification;
        return typeof classifier === 'string' && classifier.toUpperCase() === 'CALENDAR';
    }) ?? maximumRows[0];
    const amountInfo = calendarMaximum?.amountInfo ?? calendarMaximum?.amountinfo ?? {};
    const maximums = {
        annualTotal: parseNumber(amountInfo.totalAmount ?? amountInfo.totalamount),
        annualUsed: parseNumber(amountInfo.totalUsedAmount ?? amountInfo.totalusedamount),
        annualRemaining: parseNumber(amountInfo.remainingAmount ?? amountInfo.remainingamount),
        yearType: (calendarMaximum?.maximumDetails?.calendarOrContractClassification ?? calendarMaximum?.maximumdetails?.calendarorcontractclassification ?? null)
    };
    const deductibleRows = ensureArray(maxDed.deductiblesInfo ?? maxDed.deductiblesinfo);
    const findDeductible = (keyword) => deductibleRows.find(row => {
        const type = row?.deductibleDetails?.type ?? row?.deductibledetails?.type;
        return typeof type === 'string' && type.toLowerCase().includes(keyword);
    });
    const individualRow = findDeductible('individual');
    const familyRow = findDeductible('family');
    const individualInfo = individualRow?.amountInfo ?? individualRow?.amountinfo ?? {};
    const familyInfo = familyRow?.amountInfo ?? familyRow?.amountinfo ?? {};
    const individualApplies = ensureArray(individualRow?.servicesAllowed ?? individualRow?.servicesallowed).map((entry) => entry?.treatmentTypeDescription ?? entry?.treatmenttypedescription);
    const deductibles = {
        individual: {
            amount: parseNumber(individualInfo.totalAmount ?? individualInfo.totalamount),
            remaining: parseNumber(individualInfo.remainingAmount ?? individualInfo.remainingamount),
            appliesTo: uniqueStrings(individualApplies)
        },
        family: {
            amount: parseNumber(familyInfo.totalAmount ?? familyInfo.totalamount),
            remaining: parseNumber(familyInfo.remainingAmount ?? familyInfo.remainingamount)
        }
    };
    const treatments = ensureArray(pkg.treatment).map((item) => ({
        treatmentCode: item?.treatmentCode ?? item?.treatmentcode,
        summaryValues: ensureArray(item?.summaryValues ?? item?.summaryvalues)
    }));
    const coveragePct = mapCoverageByCategory(treatments);
    const waitingPeriods = ensureArray(wait.waitingPeriods ?? wait.waitingperiods).map((entry) => ({
        treatmentCodes: ensureArray(entry?.treatments).map((t) => t?.treatmentCode ?? t?.treatmentcode).filter(Boolean),
        months: parseNumber(entry?.waitingPeriodInMonths ?? entry?.waitingperiodinmonths),
        effective: toISODate(entry?.effectiveDate ?? entry?.effectivedate),
        end: toISODate(entry?.endDate ?? entry?.enddate)
    }));
    const addressEntry = ensureArray(mails.addresses).find((addr) => addr?.address || addr?.city || addr?.state);
    const claimsMailingAddress = addressEntry
        ? [addressEntry.company ?? 'Delta Dental', addressEntry.address, combineCityStateZip(addressEntry)].filter(Boolean).join('\n')
        : undefined;
    const historyByCode = {};
    for (const procedure of ensureArray(hist.procedures)) {
        const code = procedure?.code;
        if (!code)
            continue;
        historyByCode[String(code)] = {
            firstDate: toISODate(procedure?.firstServiceDate ?? procedure?.firstservicedate),
            lastDate: toISODate(procedure?.lastServiceDate ?? procedure?.lastservicedate),
            count: parseNumber(procedure?.numberOfServicesRendered ?? procedure?.numberofservicesrendered),
            description: procedure?.description ?? procedure?.procedureDescription
        };
    }
    const additionalBenefitsArray = ensureArray(addl.additionalBenefits ?? addl.additionalbenefits);
    const additionalBenefits = {};
    const extraBenefits = additionalBenefitsArray.map((benefit) => {
        const header = benefit?.header ?? '';
        const text = benefit?.text ?? '';
        if (typeof header === 'string' && header.trim()) {
            additionalBenefits[header.trim().toLowerCase()] = typeof text === 'string' ? text.trim() : '';
        }
        return `${header} ${text}`.trim().toLowerCase();
    }).filter(Boolean);
    const personsList = ensureArray(personsData.persons ?? personsData.Persons);
    const matchingPerson = personsList.find((person) => {
        const pId = person?.personId ?? person?.personid;
        return pId && personId && String(pId) === String(personId);
    }) ?? personsList.find((person) => {
        const enrolleeIds = ensureArray(person?.enrollees?.ids);
        return enrolleeIds.some((id) => id && memberId && String(id) === String(memberId));
    });
    const rawSSN = matchingPerson?.socialSecurityNumber ?? matchingPerson?.socialsecuritynumber ?? matchingPerson?.ssn;
    const cleanedSSN = typeof rawSSN === 'string' && rawSSN.trim() ? rawSSN.trim() : undefined;
    const providerInfo = extractProviderInfo(claims);
    const patientAge = dob ? calculateAge(dob) : undefined;
    const procedureLimitations = extractProcedureLimitations(pkg.treatment, patientAge);
    return {
        member: {
            name: memberName ?? undefined,
            dob: toISODate(dob),
            memberId: memberId ?? undefined,
            groupName: groupName ?? undefined,
            groupNumber: groupNumber ?? undefined,
            divisionNumber: divisionNumber ?? undefined,
            productName,
            coverageStart: toISODate(coverageStart),
            coverageEnd: toISODate(coverageEnd),
            missingTooth: typeof missingTooth === 'boolean' ? missingTooth : missingTooth === null ? null : Boolean(missingTooth),
            ssn: cleanedSSN
        },
        maximums,
        deductibles,
        coveragePct,
        waitingPeriods,
        claimsMailingAddress,
        historyByCode,
        extraNotes: extraBenefits,
        additionalBenefits,
        provider: providerInfo,
        procedureLimitations
    };
}
function combineCityStateZip(address) {
    const city = address?.city;
    const state = address?.state;
    const zip = address?.zipCode ?? address?.zipcode;
    const pieces = [city, state].filter(Boolean).join(', ');
    if (!pieces && !zip)
        return undefined;
    return [pieces, zip].filter(Boolean).join(' ');
}
function extractProviderInfo(claims) {
    const recentClaim = claims?.[0];
    if (!recentClaim?.renderingProvider)
        return {};
    const provider = recentClaim.renderingProvider;
    const firstName = provider.firstName ?? provider.firstname ?? '';
    const middleName = provider.middleName ?? provider.middlename ?? '';
    const lastName = provider.lastName ?? provider.lastname ?? '';
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
    let address;
    let phoneFromContact;
    const contacts = provider.contacts;
    let contact = null;
    if (Array.isArray(contacts) && contacts.length > 0) {
        contact = contacts[0];
    }
    else if (contacts && typeof contacts === 'object') {
        contact = contacts;
    }
    if (contact) {
        phoneFromContact = contact.phoneNumber ?? contact.phonenumber;
        if (contact.address) {
            const addr = contact.address;
            const parts = [
                addr.line1,
                [addr.city, addr.state].filter(Boolean).join(', '),
                addr.zipCode ?? addr.zipcode
            ].filter(Boolean);
            address = parts.join(', ');
        }
    }
    let phoneNumber = phoneFromContact || provider.phoneNumber || provider.phonenumber;
    if (phoneNumber && /^\d{10}$/.test(phoneNumber)) {
        phoneNumber = `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
    }
    return {
        name: fullName || undefined,
        firstName: firstName || undefined,
        middleName: middleName || undefined,
        lastName: lastName || undefined,
        practiceName: provider.practiceLocationName ?? provider.practicelocationname,
        phoneNumber,
        npi: provider.npi,
        taxId: provider.taxId ?? provider.taxid,
        address
    };
}
function extractProcedureLimitations(treatments, patientAge) {
    const limitations = {};
    ensureArray(treatments).forEach((treatment) => {
        const treatmentCode = treatment.treatmentCode ?? treatment.treatmentcode;
        if (!treatmentCode)
            return;
        const procedureClasses = ensureArray(treatment.procedureClass ?? treatment.procedureclass);
        procedureClasses.forEach((procClass) => {
            const procedures = ensureArray(procClass.procedure);
            procedures.forEach((proc) => {
                const procCode = proc.code ?? proc.procedureCode ?? proc.procedurecode;
                if (!procCode)
                    return;
                const procLimitations = ensureArray(proc.limitation);
                if (procLimitations.length > 0) {
                    let limitation = procLimitations[0];
                    if (patientAge != null && procLimitations.length > 1) {
                        const ageLimitation = procLimitations.find((lim) => {
                            const ageCode = lim.sexAgeToothCode?.[0];
                            if (!ageCode)
                                return false;
                            const minAge = ageCode.minAge ?? 0;
                            const maxAge = ageCode.maxAge ?? 999;
                            if (minAge === 0 && maxAge === 0)
                                return true;
                            return patientAge >= minAge && patientAge < maxAge;
                        });
                        if (ageLimitation) {
                            limitation = ageLimitation;
                        }
                    }
                    const frequencyText = limitation.frequencyLimitationText ?? limitation.frequencylimitationtext;
                    let frequency = '';
                    let interval = '';
                    if (frequencyText) {
                        const match = frequencyText.match(/(\d+)\s*(?:per|every|within)\s*(.+?)(?:\.|,|$)/i);
                        if (match) {
                            frequency = `${match[1]} per ${match[2].trim()}`;
                        }
                        else if (frequencyText.toLowerCase().includes('once')) {
                            frequency = '1 per lifetime';
                        }
                        else {
                            frequency = frequencyText;
                        }
                        const intervalMatch = frequencyText.match(/(\d+)\s*(?:month|year|day)\s*interval/i);
                        if (intervalMatch) {
                            interval = intervalMatch[0];
                        }
                    }
                    limitations[procCode] = {
                        frequency: frequency || undefined,
                        limitations: interval || frequencyText || undefined,
                        benefitQuantity: limitation.benefitQuantity ?? limitation.benefitquantity,
                        periodType: limitation.periodTypeCode ?? limitation.periodtypecode
                    };
                }
            });
        });
    });
    return limitations;
}
//# sourceMappingURL=ddins.js.map