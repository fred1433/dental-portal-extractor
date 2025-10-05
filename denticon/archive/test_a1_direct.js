// Test SIMPLE: A1 directement avec PatID (on sait que ça marche!)
async function testA1Direct(patientId = '9046504') {
    console.log(`🎯 Test A1 direct pour PatID ${patientId}\n`);

    const url = `https://a1.denticon.com/aspx/patients/AdvancedPatientOverview.aspx?patid=${patientId}`;

    console.log(`📍 URL: ${url}`);

    try {
        const response = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        console.log(`📊 Status: ${response.status}`);

        if (response.status === 200) {
            const html = await response.text();
            console.log(`📏 Size: ${html.length} bytes`);

            // Chercher des noms de patients connus
            const knownNames = ['Reyes, Alex', 'Huber, Shawnna', 'San Nicolas, Juanita'];

            for (const name of knownNames) {
                if (html.includes(name)) {
                    console.log(`\n✅ Patient trouvé: ${name}`);

                    // Parser les données
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');

                    const nameInput = doc.querySelector('#basicInfoPatName');
                    const carrier = doc.querySelector('#viewPrimDentalCarrier');
                    const group = doc.querySelector('#viewPrimDentalIns');

                    console.log('\n📊 Données extraites:');
                    console.log(`   Nom: ${nameInput?.value || 'N/A'}`);
                    console.log(`   Carrier: ${carrier?.textContent.trim() || 'N/A'}`);
                    console.log(`   Group: ${group?.textContent.trim() || 'N/A'}`);

                    return { success: true, name: name, html: html };
                }
            }

            console.log(`\n⚠️  Aucun patient connu trouvé dans le HTML`);
            console.log(`Extrait:`, html.substring(0, 500));

        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    }

    return { success: false };
}

// Test avec le premier PatID des rendez-vous
testA1Direct('9046504');
