// Test de l'endpoint d'éligibilité - LA MINE D'OR
async function testEligibilityEndpoint(date = '10/3/2025') {
    console.log(`🎯 TEST ENDPOINT ÉLIGIBILITÉ`);
    console.log(`📅 Date: ${date}\n`);

    const url = `https://c1.denticon.com/EligibilityVerificationReport/GetPatientEligibilityTableData?PGID=3169&OID=102&APPTPRDR=ALL&APTDATE=${encodeURIComponent(date)}&ELIGSTATUS=ALL&_=${Date.now()}`;

    console.log(`📍 URL: ${url.substring(0, 120)}...\n`);

    try {
        const response = await fetch(url, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        console.log(`📊 Status: ${response.status}`);

        if (response.status === 200) {
            const data = await response.json();
            console.log(`📏 JSON Size: ${JSON.stringify(data).length} bytes\n`);

            console.log(`✅ Nombre de patients: ${data.tableData?.length || 0}\n`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            // Afficher les 3 premiers patients avec détails
            const patients = data.tableData?.slice(0, 3) || [];

            patients.forEach((p, i) => {
                console.log(`👤 PATIENT ${i + 1}: ${p.PatName}`);
                console.log('─────────────────────────────────────');
                console.log(`   PatID: ${p.PATID}`);
                console.log(`   RPID: ${p.RPID}`);
                console.log(`   DOB: ${p.PrimSubBirthDateFormatted}`);
                console.log(`   Téléphone: ${p.CELLPHONE}`);
                console.log(`   Email: ${p.Email || 'N/A'}`);
                console.log(`   Heure rendez-vous: ${p.ApptTime}`);
                console.log(`\n   📋 ASSURANCE PRIMAIRE:`);
                console.log(`      Carrier: ${p.PrimCarrName}`);
                console.log(`      Carrier ID: ${p.PrimCarrID}`);
                console.log(`      Subscriber ID: ${p.PrimSUBID}`);
                console.log(`      Plan ID: ${p.PrimINSPLANID}`);
                console.log(`      Eligibility: ${p.PrimEligStatus}`);
                console.log(`      Last Verified: ${p.PrimLastVerifiedOnFormatted}`);
                console.log(`      Verified By: ${p.PrimLastVerifiedBy}\n`);
            });

            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📊 CARRIERS DISPONIBLES:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            data.primInsCarriers?.forEach((c, i) => {
                console.log(`   ${i + 1}. ${c.NameRaw} (ID: ${c.Id})`);
            });

            console.log('\n\n📊 JSON COMPLET (premiers 3 patients):\n');
            console.log(JSON.stringify(patients, null, 2));

            return data;
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

// Test
testEligibilityEndpoint('10/3/2025');
