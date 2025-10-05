// Test: Appeler l'endpoint de sélection PUIS détails
async function testSelectPatient(patientId = '9070654', rpId = '9069809') {
    console.log(`🎯 Test: Sélection → Détails pour PatID ${patientId}\n`);

    // ÉTAPE 1: "Sélectionner" le patient via C1
    console.log('📍 ÉTAPE 1: Sélection du patient...');

    const selectUrl = `https://c1.denticon.com/?pgid=3169&patid=${patientId}&oid=102&uid=DENTISTRYAUTO&rpid=${rpId}&planc=&ApptID=&LinkAppt=&ckey=cnPrm&pagename=PatientOverview&ShowPicture=True&referral=3&IsLaunchFlashAlert=0`;

    console.log(`   URL: ${selectUrl.substring(0, 120)}...`);

    try {
        const selectResponse = await fetch(selectUrl, {
            method: 'GET',
            redirect: 'follow'
        });

        console.log(`   📊 Status: ${selectResponse.status}`);
        console.log(`   Size: ${(await selectResponse.clone().text()).length} bytes`);

        // Pause pour laisser la session s'initialiser
        await new Promise(resolve => setTimeout(resolve, 500));

        // ÉTAPE 2: Maintenant récupérer les détails
        console.log('\n📍 ÉTAPE 2: Récupération des détails...');

        const detailsUrl = 'https://c1.denticon.com/PatientOverview/Index';
        console.log(`   URL: ${detailsUrl}`);

        const detailsResponse = await fetch(detailsUrl, {
            method: 'GET'
        });

        console.log(`   📊 Status: ${detailsResponse.status}`);

        if (detailsResponse.status === 200) {
            const html = await detailsResponse.text();
            console.log(`   📏 Size: ${html.length} bytes`);

            // Vérifier si on a le bon patient
            if (html.includes('Smith, Marlon')) {
                console.log(`\n   🎉 SUCCÈS ! Patient Smith, Marlon trouvé!`);

                // Parser des données
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                const data = {
                    name: doc.querySelector('#basicInfoPatName')?.value.trim(),
                    carrier: doc.querySelector('#viewPrimDentalCarrier')?.textContent.trim(),
                    group: doc.querySelector('#viewPrimDentalIns')?.textContent.trim(),
                };

                console.log('\n   📊 Données extraites:');
                console.log(`      Nom: ${data.name || 'N/A'}`);
                console.log(`      Carrier: ${data.carrier || 'N/A'}`);
                console.log(`      Group: ${data.group || 'N/A'}`);

                return { success: true, data: data, html: html };

            } else {
                console.log(`\n   ❌ Smith, Marlon NON trouvé`);
                console.log(`   Extrait HTML:`, html.substring(0, 500));
            }
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    }

    return { success: false };
}

// Test
testSelectPatient('9070654', '9069809');
