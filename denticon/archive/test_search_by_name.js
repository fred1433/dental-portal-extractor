// Test: Recherche par nom PUIS détails
async function testSearchByNameThenDetails(lastName = 'Smith', firstName = 'Marlon') {
    console.log(`🎯 Test: Recherche "${lastName}, ${firstName}" → Détails\n`);

    // ÉTAPE 1: Rechercher par nom
    console.log('📍 ÉTAPE 1: Recherche du patient par nom...');

    const searchUrl = 'https://c1.denticon.com/SearchPatients/GetPatients';
    const searchBody = new URLSearchParams({
        'draw': '1',
        'start': '0',
        'length': '100',
        'SearchFor': 'PATIENT',
        'SearchBy': 'LNAME',  // Chercher par nom de famille
        'SearchIn': 'CURRENT',
        'SearchText': lastName,
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
            console.log(`   ✅ ${searchData.totalCount[0]} patients "${lastName}" trouvés`);

            // Trouver le patient spécifique
            const patient = searchData.data.find(p =>
                p.LName.toLowerCase() === lastName.toLowerCase() &&
                p.FName.toLowerCase() === firstName.toLowerCase()
            );

            if (!patient) {
                console.log(`   ❌ ${lastName}, ${firstName} non trouvé dans les résultats`);
                return { success: false };
            }

            console.log(`   ✅ Patient trouvé:`, patient);
            console.log(`   PatID: ${patient.PatID}`);
            console.log(`   RPID: ${patient.RpID}`);

            // ÉTAPE 2: Détails via A1
            console.log('\n📍 ÉTAPE 2: Récupération des détails via A1...');

            const detailsUrl = `https://a1.denticon.com/aspx/patients/AdvancedPatientOverview.aspx?patid=${patient.PatID}`;

            const detailsResponse = await fetch(detailsUrl, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            console.log(`   Status: ${detailsResponse.status}`);

            if (detailsResponse.status === 200) {
                const html = await detailsResponse.text();
                console.log(`   Size: ${html.length} bytes`);

                const fullName = `${lastName}, ${firstName}`;
                if (html.includes(fullName)) {
                    console.log(`   ✅ SUCCÈS ! Patient trouvé dans le HTML!`);

                    // Parser quelques données pour vérifier
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');

                    // Essayer plusieurs sélecteurs
                    const nameInput = doc.querySelector('input[id*="PatName"]');
                    const carrierLink = doc.querySelector('a[id*="DentalCarrier"]');
                    const groupLink = doc.querySelector('a[id*="DentalIns"]');

                    console.log('\n   📊 Données extraites:');
                    console.log(`      Nom input: ${nameInput?.value || 'N/A'}`);
                    console.log(`      Carrier: ${carrierLink?.textContent.trim() || 'N/A'}`);
                    console.log(`      Group: ${groupLink?.textContent.trim() || 'N/A'}`);

                    // Chercher avec regex aussi
                    const groupRegex = html.match(/viewPrimDentalIns[^>]*title="[^"]*">([^<]+)</);
                    if (groupRegex) {
                        console.log(`      Group (regex): ${groupRegex[1].trim()}`);
                    }

                    return { success: true, patient: patient, html: html };
                } else {
                    console.log(`   ❌ ${fullName} NON trouvé dans le HTML`);
                }
            }
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    }

    return { success: false };
}

// Test avec Smith, Marlon (on sait qu'il existe)
testSearchByNameThenDetails('Smith', 'Marlon');
