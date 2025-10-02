// Extraire tous les rendez-vous d'octobre 2025
async function extractOctoberAppointments() {
    console.log('🎯 EXTRACTION RENDEZ-VOUS OCTOBRE 2025\n');

    const allAppointments = [];

    // Dates en octobre 2025 (du 1er au 31)
    const dates = [];
    for (let day = 1; day <= 31; day++) {
        dates.push(`10/${day}/2025`);
    }

    console.log(`📅 ${dates.length} dates à extraire\n`);

    for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        console.log(`📍 ${i + 1}/${dates.length} - ${date}...`);

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

                console.log(`   ✅ ${appointments.length} rendez-vous`);

                appointments.forEach(appt => {
                    const patientName = appt.querySelector('.patn')?.textContent.trim();
                    const pid = appt.getAttribute('pid');

                    // Filtrer les vrais patients
                    if (pid && pid !== '0' && patientName &&
                        !patientName.includes('READ, BLOCKS') &&
                        !patientName.includes('DR, KANG') &&
                        !patientName.includes('STAFFING')) {

                        const insSpan = appt.querySelector('.ins');
                        const rows = appt.querySelectorAll('tr');
                        const procedures = [];
                        rows.forEach((row, idx) => {
                            if (idx >= 2) {
                                const td = row.querySelector('td.apptmt');
                                if (td) {
                                    const text = td.textContent.trim();
                                    if (text && !text.startsWith('ACE04')) {
                                        procedures.push(text);
                                    }
                                }
                            }
                        });

                        allAppointments.push({
                            date: date,
                            appointment_id: appt.getAttribute('aid'),
                            patient_id: pid,
                            responsible_party_id: appt.getAttribute('rpid'),
                            patient_name: patientName,
                            time: appt.getAttribute('t'),
                            duration_minutes: appt.getAttribute('m'),
                            insurance_type: insSpan?.getAttribute('title') || 'N/A',
                            procedures: procedures
                        });
                    }
                });
            }

        } catch (error) {
            console.error(`   ❌ Erreur: ${error.message}`);
        }

        // Pause entre requêtes
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 EXTRACTION TERMINÉE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✅ ${allAppointments.length} rendez-vous extraits (patients réels)`);
    console.log('\n📊 JSON COMPLET:\n');
    console.log(JSON.stringify(allAppointments, null, 2));

    return allAppointments;
}

// Lancer l'extraction
extractOctoberAppointments();
