// Debug pour voir ce que l'endpoint retourne vraiment
async function debugEligibility() {
    console.log('🔍 DEBUG Endpoint Éligibilité\n');

    const date = '10/2/2025';
    const url = `https://c1.denticon.com/EligibilityVerificationReport/GetPatientEligibilityTableData?PGID=3169&OID=102&APPTPRDR=ALL&APTDATE=${encodeURIComponent(date)}&ELIGSTATUS=ALL&_=${Date.now()}`;

    console.log(`📍 URL: ${url}\n`);

    try {
        const response = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        console.log(`📊 Status: ${response.status}`);
        console.log(`📏 Content-Type: ${response.headers.get('content-type')}\n`);

        if (response.status === 200) {
            const text = await response.text();
            console.log(`📄 Response length: ${text.length} bytes\n`);

            // Essayer de parser en JSON
            try {
                const data = JSON.parse(text);
                console.log('✅ JSON valide!\n');
                console.log('📊 Structure de la réponse:');
                console.log(`   Keys: ${Object.keys(data).join(', ')}\n`);

                if (data.tableData) {
                    console.log(`✅ tableData existe: ${data.tableData.length} éléments\n`);
                    if (data.tableData.length > 0) {
                        console.log('📋 Premier patient:');
                        console.log(JSON.stringify(data.tableData[0], null, 2));
                    }
                } else {
                    console.log('❌ tableData n\'existe PAS\n');
                    console.log('📄 Réponse complète:');
                    console.log(JSON.stringify(data, null, 2));
                }

            } catch (e) {
                console.log('❌ Pas du JSON valide\n');
                console.log('📄 Réponse brute (premiers 500 chars):');
                console.log(text.substring(0, 500));
            }

        } else {
            console.log(`❌ Erreur HTTP ${response.status}`);
            const text = await response.text();
            console.log('Response:', text.substring(0, 300));
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

// Debug
debugEligibility();
