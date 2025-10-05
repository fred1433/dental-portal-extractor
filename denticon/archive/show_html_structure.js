// Afficher la structure HTML pour comprendre comment parser
async function showHTMLStructure(patientId = '9046504') {
    console.log(`🔍 Analyse structure HTML pour PatID ${patientId}\n`);

    const url = `https://a1.denticon.com/aspx/patients/AdvancedPatientOverview.aspx?patid=${patientId}`;

    try {
        const response = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (response.status === 200) {
            const html = await response.text();
            console.log(`✅ HTML récupéré: ${html.length} bytes\n`);

            // Chercher les lignes importantes avec regex
            console.log('📋 Recherche de données clés dans le HTML brut:\n');

            // Nom
            const nameMatches = html.match(/Reyes, Alex/g);
            console.log(`✅ "Reyes, Alex" trouvé ${nameMatches?.length || 0} fois`);

            // Chercher les inputs/hidden fields
            const inputMatches = html.match(/<input[^>]*id="[^"]*"[^>]*value="[^"]*"[^>]*>/g);
            if (inputMatches) {
                console.log(`\n📝 Inputs trouvés: ${inputMatches.length}`);
                inputMatches.slice(0, 10).forEach((inp, i) => {
                    if (inp.includes('Pat') || inp.includes('Name')) {
                        console.log(`   ${i+1}. ${inp.substring(0, 120)}...`);
                    }
                });
            }

            // Chercher Group #
            const groupSection = html.match(/Group #[\s\S]{0,200}/);
            if (groupSection) {
                console.log(`\n✅ Section "Group #" trouvée:`);
                console.log(groupSection[0].substring(0, 300));
            }

            // Chercher Carrier
            const carrierSection = html.match(/Carrier Name[\s\S]{0,200}/);
            if (carrierSection) {
                console.log(`\n✅ Section "Carrier Name" trouvée:`);
                console.log(carrierSection[0].substring(0, 300));
            }

            // Afficher les 50 premières lignes qui contiennent "value="
            console.log(`\n📄 Lignes avec "value=" (extrait):`);
            const lines = html.split('\n');
            let count = 0;
            for (let i = 0; i < lines.length && count < 20; i++) {
                if (lines[i].includes('value=') && (lines[i].includes('Reyes') || lines[i].includes('Alex') || lines[i].includes('Pat'))) {
                    console.log(`Ligne ${i}: ${lines[i].trim().substring(0, 150)}`);
                    count++;
                }
            }

        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

// Analyser
showHTMLStructure('9046504');
