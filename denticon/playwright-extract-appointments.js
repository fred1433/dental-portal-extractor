/**
 * TEST EXTRACTION APPOINTMENTS DENTICON
 *
 * Teste la qualité des données récupérées depuis le calendrier a1
 * avec enrichissement (téléphones, DOB, procédures, etc.)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testAppointmentsExtraction() {
    console.log('🔍 TEST EXTRACTION APPOINTMENTS DENTICON\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 100
    });

    const context = await browser.newContext({
        storageState: path.join(__dirname, '.denticon-session', 'storageState.json')
    });

    const page = await context.newPage();

    try {
        console.log('🏠 Navigation vers la page d\'accueil...\n');
        await page.goto('https://a1.denticon.com/aspx/home/advancedmypage.aspx?chk=tls');
        await page.waitForTimeout(2000);

        // Vérifier qu'on n'est pas redirigé vers login
        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
            throw new Error('Session expirée - redirigé vers login. Relancez: node denticon/denticon-login.js');
        }

        console.log('✅ Session valide - Connecté !\n');
        console.log('🚀 Exécution du script d\'extraction (depuis page d\'accueil)...\n');

        // Injecter et exécuter le script d'extraction
        const results = await page.evaluate(async () => {
            const testDate = '10/6/2025';  // Test autre date
            const maxPatients = 10;  // Plus de patients pour évaluation qualité

            console.log('🎯 EXTRACTION COMPLÈTE : Calendrier + Détails');
            console.log(`📅 Date: ${testDate}`);
            console.log(`📊 Nombre de rendez-vous à tester: ${maxPatients}\n`);

            // ========== ÉTAPE 1: Calendrier ==========
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📍 ÉTAPE 1: Extraction du calendrier');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            const schedUrl = `https://a1.denticon.com/aspx/appointments/getsched.aspx?sv=1&svid=&p=&o=106&date=${testDate}&q=s&cols=8&stcol=1&hipaa=f&prodview=t&quicksaveview=f&rn=${Date.now()}&stoid=&hideProviderTime=f`;

            try {
                const schedResponse = await fetch(schedUrl, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });

                if (schedResponse.status !== 200) {
                    throw new Error(`Calendrier erreur: ${schedResponse.status}`);
                }

                const html = await schedResponse.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const appointments = doc.querySelectorAll('div.appt');

                console.log(`✅ ${appointments.length} rendez-vous trouvés\n`);

                // Filtrer vrais patients
                const realAppointments = [];
                appointments.forEach(appt => {
                    const pid = appt.getAttribute('pid');
                    const aid = appt.getAttribute('aid');
                    const patientName = appt.querySelector('.patn')?.textContent.trim();

                    if (pid && pid !== '0' && aid && patientName &&
                        !patientName.includes('READ, BLOCKS') &&
                        !patientName.includes('DR, KANG') &&
                        !patientName.includes('STAFFING')) {
                        realAppointments.push({
                            appointment_id: aid,
                            patient_id: pid,
                            patient_name: patientName,
                            time: appt.getAttribute('t')
                        });
                    }
                });

                const toProcess = realAppointments.slice(0, maxPatients);
                console.log(`👥 ${toProcess.length} rendez-vous de patients réels à enrichir:\n`);
                toProcess.forEach((a, i) => console.log(`   ${i+1}. ${a.patient_name} (AID: ${a.appointment_id})`));

                // ========== ÉTAPE 2: Enrichissement ==========
                console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('📍 ÉTAPE 2: Enrichissement avec détails');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

                const enrichedData = [];

                for (let i = 0; i < toProcess.length; i++) {
                    const appt = toProcess[i];
                    console.log(`\n👤 Rendez-vous ${i+1}/${toProcess.length}`);
                    console.log(`   ${appt.patient_name} - ${appt.time}`);
                    console.log('   ─────────────────────────────────────');

                    const detailsUrl = `https://a1.denticon.com/ASPX/GetApptDetails.aspx?rnd=${Date.now()}&apptid=${appt.appointment_id}&oid=102&hipaa=f&act=det&zon=3&hideProviderTime=f`;

                    try {
                        const detailsResponse = await fetch(detailsUrl, {
                            method: 'POST',
                            headers: { 'X-Requested-With': 'XMLHttpRequest' }
                        });

                        if (detailsResponse.status === 200) {
                            const detailsHtml = await detailsResponse.text();

                            // Parser les données enrichies
                            const headerMatch = detailsHtml.match(/\((\d+) - ([MF]) - (\d+) yrs - ([\d\/]+)\)/);
                            const dob = headerMatch ? headerMatch[4] : null;

                            // Téléphones
                            const phoneMatch = detailsHtml.match(/W: ([^\<]+)<br>\s*H: ([^\<]+)<br>\s*C: ([^\<]+)/);
                            const phones = phoneMatch ? {
                                work: phoneMatch[1].trim(),
                                home: phoneMatch[2].trim(),
                                cell: phoneMatch[3].trim()
                            } : null;

                            // Procédures
                            const procedureMatches = detailsHtml.matchAll(/<td class=smalldata colspan=2 nowrap=nowrap>([D\d]+)<\/td>\s*<td class=smalldata colspan=6 nowrap=nowrap>([^<]+)<\/td>\s*<td class=smalldata colspan=2 align=right nowrap=nowrap>([\d.]+)<\/td>/g);
                            const procedures = [];
                            for (const match of procedureMatches) {
                                procedures.push({
                                    cdt_code: match[1].trim(),
                                    description: match[2].trim(),
                                    price: parseFloat(match[3])
                                });
                            }

                            // Totaux
                            const totalMatch = detailsHtml.match(/<i>Modified:<\/i>.*?<td class=smalldata[^>]*>([\d.]+)<\/td>/);
                            const total = totalMatch ? parseFloat(totalMatch[1]) : null;

                            const estPatMatch = detailsHtml.match(/Est\. Pat\.&nbsp;&nbsp;<\/td>\s*<td class=smalldata[^>]*>([\d.]+)<\/td>/);
                            const estPat = estPatMatch ? parseFloat(estPatMatch[1]) : null;

                            const enriched = {
                                ...appt,
                                date_of_birth: dob,
                                phone_work: phones?.work || 'N/A',
                                phone_home: phones?.home || 'N/A',
                                phone_cell: phones?.cell || 'N/A',
                                procedures_detailed: procedures,
                                total_amount: total,
                                estimated_patient: estPat
                            };

                            enrichedData.push(enriched);

                            console.log('   ✅ Données enrichies:');
                            console.log(`      DOB: ${dob || 'N/A'}`);
                            console.log(`      Cell: ${phones?.cell || 'N/A'}`);
                            console.log(`      Home: ${phones?.home || 'N/A'}`);
                            console.log(`      Work: ${phones?.work || 'N/A'}`);
                            console.log(`      Procédures: ${procedures.length}`);
                            procedures.forEach(p => console.log(`        - ${p.cdt_code}: ${p.description} ($${p.price})`));
                            console.log(`      Total: $${total || 0}`);
                            console.log(`      Est. Patient: $${estPat || 0}`);
                        }
                    } catch (error) {
                        console.error(`   ❌ Erreur: ${error.message}`);
                    }

                    // Pause entre requêtes
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('✅ EXTRACTION TERMINÉE');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

                return enrichedData;

            } catch (error) {
                console.error('❌ Erreur globale:', error);
                return null;
            }
        });

        // ========== PARTIE 2: EXTRACTION c1 ==========
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📍 PARTIE 2: Navigation vers c1 (insurance)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const c1StartTime = Date.now();
        await page.goto('https://c1.denticon.com/aspx/home/advancedmypage.aspx?chk=tls');
        const c1NavTime = Date.now() - c1StartTime;
        await page.waitForTimeout(2000);
        console.log(`✅ Sur c1.denticon.com (navigation: ${c1NavTime}ms + attente: 2000ms)\n`);

        const c1FetchStart = Date.now();
        const c1Results = await page.evaluate(async () => {
            const testDate = '10/6/2025';
            const fetchStart = Date.now();
            const url = `https://c1.denticon.com/EligibilityVerificationReport/GetPatientEligibilityTableData?PGID=3169&OID=102&APPTPRDR=ALL&APTDATE=${encodeURIComponent(testDate)}&ELIGSTATUS=ALL&_=${Date.now()}`;

            const response = await fetch(url, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            const data = await response.json();
            const fetchTime = Date.now() - fetchStart;
            console.log(`✅ c1 endpoint: ${data.tableData?.length || 0} patients (requête: ${fetchTime}ms)`);
            return data.tableData || [];
        });
        const c1TotalTime = Date.now() - c1FetchStart;
        console.log(`⏱️  Temps total c1 (fetch + parsing): ${c1TotalTime}ms`);

        console.log(`\n📧 Données c1 extraites: ${c1Results.length} patients\n`);

        // ========== PARTIE 3: FUSION a1 + c1 ==========
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📍 PARTIE 3: Fusion a1 + c1');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const merged = results.map(a1Patient => {
            // Chercher patient correspondant dans c1
            const c1Patient = c1Results.find(c1 => {
                const a1LastName = a1Patient.patient_name.split(',')[0].toLowerCase();
                return c1.PatName && c1.PatName.toLowerCase().includes(a1LastName);
            });

            return {
                ...a1Patient,
                // Contact
                email: c1Patient?.Email || null,
                cell_phone_c1: c1Patient?.CELLPHONE || null,
                // Assurance primaire
                primary_carrier: c1Patient?.PrimCarrName || null,
                primary_subscriber_id: c1Patient?.PrimSUBID || null,
                primary_subscriber_name: c1Patient?.PrimSubName || null,
                primary_subscriber_dob: c1Patient?.PrimSubBirthDateFormatted || null,
                primary_eligibility_status: c1Patient?.PrimEligStatus || null,
                primary_last_verified: c1Patient?.PrimLastVerifiedOnFormatted || null,
                primary_website: c1Patient?.PrimWEBSITE || null,
                primary_notes: c1Patient?.PrimINSNOTES || null,
                // Assurance secondaire
                secondary_carrier: c1Patient?.SecCarrName || null,
                secondary_subscriber_id: c1Patient?.SecSUBID || null,
                secondary_subscriber_name: c1Patient?.SecSubName || null,
                secondary_subscriber_dob: c1Patient?.SecSubBirthDateFormatted || null,
                secondary_eligibility_status: c1Patient?.SecEligStatus || null,
                secondary_last_verified: c1Patient?.SecLastVerifiedOnFormatted || null,
                // Provider
                provider_name: c1Patient?.ApptProviderName || null
            };
        });

        console.log(`✅ ${merged.length} patients fusionnés (a1 + c1)\n`);

        // Afficher les résultats dans Node.js
        console.log('\n📊 RÉSULTATS FINAUX:\n');
        console.log(`✅ ${merged?.length || 0} patients extraits avec succès\n`);

        if (merged && merged.length > 0) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📋 RÉSUMÉ PAR PATIENT:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            merged.forEach((patient, i) => {
                console.log(`${i + 1}. ${patient.patient_name}`);
                console.log(`   DOB: ${patient.date_of_birth}`);
                console.log(`   Tel (a1): ${patient.phone_cell}`);
                console.log(`   Email: ${patient.email || 'N/A'}`);
                console.log(`   Provider: ${patient.provider_name || 'N/A'}`);
                console.log(`   PRIMARY: ${patient.primary_carrier || 'N/A'} (${patient.primary_subscriber_id || 'N/A'}) [${patient.primary_eligibility_status || 'N/A'}]`);
                if (patient.secondary_carrier) {
                    console.log(`   SECONDARY: ${patient.secondary_carrier} (${patient.secondary_subscriber_id || 'N/A'})`);
                }
                console.log(`   Heure RDV: ${patient.time}`);
                console.log(`   Procédures: ${patient.procedures_detailed.length} | Total: $${patient.total_amount || 0}`);
                console.log('');
            });

            // Sauvegarder en JSON
            const outputFile = path.join(__dirname, 'test-results-appointments.json');
            fs.writeFileSync(outputFile, JSON.stringify(merged, null, 2));
            console.log(`💾 Résultats sauvegardés: ${outputFile}\n`);
        }

        // ========== ÉVALUATION QUALITÉ ==========
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 ÉVALUATION QUALITÉ DES DONNÉES');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        let stats = {
            total: merged.length,
            // a1 (appointments)
            with_dob: 0,
            with_cell: 0,
            with_home: 0,
            with_work: 0,
            with_any_phone: 0,
            with_procedures: 0,
            with_total_amount: 0,
            // c1 (insurance)
            with_email: 0,
            with_carrier: 0,
            with_subscriber_id: 0,
            with_provider: 0,
            with_secondary_ins: 0,
            with_eligibility_status: 0,
            matched_c1: 0,
            // Complétude
            complete_a1: 0,  // DOB + cell + procedures
            complete_c1: 0,  // email + carrier + subscriber_id
            complete_all: 0  // a1 + c1 complet
        };

        merged.forEach(p => {
            // a1
            if (p.date_of_birth) stats.with_dob++;
            if (p.phone_cell && p.phone_cell !== 'NA' && p.phone_cell !== 'N/A') stats.with_cell++;
            if (p.phone_home && p.phone_home !== 'NA' && p.phone_home !== 'N/A') stats.with_home++;
            if (p.phone_work && p.phone_work !== 'NA' && p.phone_work !== 'N/A') stats.with_work++;
            if ((p.phone_cell && p.phone_cell !== 'NA') ||
                (p.phone_home && p.phone_home !== 'NA') ||
                (p.phone_work && p.phone_work !== 'NA')) stats.with_any_phone++;
            if (p.procedures_detailed && p.procedures_detailed.length > 0) stats.with_procedures++;
            if (p.total_amount && p.total_amount > 0) stats.with_total_amount++;

            // c1
            if (p.email) stats.with_email++;
            if (p.primary_carrier) stats.with_carrier++;
            if (p.primary_subscriber_id) stats.with_subscriber_id++;
            if (p.provider_name) stats.with_provider++;
            if (p.secondary_carrier) stats.with_secondary_ins++;
            if (p.primary_eligibility_status && p.primary_eligibility_status !== 'Unknown') stats.with_eligibility_status++;
            if (p.email || p.primary_carrier || p.primary_subscriber_id) stats.matched_c1++;

            // Complétude
            const hasA1 = p.date_of_birth &&
                         (p.phone_cell && p.phone_cell !== 'NA') &&
                         p.procedures_detailed && p.procedures_detailed.length > 0;
            const hasC1 = p.email && p.primary_carrier && p.primary_subscriber_id;

            if (hasA1) stats.complete_a1++;
            if (hasC1) stats.complete_c1++;
            if (hasA1 && hasC1) stats.complete_all++;
        });

        const pct = (val) => ((val / stats.total) * 100).toFixed(1);

        console.log('📋 DONNÉES a1 (Appointments):');
        console.log(`   DOB               : ${stats.with_dob}/${stats.total} (${pct(stats.with_dob)}%)`);
        console.log(`   Téléphone cell    : ${stats.with_cell}/${stats.total} (${pct(stats.with_cell)}%)`);
        console.log(`   Téléphone home    : ${stats.with_home}/${stats.total} (${pct(stats.with_home)}%)`);
        console.log(`   Téléphone work    : ${stats.with_work}/${stats.total} (${pct(stats.with_work)}%)`);
        console.log(`   Au moins 1 tél    : ${stats.with_any_phone}/${stats.total} (${pct(stats.with_any_phone)}%)`);
        console.log(`   Procédures        : ${stats.with_procedures}/${stats.total} (${pct(stats.with_procedures)}%)`);
        console.log(`   Montant total     : ${stats.with_total_amount}/${stats.total} (${pct(stats.with_total_amount)}%)`);

        console.log('\n📧 DONNÉES c1 (Insurance):');
        console.log(`   Email                : ${stats.with_email}/${stats.total} (${pct(stats.with_email)}%)`);
        console.log(`   Primary Carrier      : ${stats.with_carrier}/${stats.total} (${pct(stats.with_carrier)}%)`);
        console.log(`   Primary Subscriber ID: ${stats.with_subscriber_id}/${stats.total} (${pct(stats.with_subscriber_id)}%)`);
        console.log(`   Provider Name        : ${stats.with_provider}/${stats.total} (${pct(stats.with_provider)}%)`);
        console.log(`   Secondary Insurance  : ${stats.with_secondary_ins}/${stats.total} (${pct(stats.with_secondary_ins)}%)`);
        console.log(`   Eligibility Status   : ${stats.with_eligibility_status}/${stats.total} (${pct(stats.with_eligibility_status)}%)`);
        console.log(`   Match c1 trouvé      : ${stats.matched_c1}/${stats.total} (${pct(stats.matched_c1)}%)`);

        console.log('\n🎯 COMPLÉTUDE:');
        console.log(`   a1 complet (DOB+Tel+Proc)    : ${stats.complete_a1}/${stats.total} (${pct(stats.complete_a1)}%)`);
        console.log(`   c1 complet (Email+Carr+SubID): ${stats.complete_c1}/${stats.total} (${pct(stats.complete_c1)}%)`);
        console.log(`   TOUT complet (a1+c1)         : ${stats.complete_all}/${stats.total} (${pct(stats.complete_all)}%)`);

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ TEST TERMINÉ');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await browser.close();
    }
}

testAppointmentsExtraction();
