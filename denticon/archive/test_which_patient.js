// Vérifier QUEL patient est retourné pour différents PatID
async function testWhichPatient() {
    console.log(`🔍 Test: Vérifier quel patient est retourné\n`);

    const patientIds = [
        { id: '9046504', name: 'Reyes, Alex' },
        { id: '9070654', name: 'Smith, Marlon' },
        { id: '9023911', name: 'Huber, Shawnna' },
        { id: '9071499', name: 'San Nicolas, Juanita' }
    ];

    for (const pat of patientIds) {
        console.log(`\n🧪 Test PatID ${pat.id} (devrait être ${pat.name})...`);

        const url = `https://a1.denticon.com/aspx/patients/AdvancedPatientOverview.aspx?patid=${pat.id}`;

        try {
            const response = await fetch(url, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            if (response.status === 200) {
                const html = await response.text();
                console.log(`   📏 Size: ${html.length} bytes`);

                // Chercher QUEL patient est dans le HTML
                const foundNames = [];
                patientIds.forEach(p => {
                    if (html.includes(p.name)) {
                        foundNames.push(p.name);
                    }
                });

                if (foundNames.length > 0) {
                    console.log(`   👤 Patient(s) trouvé(s): ${foundNames.join(', ')}`);

                    if (foundNames.includes(pat.name)) {
                        console.log(`   ✅ Correct ! C'est bien ${pat.name}`);
                    } else {
                        console.log(`   ❌ ERREUR ! On demandait ${pat.name} mais on a reçu ${foundNames[0]}`);
                    }
                } else {
                    console.log(`   ❓ Aucun patient connu trouvé`);
                }
            }

        } catch (error) {
            console.error(`   ❌ Erreur: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 800));
    }

    console.log('\n🏁 Test terminé');
}

// Test
testWhichPatient();
