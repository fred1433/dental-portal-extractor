// Test avec Marlon Smith qu'on SAIT avoir une assurance
async function testMarlonSmith() {
    console.log(`🎯 Test avec Marlon Smith (on sait qu'il a BCBS + Group 421769)\n`);

    const url = `https://a1.denticon.com/aspx/patients/AdvancedPatientOverview.aspx?patid=9070654`;

    try {
        const response = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        console.log(`📊 Status: ${response.status}`);

        if (response.status === 200) {
            const html = await response.text();
            console.log(`📏 Size: ${html.length} bytes`);

            // Vérifier si on a le bon patient
            if (html.includes('Smith, Marlon')) {
                console.log(`✅ Marlon Smith trouvé dans le HTML!\n`);

                // Chercher les données qu'on SAIT qui existent
                const checks = [
                    { name: 'BCBS', regex: /BCBS/ },
                    { name: 'Group 421769', regex: /421769/ },
                    { name: 'Carrier Name', regex: /Carrier Name/ },
                    { name: 'Group #', regex: /Group #/ },
                    { name: '254-226-6235', regex: /254-226-6235/ },
                    { name: 'Email', regex: /marlon\.dsmith234/ }
                ];

                console.log('🔎 Vérification des données connues:\n');
                checks.forEach(check => {
                    if (check.regex.test(html)) {
                        console.log(`   ✅ ${check.name} - TROUVÉ`);
                    } else {
                        console.log(`   ❌ ${check.name} - NON trouvé`);
                    }
                });

                // Extraire Group # avec regex
                const groupMatch = html.match(/Group #[\s\S]{0,300}?viewPrimDentalIns[^>]*title="[^"]*">([^<]+)</);
                if (groupMatch) {
                    console.log(`\n🎯 Group # extrait (regex): ${groupMatch[1].trim()}`);
                }

                // Extraire Carrier avec regex
                const carrierMatch = html.match(/viewPrimDentalCarrier[^>]*>[\s\n]*([^<\n]+)/);
                if (carrierMatch) {
                    console.log(`🎯 Carrier extrait (regex): ${carrierMatch[1].trim()}`);
                }

                return { success: true, html: html };

            } else {
                console.log(`❌ Marlon Smith NON trouvé`);
            }
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

// Test
testMarlonSmith();
