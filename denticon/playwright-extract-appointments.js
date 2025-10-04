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
            const testDate = '10/2/2025';
            const maxPatients = 3;

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

        // Afficher les résultats dans Node.js
        console.log('\n📊 RÉSULTATS FINAUX:\n');
        console.log(`✅ ${results?.length || 0} patients extraits avec succès\n`);

        if (results && results.length > 0) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📋 RÉSUMÉ PAR PATIENT:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            results.forEach((patient, i) => {
                console.log(`${i + 1}. ${patient.patient_name}`);
                console.log(`   DOB: ${patient.date_of_birth}`);
                console.log(`   Téléphone cell: ${patient.phone_cell}`);
                console.log(`   Téléphone home: ${patient.phone_home}`);
                console.log(`   Heure RDV: ${patient.time}`);
                console.log(`   Procédures: ${patient.procedures_detailed.length}`);
                console.log(`   Total: $${patient.total_amount || 0}`);
                console.log('');
            });

            // Sauvegarder en JSON
            const outputFile = path.join(__dirname, 'test-results-appointments.json');
            fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
            console.log(`💾 Résultats sauvegardés: ${outputFile}\n`);
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ TEST TERMINÉ');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await browser.close();
    }
}

testAppointmentsExtraction();
