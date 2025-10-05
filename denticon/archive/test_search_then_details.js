// Test: Recherche patient PUIS détails (pour activer la session)
async function testSearchThenDetails(patientId = '9070654') {
    console.log(`🎯 Test: Recherche → Détails pour PatID ${patientId}\n`);

    // ÉTAPE 1: Rechercher par PatID pour "l'activer" dans la session
    console.log('📍 ÉTAPE 1: Recherche du patient par ID...');

    const searchUrl = 'https://c1.denticon.com/SearchPatients/GetPatients';
    const searchBody = new URLSearchParams({
        'draw': '1',
        'start': '0',
        'length': '10',
        'SearchFor': 'PATIENT',
        'SearchBy': 'PATID',  // Chercher par Patient ID
        'SearchIn': 'CURRENT',
        'SearchText': patientId,
        'IncludeInActive': 'N',
        'IncludeOrtho': '-1',
        'UserAccessLevel': 'ALLWITHCURRENT'
    });

    try {
        const searchResponse = await fetch(searchUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: searchBody
        });

        console.log(`   Status: ${searchResponse.status}`);

        if (searchResponse.status === 200) {
            const searchData = await searchResponse.json();
            console.log(`   ✅ Patient trouvé:`, searchData.data[0]);
            const patData = searchData.data[0];

            console.log(`   Nom: ${patData.LName}, ${patData.FName}`);
            console.log(`   RPID: ${patData.RpID}`);

            // ÉTAPE 2: Maintenant essayer d'obtenir les détails via A1
            console.log('\n📍 ÉTAPE 2: Récupération des détails via A1...');

            const detailsUrl = `https://a1.denticon.com/aspx/patients/AdvancedPatientOverview.aspx?patid=${patientId}`;

            const detailsResponse = await fetch(detailsUrl, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            console.log(`   Status: ${detailsResponse.status}`);

            if (detailsResponse.status === 200) {
                const html = await detailsResponse.text();
                console.log(`   Size: ${html.length} bytes`);

                // Vérifier si on a le bon patient
                const fullName = `${patData.LName}, ${patData.FName}`;
                if (html.includes(fullName)) {
                    console.log(`   ✅ Patient ${fullName} trouvé dans le HTML!`);

                    // Chercher des données spécifiques
                    if (html.match(/Group #[^<]*<\/div>[^<]*<[^>]*>([^<]+)</)) {
                        console.log(`   ✅ Des données d'assurance sont présentes!`);
                    }

                    return { success: true, html: html };
                } else {
                    console.log(`   ❌ Patient ${fullName} NON trouvé dans le HTML`);
                    console.log(`   Premier extrait:`, html.substring(0, 500));
                }
            }
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    }

    return { success: false };
}

// Test
testSearchThenDetails('9070654');
