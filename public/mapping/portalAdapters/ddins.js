import { ensureArray, parseNumber, toISODate, uniqueStrings } from '../shared/utils.js';
import { mapCoverageByCategory } from '../shared/coverage.js';
function calculateAge(dateOfBirth) {
    if (!dateOfBirth)
        return undefined;
    try {
        let dobDate;
        // Handle MM/DD/YYYY format
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateOfBirth)) {
            const [month, day, year] = dateOfBirth.split('/');
            dobDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        // Handle YYYY-MM-DD format
        else if (/^\d{4}-\d{2}-\d{2}/.test(dateOfBirth)) {
            dobDate = new Date(dateOfBirth);
        }
        else {
            return undefined;
        }
        const today = new Date();
        let age = today.getFullYear() - dobDate.getFullYear();
        const monthDiff = today.getMonth() - dobDate.getMonth();
        // Adjust if birthday hasn't occurred yet this year
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
    // Prioritize roster data (most complete), then memberInfo, then additional benefits
    const groupName = data.roster?.groupName ?? memberInfo.groupName ?? addl.groupName;
    const groupNumber = data.roster?.groupNumber ?? memberInfo.groupNumber ?? addl.groupNumber;
    const divisionNumber = data.roster?.divisionNumber ?? memberInfo.divisionNumber ?? addl.divisionNumber;
    const coverageStart = memberInfo.effectiveDate ?? addl.effectiveDate;
    const productName = memberInfo.product ? `Delta Dental ${memberInfo.product}` : undefined;
    const missingTooth = memberInfo.missingToothIndicator ?? pkg.missingToothIndicator ?? null;
    const maximumRows = ensureArray(maxDed.maximumsInfo ?? maxDed.maximumsinfo);
    // Coverage end date: try member.endDate first, then accumPeriodEndDate from maximums/deductibles
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
    // Extract city, state, zip separately for ACE form
    const claimsCity = addressEntry?.city ?? undefined;
    const claimsState = addressEntry?.state ?? undefined;
    const claimsZipCode = addressEntry?.zipCode ?? addressEntry?.zipcode ?? undefined;
    // Extract claim payer ID (e.g., 94276 for Delta Dental)
    const claimPayerId = addressEntry?.claimPayerId ?? addressEntry?.claimpayerid ?? undefined;
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
    // Extract provider information from claims
    const providerInfo = extractProviderInfo(claims);
    // Extract relationship from claims (Child, Self, Spouse, etc.)
    const relationship = claims?.[0]?.patient?.relationship ?? undefined;
    // Extract contractId (Insurance Number, different from Member ID)
    const insuranceNumber = ensureArray(mails.addresses).find(addr => addr?.contractId)?.contractId ?? undefined;
    // Extract procedure limitations from treatment data
    // Calculate patient age for age-based limitation filtering
    const patientAge = dob ? calculateAge(dob) : undefined;
    const procedureLimitations = extractProcedureLimitations(pkg.treatment, patientAge);
    // Extract orthodontics information
    const orthodontics = extractOrthodonticsInfo(maximumRows, pkg.treatment, claims);
    return {
        member: {
            name: memberName ?? undefined,
            dob: toISODate(dob),
            memberId: memberId ?? undefined,
            relationship,
            insuranceNumber,
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
        claimsCity,
        claimsState,
        claimsZipCode,
        claimPayerId,
        historyByCode,
        extraNotes: extraBenefits,
        additionalBenefits,
        provider: providerInfo,
        procedureLimitations,
        orthodontics
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
    // Get the most recent claim's provider information
    const recentClaim = claims?.[0];
    if (!recentClaim?.renderingProvider)
        return {};
    const provider = recentClaim.renderingProvider;
    const firstName = provider.firstName ?? provider.firstname ?? '';
    const middleName = provider.middleName ?? provider.middlename ?? '';
    const lastName = provider.lastName ?? provider.lastname ?? '';
    // Build full name
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
    // Extract address if available
    let address;
    let phoneFromContact;
    // Handle both array and object format for contacts
    const contacts = provider.contacts;
    let contact = null;
    if (Array.isArray(contacts) && contacts.length > 0) {
        contact = contacts[0];
    }
    else if (contacts && typeof contacts === 'object') {
        contact = contacts;
    }
    if (contact) {
        // Get phone from contacts table
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
    // Use phone from contacts first, then from provider
    let phoneNumber = phoneFromContact || provider.phoneNumber || provider.phonenumber;
    // Format phone number if it's a raw number
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
    // All procedure codes from Ace Dental PDF that we want to track
    const aceDentalCodes = [
        // Exams
        'D0150', 'D0120', 'D0140', 'D0145', 'D0180',
        // X-rays
        'D0210', 'D0220', 'D0230', 'D0272', 'D0274', 'D0277', 'D0330', 'D0365', 'D0367',
        // Preventive
        'D1110', 'D1120', 'D1206', 'D1208', 'D1351', 'D1352', 'D1353',
        // Fillings
        'D2140', 'D2161', 'D2330', 'D2331', 'D2335', 'D2391', 'D2392', 'D2393', 'D2394',
        // Endo
        'D3220', 'D3221', 'D3310', 'D3320', 'D3330', 'D3346', 'D3347', 'D3348', 'D3351', 'D3352', 'D3353', 'D3410', 'D3421', 'D3425',
        // Perio
        'D4910', 'D4341', 'D4381',
        // Extractions
        'D7140', 'D7210', 'D7240', 'D7953',
        // Major
        'D2740', 'D2950', 'D2954', 'D5110', 'D5120', 'D5213', 'D5221', 'D6010',
        // Other
        'D9232', 'D9944', 'D9945'
    ];
    // Build a map of all procedures found in DDINS
    const procedureMap = new Map();
    ensureArray(treatments).forEach((treatment) => {
        const treatmentCode = treatment.treatmentCode ?? treatment.treatmentcode;
        if (!treatmentCode)
            return;
        // Get coverage % for this treatment category
        const summaryValues = ensureArray(treatment.summaryValues ?? treatment.summaryvalues);
        const coveragePct = summaryValues[0]?.maximumCoverage ?? summaryValues[0]?.maximumcoverage;
        // Look for procedure classes
        const procedureClasses = ensureArray(treatment.procedureClass ?? treatment.procedureclass);
        procedureClasses.forEach((procClass) => {
            const procedures = ensureArray(procClass.procedure);
            procedures.forEach((proc) => {
                const procCode = proc.code ?? proc.procedureCode ?? proc.procedurecode;
                if (!procCode)
                    return;
                // Store procedure info
                procedureMap.set(procCode, {
                    procedure: proc,
                    coveragePct,
                    treatmentCode
                });
            });
        });
    });
    // Now extract info for each Ace Dental code
    aceDentalCodes.forEach(code => {
        const procInfo = procedureMap.get(code);
        if (!procInfo) {
            // Procedure not found in DDINS - mark as not covered
            return; // Skip, leave empty
        }
        const proc = procInfo.procedure;
        const procLimitations = ensureArray(proc.limitation);
        // Start building the limitation object
        const limitationObj = {
            coverage: procInfo.coveragePct != null ? `${procInfo.coveragePct}%` : undefined
        };
        if (procLimitations.length > 0) {
            // Filter by patient age if available
            let limitation = procLimitations[0]; // Default fallback
            if (patientAge != null && procLimitations.length > 1) {
                // Try to find limitation matching patient age
                const ageLimitation = procLimitations.find((lim) => {
                    const ageCode = lim.sexAgeToothCode?.[0];
                    if (!ageCode)
                        return false;
                    const minAge = ageCode.minAge ?? 0;
                    const maxAge = ageCode.maxAge ?? 999;
                    // maxAge=0 means "no limit", minAge=0 and maxAge=0 means "all ages"
                    if (minAge === 0 && maxAge === 0)
                        return true;
                    return patientAge >= minAge && patientAge < maxAge;
                });
                if (ageLimitation) {
                    limitation = ageLimitation;
                }
            }
            // Extract age limit (for procedures like Fluoride, Sealants, Ortho)
            const ageCode = limitation.sexAgeToothCode?.[0];
            if (ageCode?.maxAge && ageCode.maxAge > 0 && ageCode.maxAge < 999) {
                limitationObj.ageLimit = ageCode.maxAge;
            }
            const frequencyText = limitation.frequencyLimitationText ?? limitation.frequencylimitationtext;
            // Extract frequency pattern (e.g., "2 per year", "1 per 3 years")
            let frequency = '';
            let interval = '';
            if (frequencyText) {
                // Match patterns like "limited to X per Y"
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
                // Extract interval if mentioned
                const intervalMatch = frequencyText.match(/(\d+)\s*(?:month|year|day)\s*interval/i);
                if (intervalMatch) {
                    interval = intervalMatch[0];
                }
            }
            limitationObj.frequency = frequency || undefined;
            limitationObj.limitations = interval || frequencyText || undefined;
            limitationObj.benefitQuantity = limitation.benefitQuantity ?? limitation.benefitquantity;
            limitationObj.periodType = limitation.periodTypeCode ?? limitation.periodtypecode;
        }
        // Only add if we have some data
        if (limitationObj.coverage || limitationObj.frequency || limitationObj.limitations) {
            limitations[code] = limitationObj;
        }
    });
    return limitations;
}
function extractOrthodonticsInfo(maximumRows, treatments, claims) {
    // Check if orthodontics coverage exists in maximums
    const orthoMaximum = maximumRows.find(row => {
        const servicesAllowed = ensureArray(row?.servicesAllowed ?? row?.servicesallowed);
        return servicesAllowed.some((service) => {
            const desc = service?.treatmentTypeDescription ?? service?.treatmenttypedescription;
            return typeof desc === 'string' && desc.toLowerCase().includes('ortho');
        });
    });
    if (!orthoMaximum) {
        return { hasCoverage: false };
    }
    // Extract lifetime maximum
    const amountInfo = orthoMaximum?.amountInfo ?? orthoMaximum?.amountinfo ?? {};
    const lifetimeMax = parseNumber(amountInfo.totalAmount ?? amountInfo.totalamount);
    // Extract coverage % from treatment "OR" code
    let coveragePct;
    const treatmentList = ensureArray(treatments);
    const orthoTreatment = treatmentList.find((t) => {
        const code = t?.treatmentCode ?? t?.treatmentcode;
        return typeof code === 'string' && code.toUpperCase() === 'OR';
    });
    if (orthoTreatment?.summaryValues?.[0]?.maximumCoverage) {
        coveragePct = parseNumber(orthoTreatment.summaryValues[0].maximumCoverage);
    }
    // Try to get coverage % from claims if not found in treatment
    if (coveragePct == null && claims?.length > 0) {
        for (const claim of claims) {
            const serviceLines = ensureArray(claim.serviceLines ?? claim.servicelines);
            for (const line of serviceLines) {
                const procedureCode = line?.procedureCode ?? line?.procedurecode ?? '';
                // Orthodontic codes typically start with D8
                if (typeof procedureCode === 'string' && procedureCode.startsWith('D8')) {
                    const benefitLevel = line?.amount?.contractBenefitLevel ?? line?.amount?.contractbenefitlevel;
                    if (benefitLevel) {
                        const match = String(benefitLevel).match(/(\d+)%?/);
                        if (match) {
                            coveragePct = parseInt(match[1]);
                            break;
                        }
                    }
                }
            }
            if (coveragePct != null)
                break;
        }
    }
    // Extract age limit from procedure classes
    let ageLimit;
    if (orthoTreatment) {
        const procedureClasses = ensureArray(orthoTreatment.procedureClass ?? orthoTreatment.procedureclass);
        for (const procClass of procedureClasses) {
            const procedures = ensureArray(procClass.procedure);
            for (const proc of procedures) {
                const limitations = ensureArray(proc.limitation);
                for (const lim of limitations) {
                    const sexAgeToothCodes = ensureArray(lim.sexAgeToothCode ?? lim.sexAgetoothCode ?? lim.sexagetoothcode);
                    for (const code of sexAgeToothCodes) {
                        const maxAge = code?.maxAge ?? code?.maxage;
                        if (maxAge != null && maxAge > 0 && maxAge < 999) {
                            ageLimit = parseNumber(maxAge);
                            break;
                        }
                    }
                    if (ageLimit != null)
                        break;
                }
                if (ageLimit != null)
                    break;
            }
            if (ageLimit != null)
                break;
        }
    }
    return {
        hasCoverage: true,
        coveragePct,
        lifetimeMax,
        ageLimit
    };
}
//# sourceMappingURL=ddins.js.map