// EXTRACTION COMPLÈTE ASSURANCE PATIENT (Group #, Payer ID, Benefits, etc.)
// Endpoint: PatInsurance/Index (c1.denticon.com)
// Extrait les variables JavaScript déjà en JSON dans le HTML

async function extractPatientInsuranceFullDetails(patid, rpid) {
    console.log(`🔍 Extraction détails assurance complets - Patient ${patid}\n`);

    const url = `https://c1.denticon.com/PatInsurance/Index?pgid=3169&patid=${patid}&oid=102&rpid=${rpid}&planType=D&insType=P`;

    try {
        const response = await fetch(url);
        const html = await response.text();

        // Parser le HTML pour DOM
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // MÉTHODE 1: Extraire les variables JavaScript (déjà en JSON)
        const planIdMatch = html.match(/var initialInsPlanId = '(\d+)'/);
        const respPlanIdMatch = html.match(/var initialRespPlanId = '(\d+)'/);
        const memberListMatch = html.match(/var memberSubscriberList = (\[.*?\]);/s);
        const sessionMatch = html.match(/var SessionValues = \{([^}]+)\}/);

        // MÉTHODE 2: Parser le HTML pour les données visuelles
        const data = {
            // IDs principaux
            plan_id: planIdMatch ? planIdMatch[1] : doc.getElementById('showPlanID')?.textContent.trim(),
            resp_plan_id: respPlanIdMatch ? respPlanIdMatch[1] : null,

            // Group # et Carrier (DONNÉES CRITIQUES)
            group_number: doc.getElementById('showCarrierGroup')?.textContent.trim(),

            carrier: {
                name: doc.getElementById('carrierName')?.textContent.trim(),
                id: doc.getElementById('carrierID')?.textContent.trim(),
                payer_id: doc.getElementById('payerID')?.textContent.trim(), // ESSENTIEL pour eclaims
                type: doc.getElementById('cType')?.textContent.trim(),
                phone: doc.getElementById('carrierPhone')?.textContent.trim(),
                address: {
                    line1: doc.getElementById('carrierAddr1')?.textContent.trim(),
                    line2: doc.getElementById('carrierAddr2')?.textContent.trim(),
                    line3: doc.getElementById('carrierAddr3')?.textContent.trim()
                }
            },

            // Employer
            employer: {
                name: doc.getElementById('empName')?.textContent.trim(),
                address: {
                    line1: doc.getElementById('empAddr1')?.textContent.trim(),
                    line2: doc.getElementById('empAddr2')?.textContent.trim(),
                    line3: doc.getElementById('empAddr3')?.textContent.trim()
                }
            },

            // Benefits (DONNÉES FINANCIÈRES IMPORTANTES)
            benefits: {
                deductible: {
                    individual: doc.getElementById('txtIndDed')?.textContent.trim(),
                    individual_remaining: doc.getElementById('txtIndDedRem')?.value,
                    family: doc.getElementById('txtFamDed')?.textContent.trim(),
                    family_remaining: doc.getElementById('txtFamDedRem')?.value
                },
                annual_max: {
                    individual: doc.getElementById('txtIndMax')?.textContent.trim(),
                    individual_remaining: doc.getElementById('txtIndMaxRem')?.value,
                    family: doc.getElementById('txtFamMax')?.textContent.trim(),
                    family_remaining: doc.getElementById('txtFamMaxRem')?.value
                },
                ortho_max: {
                    individual: doc.getElementById('txtIndOrthoMax')?.textContent.trim(),
                    individual_remaining: doc.getElementById('txtIndOrthoMaxRem')?.value
                }
            },

            // Dates
            dates: {
                plan_effective: doc.getElementById('planEffectiveDate')?.textContent.trim(),
                plan_term: doc.getElementById('planTermDate')?.textContent.trim(),
                sub_effective: doc.getElementById('subEffectiveDate')?.value,
                sub_term: doc.getElementById('subTermDate')?.value,
                anniversary: doc.getElementById('annivDate')?.textContent.trim()
            },

            // Eligibility
            eligibility: {
                status: doc.getElementById('currEligibilityStat')?.textContent.trim(),
                verified_on: doc.getElementById('currEligibilityDateDiv')?.textContent.trim(),
                verified_by: doc.getElementById('currEligibilityUser')?.textContent.trim()
            },

            // Subscriber Info
            subscriber: {
                last_name: doc.getElementById('subLastName')?.value,
                first_name: doc.getElementById('subFirstName')?.value,
                subscriber_id: doc.getElementById('subIdValue')?.value,
                birth_date: doc.getElementById('subBirthDate')?.value,
                sex: doc.getElementById('subscriberSexInfoDropdown')?.value,
                address: doc.getElementById('subAddr')?.value,
                address2: doc.getElementById('subAddr2')?.value,
                city: doc.getElementById('subCity')?.value,
                state: doc.getElementById('STATE')?.value,
                zip: doc.getElementById('ZIP')?.value,
                phone: doc.getElementById('Number')?.value,
                marital_status: doc.getElementById('subscriberMaritalStatusInfoDropdown')?.value,
                relation_to_subscriber: doc.getElementById('subscriberRelationInfoDropdown')?.value
            },

            // Notes
            notes: doc.getElementById('insuranceNoteTextArea')?.value,

            // Member Subscriber List (JSON)
            member_subscriber_list: memberListMatch ? JSON.parse(memberListMatch[1]) : null,

            // Métadonnées
            metadata: {
                modified_by: doc.getElementById('patModifiedBy')?.textContent.trim(),
                modified_on: doc.getElementById('patModifiedOn')?.textContent.trim(),
                created_by: doc.getElementById('patCreatedBy')?.textContent.trim(),
                created_on: doc.getElementById('patCreatedOn')?.textContent.trim()
            }
        };

        console.log('✅ Données extraites:\n');
        console.log(`📋 Plan ID: ${data.plan_id}`);
        console.log(`📋 Group #: ${data.group_number} ⭐`);
        console.log(`📋 Payer ID: ${data.carrier.payer_id} ⭐`);
        console.log(`💰 Deductible (Ind): ${data.benefits.deductible.individual}`);
        console.log(`💰 Annual Max (Ind): ${data.benefits.annual_max.individual}`);
        console.log(`💰 Ortho Max: ${data.benefits.ortho_max.individual}`);
        console.log(`👤 Subscriber: ${data.subscriber.first_name} ${data.subscriber.last_name}`);
        console.log(`📅 Anniversary Date: ${data.dates.anniversary}`);

        console.log('\n📊 JSON COMPLET:\n');
        console.log(JSON.stringify(data, null, 2));

        return data;

    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

// ========== EXTRACTION POUR PLUSIEURS PATIENTS ==========

async function extractMultiplePatientsInsurance(date = '10/3/2025', maxPatients = 5) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 EXTRACTION DÉTAILS ASSURANCE MULTIPLES PATIENTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Étape 1: Récupérer la liste des patients
    console.log(`📅 Date: ${date}`);
    console.log(`📊 Nombre max de patients: ${maxPatients}\n`);

    const eligUrl = `https://c1.denticon.com/EligibilityVerificationReport/GetPatientEligibilityTableData?PGID=3169&OID=102&APPTPRDR=ALL&APTDATE=${encodeURIComponent(date)}&ELIGSTATUS=ALL&_=${Date.now()}`;

    const eligResponse = await fetch(eligUrl, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });

    const eligData = await eligResponse.json();
    const patients = eligData.tableData.slice(0, maxPatients);

    console.log(`✅ ${patients.length} patients trouvés\n`);

    // Étape 2: Extraire les détails pour chaque patient
    const allData = [];

    for (let i = 0; i < patients.length; i++) {
        const p = patients[i];
        console.log(`\n[${i+1}/${patients.length}] 👤 ${p.PatName}`);
        console.log('─────────────────────────────────────');

        const details = await extractPatientInsuranceFullDetails(p.PATID, p.RPID);

        if (details) {
            allData.push({
                patient_id: p.PATID,
                patient_name: p.PatName,
                ...details
            });
        }

        // Pause entre requêtes
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Résumé final
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ EXTRACTION TERMINÉE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`📊 Total patients: ${allData.length}`);
    console.log('\n📋 Résumé des Group # trouvés:');

    const groupSummary = {};
    allData.forEach(d => {
        const group = d.group_number || 'N/A';
        groupSummary[group] = (groupSummary[group] || 0) + 1;
    });

    Object.entries(groupSummary).forEach(([group, count]) => {
        console.log(`   - ${group}: ${count} patients`);
    });

    console.log('\n💾 Données sauvegardées dans: window.insuranceDetailsData');
    console.log('📋 Pour copier: copy(JSON.stringify(window.insuranceDetailsData, null, 2))\n');

    window.insuranceDetailsData = allData;

    return allData;
}

// ========== EXEMPLES D'UTILISATION ==========

// Exemple 1: Un seul patient
// extractPatientInsuranceFullDetails(9074115, 9073270);

// Exemple 2: Plusieurs patients d'une date donnée
// extractMultiplePatientsInsurance('10/3/2025', 5);

console.log('✅ Script chargé !');
console.log('\n📋 UTILISATION:');
console.log('   1 patient  : extractPatientInsuranceFullDetails(patid, rpid)');
console.log('   Plusieurs  : extractMultiplePatientsInsurance("10/3/2025", 5)');
