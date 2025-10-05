/**
 * DEBUG c1 DATA - Voir les données brutes
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function debugC1Data() {
    console.log('🔍 DEBUG c1 DATA\n');

    const browser = await chromium.launch({
        headless: false,
        channel: 'chrome'
    });

    const context = await browser.newContext({
        storageState: path.join(__dirname, '.denticon-session', 'storageState.json')
    });

    const page = await context.newPage();

    try {
        await page.goto('https://c1.denticon.com/aspx/home/advancedmypage.aspx?chk=tls');
        await page.waitForTimeout(2000);

        console.log('✅ Connecté à c1\n');

        // Extraire une seule date pour voir la structure
        const rawData = await page.evaluate(async () => {
            const testDate = '10/2/2025';
            const url = `https://c1.denticon.com/EligibilityVerificationReport/GetPatientEligibilityTableData?PGID=3169&OID=102&APPTPRDR=ALL&APTDATE=${encodeURIComponent(testDate)}&ELIGSTATUS=ALL&_=${Date.now()}`;

            const response = await fetch(url, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            const data = await response.json();
            return data.tableData || [];
        });

        console.log(`📊 ${rawData.length} patients extraits pour 10/2/2025\n`);

        if (rawData.length > 0) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📋 STRUCTURE DU PREMIER PATIENT:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            const first = rawData[0];
            const allKeys = Object.keys(first).sort();

            console.log(`Total de champs: ${allKeys.length}\n`);

            allKeys.forEach(key => {
                const value = first[key];
                const valueStr = value === null ? 'NULL' :
                                value === '' ? 'EMPTY_STRING' :
                                typeof value === 'string' ? `"${value}"` :
                                JSON.stringify(value);
                console.log(`  ${key.padEnd(35)} : ${valueStr}`);
            });

            // Sauvegarder les 3 premiers patients complets
            const sample = rawData.slice(0, 3);
            const outputFile = path.join(__dirname, 'debug-c1-sample.json');
            fs.writeFileSync(outputFile, JSON.stringify(sample, null, 2));
            console.log(`\n💾 3 premiers patients sauvegardés: ${outputFile}\n`);

            // Statistiques sur tous les patients de cette date
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`📊 STATISTIQUES SUR ${rawData.length} PATIENTS:` );
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            const withCarrier = rawData.filter(p => p.PrimCarrName && p.PrimCarrName !== '').length;
            const withSubID = rawData.filter(p => p.PrimSUBID && p.PrimSUBID !== '').length;

            // Chercher tous les champs qui pourraient contenir DOB
            const dobFields = allKeys.filter(k =>
                k.toLowerCase().includes('dob') ||
                k.toLowerCase().includes('birth') ||
                k.toLowerCase().includes('bday')
            );

            console.log(`Champs liés à DOB trouvés: ${dobFields.length > 0 ? dobFields.join(', ') : 'AUCUN'}\n`);

            if (dobFields.length > 0) {
                dobFields.forEach(field => {
                    const withValue = rawData.filter(p => p[field] && p[field] !== '').length;
                    console.log(`  ${field}: ${withValue}/${rawData.length} remplis`);
                });
                console.log('');
            }

            console.log(`Avec PrimCarrName   : ${withCarrier}/${rawData.length} (${((withCarrier/rawData.length)*100).toFixed(1)}%)`);
            console.log(`Avec PrimSUBID      : ${withSubID}/${rawData.length} (${((withSubID/rawData.length)*100).toFixed(1)}%)`);

            // Patients SANS assurance
            const withoutCarrier = rawData.filter(p => !p.PrimCarrName || p.PrimCarrName === '');
            console.log(`\nSANS assureur       : ${withoutCarrier.length}/${rawData.length} (${((withoutCarrier.length/rawData.length)*100).toFixed(1)}%)`);

            if (withoutCarrier.length > 0 && withoutCarrier.length <= 5) {
                console.log('\n📋 Patients SANS assureur:');
                withoutCarrier.forEach(p => {
                    console.log(`   - ${p.PatName} (PATID: ${p.PATID})`);
                });
            }
        }

        await browser.close();

    } catch (error) {
        console.error('❌ Erreur:', error);
        await browser.close();
    }
}

debugC1Data();
