// Script pour extraire les rendez-vous Denticon
async function extractAppointments(date = '10/2/2025') {
    console.log(`🔍 Extraction des rendez-vous pour le ${date}...`);

    const url = `https://a1.denticon.com/aspx/appointments/getsched.aspx?sv=1&svid=&p=&o=106&date=${date}&q=s&cols=8&stcol=1&hipaa=f&prodview=t&quicksaveview=f&rn=${Date.now()}&stoid=&hideProviderTime=f`;

    try {
        const response = await fetch(url, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const html = await response.text();
        console.log(`📏 Réponse reçue: ${html.length} bytes`);

        // Parser le HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Trouver tous les rendez-vous
        const appointments = doc.querySelectorAll('div.appt');
        console.log(`✅ ${appointments.length} rendez-vous trouvés`);

        // Extraire les données
        const data = [];
        appointments.forEach((appt, i) => {
            const patientNameEl = appt.querySelector('.patn');
            const table = appt.querySelector('table');

            const apptData = {
                appointment_id: appt.getAttribute('aid'),
                patient_id: appt.getAttribute('pid'),
                patient_name: patientNameEl ? patientNameEl.textContent.trim() : null,
                time: appt.getAttribute('t'),
                duration_minutes: appt.getAttribute('m'),
                date: appt.getAttribute('d'),
                office_id: appt.getAttribute('oid'),
                status: appt.getAttribute('as'),
                is_new_patient: table ? table.getAttribute('IsNewPatient') === 'True' : false
            };

            // Extraire les procédures
            const procedures = [];
            const rows = appt.querySelectorAll('tr');
            rows.forEach((row, idx) => {
                if (idx >= 2) { // Skip les 2 premières lignes
                    const td = row.querySelector('td.apptmt');
                    if (td) {
                        const text = td.textContent.trim();
                        if (text && !text.startsWith('ACE04') && !text.startsWith('&nbsp;')) {
                            procedures.push(text);
                        }
                    }
                }
            });
            apptData.procedures = procedures;

            data.push(apptData);

            console.log(`\n📋 Rendez-vous ${i + 1}:`, apptData);
        });

        console.log('\n🎉 Extraction terminée!');
        console.log('📊 Données complètes:', data);

        // Copier dans le presse-papier
        const jsonString = JSON.stringify(data, null, 2);
        await navigator.clipboard.writeText(jsonString);
        console.log('✅ Données copiées dans le presse-papier!');

        // Aussi afficher le JSON pour copie manuelle
        console.log('\n📋 JSON (au cas où):');
        console.log(jsonString);

        return data;

    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

// Lancer l'extraction
extractAppointments('10/2/2025');
