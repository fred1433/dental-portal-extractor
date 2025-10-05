// Chercher Kina, Alondra pour comparer les données
async function findKinaAlondra() {
    console.log('🔍 Recherche de Kina, Alondra (PatID: 9073715)\n');

    // Tester le 3 octobre (tu as dit que c'est demain)
    const date = '10/3/2025';
    console.log(`📅 Extraction du ${date}...\n`);

    const url = `https://a1.denticon.com/aspx/appointments/getsched.aspx?sv=1&svid=&p=&o=106&date=${date}&q=s&cols=8&stcol=1&hipaa=f&prodview=t&quicksaveview=f&rn=${Date.now()}&stoid=&hideProviderTime=f`;

    try {
        const response = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (response.status === 200) {
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const appointments = doc.querySelectorAll('div.appt');

            console.log(`✅ ${appointments.length} rendez-vous trouvés au total\n`);

            // Chercher Kina, Alondra
            let found = false;

            appointments.forEach((appt, i) => {
                const patientName = appt.querySelector('.patn')?.textContent.trim();
                const pid = appt.getAttribute('pid');

                if (patientName && (patientName.includes('Kina') || patientName.includes('Alondra') || pid === '9073715')) {
                    found = true;
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('🎯 KINA, ALONDRA TROUVÉE !');
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

                    // Extraire TOUTES les données possibles
                    const table = appt.querySelector('table');
                    const insSpan = appt.querySelector('.ins');
                    const statusImg = appt.querySelector('img[alt]');

                    // Extraire TOUTES les lignes de la table
                    const allTableData = [];
                    const rows = appt.querySelectorAll('tr');
                    rows.forEach(row => {
                        const td = row.querySelector('td.apptmt');
                        if (td) {
                            allTableData.push(td.textContent.trim());
                        }
                    });

                    const data = {
                        appointment_id: appt.getAttribute('aid'),
                        patient_id: pid,
                        responsible_party_id: appt.getAttribute('rpid'),
                        patient_name: patientName,
                        time: appt.getAttribute('t'),
                        duration_minutes: appt.getAttribute('m'),
                        date: appt.getAttribute('d'),
                        office_id: appt.getAttribute('oid'),
                        operatory: appt.getAttribute('i'),
                        status: appt.getAttribute('as'),
                        insurance_type: insSpan?.getAttribute('title') || 'N/A',
                        insurance_code: insSpan?.textContent.trim() || 'N/A',
                        confirmation_status: statusImg?.getAttribute('alt') || 'N/A',
                        is_new_patient: table?.getAttribute('IsNewPatient') === 'True',
                        background_color: table?.getAttribute('bgcolor'),
                        all_table_rows: allTableData
                    };

                    console.log('📊 DONNÉES EXTRAITES DU CALENDRIER:\n');
                    console.log(JSON.stringify(data, null, 2));

                    console.log('\n\n📋 COMPARAISON:');
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                    console.log('CE QU\'ON A (calendrier):');
                    console.log(`  ✅ Nom: ${data.patient_name}`);
                    console.log(`  ✅ Type assurance: ${data.insurance_type}`);
                    console.log(`  ✅ Heure: ${data.time} (${data.duration_minutes} min)`);
                    console.log(`  ✅ Procédures: ${data.all_table_rows.length} lignes`);
                    data.all_table_rows.forEach(row => console.log(`     - ${row}`));

                    console.log('\n\nCE QU\'ON N\'A PAS (mais visible dans l\'interface):');
                    console.log('  ❌ Téléphone: C: 912-463-7400');
                    console.log('  ❌ Code CDT: D2392');
                    console.log('  ❌ Prix par procédure: $145.00');
                    console.log('  ❌ Total: $290.00');
                    console.log('  ❌ Est. Patient: $261.00');
                    console.log('  ❌ Date de naissance exacte');

                    return data;
                }
            });

            if (!found) {
                console.log('❌ Kina, Alondra NON trouvée dans les rendez-vous du 10/3/2025');
                console.log('\n📋 Patients trouvés ce jour:');
                appointments.forEach((appt, i) => {
                    const name = appt.querySelector('.patn')?.textContent.trim();
                    const pid = appt.getAttribute('pid');
                    if (pid && pid !== '0') {
                        console.log(`   ${i+1}. ${name} (PID: ${pid})`);
                    }
                });
            }
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

// Rechercher
findKinaAlondra();
