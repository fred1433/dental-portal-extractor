// GUARDIAN - EXTRACTION COMPLÈTE DE TOUTES LES DONNÉES
// Version finale avec TOUTES les données disponibles
//
// NOTE IMPORTANTE SUR LES EOB (Explanation of Benefits):
// ========================================================
// Nous avons tenté d'extraire et exploiter les PDFs EOB mais avons rencontré plusieurs défis:
//
// 1) L'API retourne les PDFs encodés en base64 dans un JSON: { "pdf_content": "JVBERi0xLj..." }
// 2) Le décodage base64 → blob fonctionne (on obtient des PDFs valides de ~280-300KB)
// 3) PROBLÈME: Les blob URLs ne s'ouvrent pas dans le navigateur (erreur "Failed to load PDF")
//    - Possibles causes: CSP, viewer PDF natif, format du blob
//
// 4) VALEUR LIMITÉE: Les EOB ne fournissent que les dates de service et détails de paiement
//    - Ces infos sont DÉJÀ dans les claims (dateOfService, chargedAmount, paidAmount)
//    - Les EOB n'apportent PAS les données critiques du formulaire (deductibles, maximums, %)
//
// DÉCISION: Garder uniquement l'extraction d'éligibilité et claims sans parser les PDFs EOB
// Les données d'éligibilité couvrent 90% des besoins du formulaire de vérification.

