/**
 * EXTRACT INSURANCE DATA - Septembre + Octobre 2025 (c1 seulement)
 *
 * Extrait directement depuis c1 (plus rapide) :
 * - Nom de l'assureur (primary_carrier)
 * - Nom du patient (last_name)
 * - Prénom du patient (first_name)
 * - Date de naissance (date_of_birth)
 * - Subscriber ID (primary_subscriber_id)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Générer toutes les dates d'un mois
function generateMonthDates(month, year) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const dates = [];
    for (let day = 1; day <= daysInMonth; day++) {
        dates.push(`${month}/${day}/${year}`);
    }
    return dates;
}

async function extractInsuranceData() {
    console.log('🔍 EXTRACTION DONNÉES ASSURANCE (Septembre + Octobre 2025)\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const browser = await chromium.launch({
        headless: false,
        channel: 'chrome'
    });

    const context = await browser.newContext({
        storageState: path.join(__dirname, '.denticon-session', 'storageState.json')
    });

    const page = await context.newPage();

    try {
        console.log('🏠 Navigation vers c1...\n');
        await page.goto('https://c1.denticon.com/aspx/home/advancedmypage.aspx?chk=tls');
        await page.waitForTimeout(2000);

        console.log('✅ Connecté à c1 !\n');

        // Générer toutes les dates
        const septemberDates = generateMonthDates(9, 2025);
        const octoberDates = generateMonthDates(10, 2025);
        const allDates = [...septemberDates, ...octoberDates];

        console.log(`📅 Dates à traiter:`);
        console.log(`   Septembre: ${septemberDates.length} jours`);
        console.log(`   Octobre: ${octoberDates.length} jours`);
        console.log(`   TOTAL: ${allDates.length} jours\n`);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📍 Extraction c1 (insurance + patient data)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const allResults = await page.evaluate(async (allDates) => {
            const allPatients = [];
            const seenPatIds = new Set();

            for (let i = 0; i < allDates.length; i++) {
                const testDate = allDates[i];
                const url = `https://c1.denticon.com/EligibilityVerificationReport/GetPatientEligibilityTableData?PGID=3169&OID=102&APPTPRDR=ALL&APTDATE=${encodeURIComponent(testDate)}&ELIGSTATUS=ALL&_=${Date.now()}`;

                try {
                    const response = await fetch(url, {
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    });

                    const data = await response.json();

                    if (data.tableData && data.tableData.length > 0) {
                        data.tableData.forEach(patient => {
                            if (!seenPatIds.has(patient.PATID)) {
                                seenPatIds.add(patient.PATID);
                                allPatients.push({
                                    ...patient,
                                    appointment_date: testDate
                                });
                            }
                        });
                    }

                } catch (error) {
                    // Continuer silencieusement
                }

                await new Promise(resolve => setTimeout(resolve, 200));
            }

            return allPatients;
        }, allDates);

        console.log(`✅ ${allResults.length} patients uniques extraits\n`);

        // ========== TRANSFORMATION DES DONNÉES ==========
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📍 Transformation des données');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const finalData = allResults.map(p => {
            // Parser le nom complet
            const fullName = p.PatName || '';
            const nameParts = fullName.split(',').map(s => s.trim());
            const lastName = nameParts[0] || '';
            let firstName = nameParts[1] || '';

            // Nettoyer firstName
            firstName = firstName.replace(/\s*\[\d+\s*\/\s*[MF](?:\s*\/\s*[^\]]+)?\]\s*$/i, '');
            firstName = firstName.replace(/\s*\([^)]+\)\s*/g, '').trim();

            // Déterminer le mois
            const dateObj = new Date(p.appointment_date);
            const month = dateObj.getMonth() + 1;

            return {
                patient_id: p.PATID,
                last_name: lastName,
                first_name: firstName,
                date_of_birth: p.PrimSubBirthDateFormatted || null,
                primary_carrier: p.PrimCarrName || null,
                primary_subscriber_id: p.PrimSUBID || null,
                appointment_date: p.appointment_date,
                month: month === 9 ? 'Septembre' : 'Octobre'
            };
        });

        console.log(`✅ ${finalData.length} patients transformés\n`);

        // ========== STATISTIQUES PAR MOIS ==========
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 STATISTIQUES PAR MOIS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const septData = finalData.filter(p => p.month === 'Septembre');
        const octData = finalData.filter(p => p.month === 'Octobre');

        const calcStats = (data, monthName) => {
            const withDOB = data.filter(p => p.date_of_birth).length;
            const withCarrier = data.filter(p => p.primary_carrier).length;
            const withSubID = data.filter(p => p.primary_subscriber_id).length;
            const complete = data.filter(p => p.date_of_birth && p.primary_carrier && p.primary_subscriber_id).length;

            console.log(`📅 ${monthName.toUpperCase()}:`);
            console.log(`   Total patients         : ${data.length}`);
            console.log(`   Avec DOB               : ${withDOB}/${data.length} (${data.length > 0 ? ((withDOB/data.length)*100).toFixed(1) : '0.0'}%)`);
            console.log(`   Avec Assureur          : ${withCarrier}/${data.length} (${data.length > 0 ? ((withCarrier/data.length)*100).toFixed(1) : '0.0'}%)`);
            console.log(`   Avec Subscriber ID     : ${withSubID}/${data.length} (${data.length > 0 ? ((withSubID/data.length)*100).toFixed(1) : '0.0'}%)`);
            console.log(`   Complet (DOB+Carr+ID)  : ${complete}/${data.length} (${data.length > 0 ? ((complete/data.length)*100).toFixed(1) : '0.0'}%)`);
            console.log('');

            return { total: data.length, withDOB, withCarrier, withSubID, complete };
        };

        const septStats = calcStats(septData, 'Septembre');
        const octStats = calcStats(octData, 'Octobre');

        // Comparaison
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📈 COMPARAISON SEPT vs OCT');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log(`Total patients:`);
        console.log(`   Septembre: ${septStats.total}`);
        console.log(`   Octobre:   ${octStats.total}`);
        console.log(`   Diff:      ${octStats.total > septStats.total ? '+' : ''}${octStats.total - septStats.total}\n`);

        if (septStats.total > 0 && octStats.total > 0) {
            console.log(`Avec assurance complète (DOB+Carr+ID):`);
            console.log(`   Septembre: ${septStats.complete}/${septStats.total} (${((septStats.complete/septStats.total)*100).toFixed(1)}%)`);
            console.log(`   Octobre:   ${octStats.complete}/${octStats.total} (${((octStats.complete/octStats.total)*100).toFixed(1)}%)`);
        }

        // Sauvegarder JSON complet
        const outputFile = path.join(__dirname, 'insurance-data-results.json');
        fs.writeFileSync(outputFile, JSON.stringify(finalData, null, 2));
        console.log(`\n💾 Résultats JSON: ${outputFile}\n`);

        // Sauvegarder CSV
        const csvHeaders = 'Month,Patient ID,Last Name,First Name,Date of Birth,Primary Carrier,Subscriber ID,Appointment Date\n';
        const csvRows = finalData.map(p =>
            `${p.month},"${p.patient_id}","${p.last_name}","${p.first_name}","${p.date_of_birth || ''}","${p.primary_carrier || ''}","${p.primary_subscriber_id || ''}","${p.appointment_date}"`
        ).join('\n');
        const csvFile = path.join(__dirname, 'insurance-data-results.csv');
        fs.writeFileSync(csvFile, csvHeaders + csvRows);
        console.log(`💾 Résultats CSV: ${csvFile}\n`);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ EXTRACTION TERMINÉE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await browser.close();
    }
}

extractInsuranceData();
