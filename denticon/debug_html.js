// Debug: Vérifier ce qu'on reçoit vraiment
async function debugPatientHTML(patientId = '9046504') {
    console.log(`🔍 Debug HTML pour PatID: ${patientId}...`);

    const url = `https://a1.denticon.com/aspx/patients/AdvancedPatientOverview.aspx?patid=${patientId}`;

    try {
        const response = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        console.log(`📊 Status: ${response.status}`);

        if (response.status === 200) {
            const html = await response.text();
            console.log(`📏 Size: ${html.length} bytes\n`);

            // Chercher des infos clés dans le HTML brut
            console.log('🔎 Recherche de données dans le HTML...\n');

            // Nom du patient
            const nameMatch = html.match(/<span class="font-weight-600" title="([^"]+)">\s*([^<]+)\s*<\/span>/);
            if (nameMatch) {
                console.log(`✅ Nom trouvé: ${nameMatch[1]}`);
            }

            // Assurance carrier
            const carrierMatch = html.match(/viewPrimDentalCarrier[^>]+>([^<]+)</);
            if (carrierMatch) {
                console.log(`✅ Assurance trouvé: ${carrierMatch[1].trim()}`);
            }

            // Group number
            const groupMatch = html.match(/viewPrimDentalIns[^>]+>([^<]+)</);
            if (groupMatch) {
                console.log(`✅ Group # trouvé: ${groupMatch[1].trim()}`);
            }

            // SSN
            const ssnMatch = html.match(/Patient SSN:\s*(XXX-XX-\d{4})/);
            if (ssnMatch) {
                console.log(`✅ SSN trouvé: ${ssnMatch[1]}`);
            }

            // Email
            const emailMatch = html.match(/data-cfemail="[^"]+">\[email&#160;protected\]<\/span>/);
            if (emailMatch) {
                console.log(`✅ Email trouvé (encodé)`);
            }

            // Balance
            const balanceMatch = html.match(/data-agingdetailsfor="PatBal"[^>]*>\s*([^<]+)\s*</);
            if (balanceMatch) {
                console.log(`✅ Balance trouvé: ${balanceMatch[1].trim()}`);
            }

            // Afficher un extrait du HTML pour inspection manuelle
            console.log('\n📄 Extrait du HTML (lignes avec "Smith" ou "Guardian" ou "421769"):');
            const lines = html.split('\n');
            lines.forEach((line, i) => {
                if (line.includes('basicInfoPatName') ||
                    line.includes('viewPrimDentalCarrier') ||
                    line.includes('viewPrimDentalIns') ||
                    line.includes('421769') ||
                    line.includes('Guardian') ||
                    line.includes('BCBS')) {
                    console.log(`Ligne ${i}: ${line.trim().substring(0, 150)}`);
                }
            });

        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

// Test avec le premier patient
debugPatientHTML('9046504');
