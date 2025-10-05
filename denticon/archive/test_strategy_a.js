// Test Stratégie A : Rendez-vous → Détails patients
async function testStrategyA(date = '10/2/2025', maxPatients = 3) {
    console.log(`🎯 TEST STRATÉGIE A : Extraction complète`);
    console.log(`📅 Date: ${date}`);
    console.log(`👥 Nombre de patients à tester: ${maxPatients}\n`);

    // ========== ÉTAPE 1: Récupérer les rendez-vous ==========
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 ÉTAPE 1: Récupération des rendez-vous');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const schedUrl = `https://a1.denticon.com/aspx/appointments/getsched.aspx?sv=1&svid=&p=&o=106&date=${date}&q=s&cols=8&stcol=1&hipaa=f&prodview=t&quicksaveview=f&rn=${Date.now()}&stoid=&hideProviderTime=f`;

    try {
        const schedResponse = await fetch(schedUrl, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (schedResponse.status !== 200) {
            console.error(`❌ Erreur lors de la récupération des rendez-vous: ${schedResponse.status}`);
            return;
        }

        const html = await schedResponse.text();
        console.log(`✅ Rendez-vous récupérés: ${html.length} bytes`);

        // Parser les rendez-vous
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const appointments = doc.querySelectorAll('div.appt');

        console.log(`📋 ${appointments.length} rendez-vous trouvés`);

        // Extraire les PatID uniques (seulement les vrais patients, pas les blocks)
        const patientIds = new Set();
        appointments.forEach(appt => {
            const pid = appt.getAttribute('pid');
            const patientName = appt.querySelector('.patn')?.textContent.trim();

            // Filtrer les blocks et patients ID=0
            if (pid && pid !== '0' && !patientName?.includes('READ, BLOCKS') && !patientName?.includes('DR, KANG') && !patientName?.includes('STAFFING')) {
                patientIds.add(pid);
            }
        });

        const uniquePatientIds = Array.from(patientIds).slice(0, maxPatients);
        console.log(`\n👥 ${uniquePatientIds.length} patients uniques (vrais patients):`);
        uniquePatientIds.forEach((pid, i) => console.log(`   ${i+1}. PatID: ${pid}`));

        // ========== ÉTAPE 2: Récupérer les détails de chaque patient ==========
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📍 ÉTAPE 2: Récupération des détails patients');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const patientsData = [];

        for (let i = 0; i < uniquePatientIds.length; i++) {
            const patId = uniquePatientIds[i];
            console.log(`\n👤 Patient ${i+1}/${uniquePatientIds.length} - PatID: ${patId}`);
            console.log('─────────────────────────────────────');

            const patientUrl = `https://a1.denticon.com/aspx/patients/AdvancedPatientOverview.aspx?patid=${patId}`;

            try {
                const patResponse = await fetch(patientUrl, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });

                console.log(`📊 Status: ${patResponse.status}`);

                if (patResponse.status === 200) {
                    const patHtml = await patResponse.text();
                    console.log(`📏 Size: ${patHtml.length} bytes`);

                    // Parser les données
                    const patDoc = parser.parseFromString(patHtml, 'text/html');

                    const patientData = {
                        patient_id: patId,
                        name: patDoc.querySelector('#basicInfoPatName')?.value.trim() || '',
                        age_sex: patDoc.querySelector('[title*="/ Male"], [title*="/ Female"]')?.textContent.trim() || '',
                        birthdate: patDoc.querySelector('.fa-birthday-cake')?.parentElement.querySelector('.font-weight-600')?.textContent.trim() || '',
                        ssn_partial: patDoc.querySelector('#labelPatInfo')?.title.match(/XXX-XX-\d{4}/)?.[0] || '',

                        // Assurance
                        insurance_carrier: patDoc.querySelector('#viewPrimDentalCarrier')?.textContent.trim() || '',
                        insurance_group: patDoc.querySelector('#viewPrimDentalIns')?.textContent.trim() || '',
                        insurance_phone: Array.from(patDoc.querySelectorAll('[title*="800-"]')).find(el => el.textContent.includes('800'))?.textContent.trim() || '',

                        // Contact
                        cell_phone: patDoc.querySelector('#openMessagingHub')?.textContent.trim() || '',
                        email: patDoc.querySelector('#openMessagingHubEmail .font-weight-600, #openMessagingHubEmail')?.textContent.trim() || '',

                        // Financier
                        balance: patDoc.querySelector('[data-agingdetailsfor="PatBal"]')?.textContent.trim() || '',

                        // Provider
                        provider: patDoc.querySelector('[title*="DDS"], [title*="DMD"]')?.textContent.trim() || '',
                        home_office: Array.from(patDoc.querySelectorAll('[title*="ACE"]')).find(el => el.textContent.includes('ACE'))?.textContent.trim() || ''
                    };

                    patientsData.push(patientData);

                    console.log('✅ Données extraites:');
                    console.log(`   Nom: ${patientData.name}`);
                    console.log(`   Âge/Sexe: ${patientData.age_sex}`);
                    console.log(`   Assurance: ${patientData.insurance_carrier} (${patientData.insurance_group})`);
                    console.log(`   Tel: ${patientData.cell_phone}`);
                    console.log(`   Email: ${patientData.email}`);
                    console.log(`   Balance: ${patientData.balance}`);

                } else {
                    console.log(`❌ Erreur HTTP ${patResponse.status}`);
                }

            } catch (error) {
                console.error(`❌ Erreur: ${error.message}`);
            }

            // Pause entre les requêtes
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // ========== RÉSUMÉ FINAL ==========
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 RÉSUMÉ FINAL');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log(`✅ ${appointments.length} rendez-vous récupérés`);
        console.log(`✅ ${patientsData.length} patients avec détails complets`);
        console.log('\n📊 Données JSON complètes:');
        console.log(JSON.stringify(patientsData, null, 2));

        return patientsData;

    } catch (error) {
        console.error('❌ Erreur globale:', error);
        return null;
    }
}

// Lancer le test
testStrategyA('10/2/2025', 3);
