// WORKFLOW COMPLET : Calendrier → Détails rendez-vous (TOUT !)
async function extractCompleteAppointments(date = '10/2/2025', maxAppointments = 3) {
    console.log('🎯 EXTRACTION COMPLÈTE : Calendrier + Détails');
    console.log(`📅 Date: ${date}`);
    console.log(`📊 Nombre de rendez-vous à tester: ${maxAppointments}\n`);

    // ========== ÉTAPE 1: Calendrier ==========
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 ÉTAPE 1: Extraction du calendrier');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const schedUrl = `https://a1.denticon.com/aspx/appointments/getsched.aspx?sv=1&svid=&p=&o=106&date=${date}&q=s&cols=8&stcol=1&hipaa=f&prodview=t&quicksaveview=f&rn=${Date.now()}&stoid=&hideProviderTime=f`;

    try {
        const schedResponse = await fetch(schedUrl, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (schedResponse.status !== 200) {
            console.error(`❌ Erreur calendrier: ${schedResponse.status}`);
            return;
        }

        const html = await schedResponse.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const appointments = doc.querySelectorAll('div.appt');

        console.log(`✅ ${appointments.length} rendez-vous trouvés\n`);

        // Filtrer vrais patients et prendre les N premiers
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

        const toProcess = realAppointments.slice(0, maxAppointments);
        console.log(`👥 ${toProcess.length} rendez-vous de patients réels à enrichir:\n`);
        toProcess.forEach((a, i) => console.log(`   ${i+1}. ${a.patient_name} (AID: ${a.appointment_id})`));

        // ========== ÉTAPE 2: Détails de chaque rendez-vous ==========
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

                console.log(`   📊 Status: ${detailsResponse.status}`);

                if (detailsResponse.status === 200) {
                    const detailsHtml = await detailsResponse.text();
                    console.log(`   📏 Size: ${detailsHtml.length} bytes`);

                    // Parser les données enrichies
                    const detailsDoc = parser.parseFromString(detailsHtml, 'text/html');

                    // Extraire header avec DOB
                    const headerMatch = detailsHtml.match(/\((\d+) - ([MF]) - (\d+) yrs - ([\d\/]+)\)/);
                    const dob = headerMatch ? headerMatch[4] : null;

                    // Téléphones
                    const phoneMatch = detailsHtml.match(/W: ([^\<]+)<br>\s*H: ([^\<]+)<br>\s*C: ([^\<]+)/);
                    const phones = phoneMatch ? {
                        work: phoneMatch[1].trim(),
                        home: phoneMatch[2].trim(),
                        cell: phoneMatch[3].trim()
                    } : null;

                    // Procédures avec codes CDT et prix
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

                    // Notes
                    const notesMatch = detailsHtml.match(/style=word-break:break-word;word-wrap:break-word;>([^<]+)<\/td>/);
                    const notes = notesMatch ? notesMatch[1].trim() : '';

                    const enriched = {
                        ...appt,
                        date_of_birth: dob,
                        phone_work: phones?.work || 'NA',
                        phone_home: phones?.home || 'NA',
                        phone_cell: phones?.cell || 'NA',
                        procedures_detailed: procedures,
                        total_amount: total,
                        estimated_patient: estPat,
                        notes: notes
                    };

                    enrichedData.push(enriched);

                    console.log('   ✅ Données enrichies:');
                    console.log(`      DOB: ${dob || 'N/A'}`);
                    console.log(`      Téléphone: ${phones?.cell || 'N/A'}`);
                    console.log(`      Procédures: ${procedures.length}`);
                    procedures.forEach(p => console.log(`        - ${p.cdt_code}: ${p.description} ($${p.price})`));
                    console.log(`      Total: $${total || 0}`);
                    console.log(`      Est. Patient: $${estPat || 0}`);

                } else {
                    console.log(`   ❌ Erreur: ${detailsResponse.status}`);
                }

            } catch (error) {
                console.error(`   ❌ Erreur: ${error.message}`);
            }

            // Pause entre requêtes
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // ========== RÉSUMÉ ==========
        console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 EXTRACTION COMPLÈTE TERMINÉE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log(`✅ ${enrichedData.length} rendez-vous avec données complètes\n`);
        console.log('📊 JSON FINAL:\n');
        console.log(JSON.stringify(enrichedData, null, 2));

        return enrichedData;

    } catch (error) {
        console.error('❌ Erreur globale:', error);
    }
}

// Tester avec 3 rendez-vous
extractCompleteAppointments('10/2/2025', 3);