const guardianCompleteExtractor = {
    // Extraire UN patient avec TOUTES ses données
    async extractCompletePatientData(lastName, dateOfBirth, firstName) {
        console.log(`🎯 EXTRACTION COMPLÈTE: ${firstName} ${lastName}`);
        console.log('='.repeat(50));

        // ÉTAPE 1: Recherche du patient
        console.log('1️⃣ Recherche du patient...');

        const searchData = [{
            date_of_birth: dateOfBirth,
            last_name: lastName,
            relationship: "S",
            first_name: "",
            zip_code: ""
        }];

        try {
            const searchResponse = await fetch('/gaprovider/api/multiple-patient/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': '*/*',
                    'ga-request-id': crypto.randomUUID()
                },
                credentials: 'include',
                body: JSON.stringify(searchData)
            });

            const searchResult = await searchResponse.json();

            if (!searchResult?.multiple_patient_search_res?.[0]?.member_dependent) {
                console.error('❌ Aucun patient trouvé');
                return null;
            }

            const allMembers = searchResult.multiple_patient_search_res[0].member_dependent;
            const targetPatient = allMembers.find(m =>
                m.first_name.toUpperCase().includes(firstName.toUpperCase())
            );

            if (!targetPatient) {
                console.error(`❌ ${firstName} ${lastName} non trouvé`);
                return null;
            }

            console.log(`✅ Patient trouvé: ${targetPatient.first_name} ${targetPatient.last_name}`);

            // ÉTAPE 2: Récupérer l'éligibilité COMPLÈTE
            console.log('\n2️⃣ Récupération de TOUTES les données...');

            const eligibilityResponse = await fetch('/gaprovider/api/dental-vob/ppo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': '*/*',
                    'ga-request-id': crypto.randomUUID()
                },
                credentials: 'include',
                body: JSON.stringify({
                    group_policy_number: targetPatient.group_policy_number,
                    patient_relation_to_member: targetPatient.relationship,
                    patient_identifier: targetPatient.identifier,
                    patient_date_of_birth: targetPatient.date_of_birth,
                    patient_first_name: targetPatient.first_name,
                    patient_last_name: targetPatient.last_name
                })
            });

            const eligData = await eligibilityResponse.json();

            // EXTRACTION COMPLÈTE DES DONNÉES
            const completeData = {
                // 1. INFORMATIONS PATIENT
                patient: {
                    name: `${targetPatient.first_name} ${targetPatient.last_name}`,
                    dateOfBirth: targetPatient.date_of_birth,
                    sex: targetPatient.sex,
                    relationship: targetPatient.relationship,
                    address: {
                        city: targetPatient.city,
                        state: targetPatient.state,
                        zip: targetPatient.zip
                    }
                },

                // 2. PLAN & GROUPE
                insurance: {
                    groupName: targetPatient.group_name,
                    groupNumber: targetPatient.group_policy_number,
                    planName: eligData.ppo_benefit?.[0]?.benefit_information?.benefit_plan_type || 'N/A',
                    planType: eligData.product?.product_name || 'Dental',
                    benefitPeriod: {
                        start: eligData.ppo_benefit?.[0]?.benefit_information?.benefit_period_effective_date,
                        end: eligData.ppo_benefit?.[0]?.benefit_information?.benefit_period_end_date
                    }
                },

                // 3. DATES DE COVERAGE
                coverage: {
                    dentalEffectiveDate: targetPatient.dental_coverage_effective_date,
                    memberTermDate: targetPatient.member_coverage_term_date || 'N/A',
                    serviceEffectiveDates: {}
                },

                // 4. LIMITES D'ÂGE
                ageLimits: {},

                // 5. DEDUCTIBLES
                deductibles: {
                    individual: { inNetwork: {}, outNetwork: {} },
                    family: { inNetwork: {}, outNetwork: {} }
                },

                // 6. MAXIMUMS
                maximums: {
                    dental: { annual: {}, lifetime: {} },
                    orthodontic: { annual: {}, lifetime: {} }
                },

                // 7. MAX ROLLOVER
                maxRollover: {},

                // 8. SERVICES & POURCENTAGES
                services: {},

                // 9. DERNIÈRES VISITES
                lastVisits: {},

                // 10. LIMITATIONS & FRÉQUENCES
                limitations: []
            };

            // Parser les limites d'âge
            if (eligData.age_limt) {
                eligData.age_limt.forEach(limit => {
                    completeData.ageLimits[limit.benefit_category] = parseInt(limit.age);
                });
            }

            // Parser les dates effectives par service
            if (eligData.ppo_benefit?.[0]?.benefit_information?.service_category_effective_date) {
                eligData.ppo_benefit[0].benefit_information.service_category_effective_date.forEach(cat => {
                    completeData.coverage.serviceEffectiveDates[cat.dental_service_category] = cat.effective_date;
                });
            }

            // Parser les deductibles
            if (eligData.ppo_benefit?.[0]?.deductible) {
                eligData.ppo_benefit[0].deductible.forEach(d => {
                    const isIndividual = d.coverage_tier.includes('Individual');
                    const isInNetwork = d.network_name === 'In-Network';
                    const isMetToDate = d.deductible_period === 'Met-To-Date';

                    if (isIndividual) {
                        if (isInNetwork) {
                            if (isMetToDate) {
                                completeData.deductibles.individual.inNetwork.metToDate = d.amount;
                            } else {
                                completeData.deductibles.individual.inNetwork.amount = d.amount;
                            }
                        } else {
                            if (isMetToDate) {
                                completeData.deductibles.individual.outNetwork.metToDate = d.amount;
                            } else {
                                completeData.deductibles.individual.outNetwork.amount = d.amount;
                            }
                        }
                    } else { // Family
                        if (isInNetwork) {
                            if (isMetToDate) {
                                completeData.deductibles.family.inNetwork.metToDate = d.amount;
                            } else {
                                completeData.deductibles.family.inNetwork.amount = d.amount;
                            }
                        } else {
                            if (isMetToDate) {
                                completeData.deductibles.family.outNetwork.metToDate = d.amount;
                            } else {
                                completeData.deductibles.family.outNetwork.amount = d.amount;
                            }
                        }
                    }
                });
            }

            // Parser les maximums
            if (eligData.ppo_benefit?.[0]?.plan_maximum) {
                eligData.ppo_benefit[0].plan_maximum.forEach(max => {
                    const isDental = max.plan_maximum_for_benefit === 'Dental';
                    const isOrtho = max.plan_maximum_for_benefit === 'Orthodontic';
                    const isInNetwork = max.network_name === 'In-Network';

                    if (isDental) {
                        if (max.time_qualifier === 'Yearly-Plan-Limit' && isInNetwork) {
                            completeData.maximums.dental.annual.limit = max.amount;
                        } else if (max.time_qualifier === 'Year-Met-To-Date' && isInNetwork) {
                            completeData.maximums.dental.annual.used = max.amount;
                            // Calculer le restant
                            const limit = parseFloat(completeData.maximums.dental.annual.limit?.replace(/[$,]/g, '') || 0);
                            const used = parseFloat(max.amount.replace(/[$,]/g, ''));
                            completeData.maximums.dental.annual.remaining = `$${(limit - used).toFixed(2)}`;
                        }
                    } else if (isOrtho) {
                        if (max.time_qualifier === 'Lifetime-Plan-Limit' && isInNetwork) {
                            completeData.maximums.orthodontic.lifetime.limit = max.amount;
                        } else if (max.time_qualifier === 'Lifetime-Met-To-Date' && isInNetwork) {
                            completeData.maximums.orthodontic.lifetime.used = max.amount;
                        }
                    }
                });
            }

            // Parser Max Rollover
            if (eligData.max_rollover) {
                completeData.maxRollover = {
                    threshold: eligData.max_rollover.threshold,
                    maxAmount: eligData.max_rollover.maximum_rollover_amount,
                    currentAccount: eligData.max_rollover.maxrollover_amount,
                    maxAccountLimit: eligData.max_rollover.maximum_rollover_account_max
                };
            }

            // Parser les services et pourcentages
            if (eligData.ppo_benefit?.[0]?.plan_option) {
                eligData.ppo_benefit[0].plan_option.forEach(service => {
                    const serviceName = service.dental_service;

                    if (serviceName && service.coinsurance) {
                        const inNetwork = service.coinsurance.find(c => c.network_name === 'In-Network');
                        const outNetwork = service.coinsurance.find(c => c.network_name === 'Out-Network');

                        completeData.services[serviceName] = {
                            category: service.category?.[0]?.category_type || 'N/A',
                            inNetwork: inNetwork?.coinsurance_amount || 'N/A',
                            outNetwork: outNetwork?.coinsurance_amount || 'N/A'
                        };

                        // Ajouter les dernières visites si disponibles
                        if (service.last_visit_date) {
                            completeData.lastVisits[serviceName] = service.last_visit_date;
                        }

                        // Ajouter les limitations/messages
                        if (service.message && service.message.length > 0) {
                            completeData.limitations.push({
                                service: serviceName,
                                limitations: service.message
                            });
                        }
                    }
                });
            }

            // ÉTAPE 3: Récupérer les CLAIMS (réclamations)
            console.log('\n3️⃣ Récupération des claims (réclamations)...');

            const today = new Date();
            const oneYearAgo = new Date(today);
            oneYearAgo.setFullYear(today.getFullYear() - 1);

            const formatDate = (date) => {
                return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
            };

            const claimsQuery = {
                operationName: "getClaims",
                variables: {
                    isOpenSearch: "false",
                    providerInfo: {
                        provider_ids: ["141964678", "821594771", "873205937"],
                        coverage_type: ["DENTAL"]
                    },
                    dateOfService: {
                        date_of_service_from: formatDate(oneYearAgo),
                        date_of_service_to: formatDate(today)
                    },
                    patients: [{
                        member_id: targetPatient.member_id || "939554990",
                        last_name: targetPatient.last_name
                    }]
                },
                query: `query getClaims($isOpenSearch: String, $providerInfo: ProviderInfo!, $dateOfService: ServiceDates, $patients: [PatientList], $claims: [String]) {
                    getClaims(isOpenSearch: $isOpenSearch, providerInfo: $providerInfo, dateOfService: $dateOfService, claims: $claims, patients: $patients) {
                        dental_claims {
                            claim_number
                            coverage_type
                            date_of_service
                            provider_tin
                            provider_name
                            claim_status
                            claim_status_description
                            party_details {
                                patient_name
                            }
                            claim_payment {
                                paid_date
                                charged_amount
                                paid_amount
                                payment_type
                            }
                            claim_check {
                                check_number
                            }
                            claim_eob {
                                has_eob
                            }
                        }
                    }
                }`
            };

            // Tableau pour stocker les claims du patient
            completeData.claims = [];

            try {
                const claimsResponse = await fetch('https://www.guardiananytime.com/gagql/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': '*/*',
                        'ga-request-id': crypto.randomUUID()
                    },
                    credentials: 'include',
                    body: JSON.stringify(claimsQuery)
                });

                const claimsData = await claimsResponse.json();

                if (claimsData?.data?.getClaims?.dental_claims) {
                    const allClaims = claimsData.data.getClaims.dental_claims;

                    // FILTRER uniquement les claims du patient ciblé
                    const patientFullName = `${targetPatient.first_name} ${targetPatient.middle_initial ? targetPatient.middle_initial + ' ' : ''}${targetPatient.last_name}`;

                    completeData.claims = allClaims.filter(claim => {
                        const claimPatientName = claim.party_details?.patient_name?.toUpperCase();
                        return claimPatientName && (
                            claimPatientName.includes(targetPatient.first_name.toUpperCase()) ||
                            claimPatientName === patientFullName.toUpperCase()
                        );
                    }).map(claim => ({
                        claimNumber: claim.claim_number,
                        dateOfService: claim.date_of_service,
                        provider: claim.provider_name,
                        providerTin: claim.provider_tin,
                        status: claim.claim_status,
                        statusDescription: claim.claim_status_description,
                        chargedAmount: claim.claim_payment?.charged_amount || 'N/A',
                        paidAmount: claim.claim_payment?.paid_amount || 'N/A',
                        paidDate: claim.claim_payment?.paid_date || 'N/A',
                        checkNumber: claim.claim_check?.check_number || 'N/A',
                        hasEOB: claim.claim_eob?.has_eob === 'true',
                        // Paramètres pour récupérer l'EOB
                        eobParams: claim.claim_eob?.has_eob === 'true' ? {
                            claim_number: claim.claim_number.substring(0, 9), // Ex: "17896H056" from "17896H05600"
                            claim_suffix: claim.claim_number.slice(-2), // Ex: "00"
                            paid_date: claim.claim_payment?.paid_date || '',
                            provider_tin: claim.provider_tin?.replace('HC', '') || '', // Remove HC suffix if present
                            role_cd: 'P'
                        } : null
                    }));

                    console.log(`✅ ${completeData.claims.length} claims trouvés pour ${targetPatient.first_name}`);

                    // ÉTAPE 4: Tenter de récupérer les EOB pour chaque claim
                    console.log('\n4️⃣ Tentative de récupération des EOB...');

                    // NOTE: Les EOB sont récupérés mais difficiles à exploiter (voir en-tête du fichier)
                    // On garde le code pour référence mais les PDFs ne s'ouvrent pas correctement

                    for (const claim of completeData.claims) {
                        if (claim.hasEOB && claim.eobParams) {
                            try {
                                console.log(`   Récupération EOB pour claim #${claim.claimNumber}...`);

                                const eobResponse = await fetch('https://www.guardiananytime.com/gautils/v1/eobDocument', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Accept': '*/*',
                                        'ga-request-id': crypto.randomUUID()
                                    },
                                    credentials: 'include',
                                    body: JSON.stringify(claim.eobParams)
                                });

                                if (eobResponse.ok) {
                                    const contentType = eobResponse.headers.get('content-type');

                                    if (contentType && contentType.includes('application/pdf')) {
                                        // C'est un PDF binaire
                                        const blob = await eobResponse.blob();
                                        claim.eobBlob = blob;
                                        claim.eobUrl = URL.createObjectURL(blob);
                                        console.log(`   ✅ EOB PDF récupéré (${blob.size} bytes) - URL: ${claim.eobUrl}`);

                                        // Option : ouvrir automatiquement le premier EOB dans un nouvel onglet
                                        // window.open(claim.eobUrl, '_blank');
                                    } else {
                                        // Peut-être du texte ou JSON ?
                                        const eobContent = await eobResponse.text();
                                        claim.eobContent = eobContent;
                                        console.log(`   ✅ EOB récupéré (${eobContent.length} caractères)`);
                                    }
                                } else {
                                    console.log(`   ⚠️ Impossible de récupérer l'EOB: ${eobResponse.status}`);
                                }
                            } catch (eobError) {
                                console.log(`   ❌ Erreur EOB: ${eobError.message}`);
                            }
                        }
                    }
                }
            } catch (error) {
                console.log('⚠️ Impossible de récupérer les claims:', error.message);
            }

            // AFFICHAGE DU RÉSUMÉ
            console.log('\n✅ DONNÉES COMPLÈTES EXTRAITES:');
            console.log(`📋 Plan: ${completeData.insurance.planName}`);
            console.log(`📅 Période: ${completeData.insurance.benefitPeriod.start} - ${completeData.insurance.benefitPeriod.end}`);
            console.log(`👤 Age limits: Dependent ${completeData.ageLimits.dependent}, Student ${completeData.ageLimits.student}, Ortho ${completeData.ageLimits.ortho}`);

            console.log('\n💰 DEDUCTIBLES:');
            console.log(`Individual In-Network: ${completeData.deductibles.individual.inNetwork.amount} (Met: ${completeData.deductibles.individual.inNetwork.metToDate})`);
            console.log(`Family In-Network: ${completeData.deductibles.family.inNetwork.amount} (Met: ${completeData.deductibles.family.inNetwork.metToDate})`);

            console.log('\n📊 MAXIMUMS:');
            console.log(`Dental Annual: ${completeData.maximums.dental.annual.limit} (Used: ${completeData.maximums.dental.annual.used}, Remaining: ${completeData.maximums.dental.annual.remaining})`);
            console.log(`Ortho Lifetime: ${completeData.maximums.orthodontic.lifetime.limit} (Used: ${completeData.maximums.orthodontic.lifetime.used})`);

            console.log('\n🦷 SERVICES (échantillon):');
            ['Cleanings/Prophylaxis', 'Fillings', 'Crown/Inlay/Onlay'].forEach(s => {
                if (completeData.services[s]) {
                    console.log(`${s}: ${completeData.services[s].inNetwork} In-Network (${completeData.services[s].category})`);
                }
            });

            if (Object.keys(completeData.lastVisits).length > 0) {
                console.log('\n📅 DERNIÈRES VISITES:');
                Object.entries(completeData.lastVisits).slice(0, 3).forEach(([service, date]) => {
                    console.log(`${service}: ${date}`);
                });
            }

            // Afficher les CLAIMS s'il y en a
            if (completeData.claims && completeData.claims.length > 0) {
                console.log('\n💵 HISTORIQUE DES RÉCLAMATIONS:');
                completeData.claims.forEach(claim => {
                    console.log(`Claim #${claim.claimNumber} (${claim.dateOfService}): $${claim.chargedAmount} facturé → $${claim.paidAmount} payé`);
                    let eobStatus = '';
                    if (claim.eobUrl) {
                        eobStatus = ` | EOB PDF récupéré: ${claim.eobUrl}`;
                    } else if (claim.eobContent) {
                        eobStatus = ` | EOB HTML récupéré (${claim.eobContent.length} caractères)`;
                    } else if (claim.hasEOB) {
                        eobStatus = ' | EOB disponible (non récupéré)';
                    }
                    console.log(`  Provider: ${claim.provider} | Statut: ${claim.status}${eobStatus}`);
                });

                // Afficher les EOB récupérés
                const eobWithPdf = completeData.claims.filter(c => c.eobUrl);
                const eobWithHtml = completeData.claims.filter(c => c.eobContent);

                if (eobWithPdf.length > 0) {
                    console.log('\n📄 LIENS EOB PDF:');
                    eobWithPdf.forEach(claim => {
                        console.log(`Claim #${claim.claimNumber}: ${claim.eobUrl}`);
                        console.log('   → Cliquez pour ouvrir le PDF dans un nouvel onglet');
                    });
                }

                if (eobWithHtml.length > 0) {
                    console.log('\n📄 EOB HTML RÉCUPÉRÉS:');
                    eobWithHtml.forEach(claim => {
                        console.log(`Claim #${claim.claimNumber}: HTML de ${claim.eobContent.length} caractères disponible`);
                        console.log('   → Données EOB dans: guardianCompleteData.claims[].eobContent`);
                    });
                }
            }

            window.guardianCompleteData = completeData;
            return completeData;

        } catch (error) {
            console.error('❌ Erreur:', error);
            return null;
        }
    }
};

// Fonction simple d'utilisation
async function getCompleteGuardianData(firstName, lastName, dateOfBirth) {
    return await guardianCompleteExtractor.extractCompletePatientData(lastName, dateOfBirth, firstName);
}

console.log('%c🏥 GUARDIAN COMPLETE EXTRACTOR', 'font-size: 20px; color: #4CAF50; font-weight: bold');
console.log('='.repeat(50));
console.log('\n📋 Utilisation:');
console.log('%cgetCompleteGuardianData("TEAGEN", "Jensby", "09/12/2012")', 'background: #e8f5e9; padding: 4px 8px');
console.log('\n💾 Les données seront dans: window.guardianCompleteData');