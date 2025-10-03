// EXTRACTION 5 MOIS - Juin à Octobre 2025
// Pour obtenir des statistiques plus représentatives des carriers

async function extract5MonthsCarrierStats() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 EXTRACTION 5 MOIS - STATISTIQUES CARRIERS');
    console.log('📅 Juin 2025 → Octobre 2025');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const allPatients = [];
    const carrierStats = {};
    const monthlyStats = {};

    // Définir les 5 mois (Juin à Octobre 2025)
    const months = [
        { name: 'Juin 2025', month: 6, days: 30 },
        { name: 'Juillet 2025', month: 7, days: 31 },
        { name: 'Août 2025', month: 8, days: 31 },
        { name: 'Septembre 2025', month: 9, days: 30 },
        { name: 'Octobre 2025', month: 10, days: 31 }
    ];

    // Boucle sur chaque mois
    for (const monthData of months) {
        console.log(`\n📆 ${monthData.name}`);
        console.log('─────────────────────────────────────');

        let monthPatientCount = 0;

        // Boucle sur chaque jour du mois
        for (let day = 1; day <= monthData.days; day++) {
            const date = `${monthData.month}/${day}/2025`;
            const url = `https://c1.denticon.com/EligibilityVerificationReport/GetPatientEligibilityTableData?PGID=3169&OID=102&APPTPRDR=ALL&APTDATE=${encodeURIComponent(date)}&ELIGSTATUS=ALL&_=${Date.now()}`;

            try {
                const response = await fetch(url, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });

                if (response.status === 200) {
                    const data = await response.json();
                    const patients = data.tableData || [];

                    if (patients.length > 0) {
                        monthPatientCount += patients.length;

                        patients.forEach(p => {
                            const carrier = p.PrimCarrName || 'Unknown';

                            // Ajouter au total global
                            if (!carrierStats[carrier]) {
                                carrierStats[carrier] = {
                                    count: 0,
                                    carrier_id: p.PrimCarrID,
                                    months: {}
                                };
                            }
                            carrierStats[carrier].count++;

                            // Compter par mois
                            if (!carrierStats[carrier].months[monthData.name]) {
                                carrierStats[carrier].months[monthData.name] = 0;
                            }
                            carrierStats[carrier].months[monthData.name]++;

                            // Sauvegarder patient
                            allPatients.push({
                                date: date,
                                month: monthData.name,
                                patient_id: p.PATID,
                                patient_name: p.PatName,
                                carrier_name: carrier,
                                carrier_id: p.PrimCarrID,
                                subscriber_id: p.PrimSUBID
                            });
                        });
                    }
                }

                // Pause entre requêtes (pour ne pas surcharger le serveur)
                await new Promise(resolve => setTimeout(resolve, 300));

            } catch (error) {
                console.error(`   ❌ Erreur ${date}:`, error.message);
            }
        }

        console.log(`   ✅ ${monthData.name}: ${monthPatientCount} patients`);
        monthlyStats[monthData.name] = monthPatientCount;
    }

    // Trier les carriers par volume total
    const sortedCarriers = Object.entries(carrierStats)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({
            carrier_name: name,
            carrier_id: data.carrier_id,
            total_patients: data.count,
            percentage: ((data.count / allPatients.length) * 100).toFixed(2),
            by_month: data.months
        }));

    // Résultat final
    const finalResult = {
        metadata: {
            extraction_date: new Date().toISOString(),
            period: 'Juin 2025 - Octobre 2025',
            total_patients: allPatients.length,
            total_carriers: sortedCarriers.length,
            months_analyzed: months.map(m => m.name)
        },

        monthly_summary: monthlyStats,

        carriers_top_20: sortedCarriers.slice(0, 20),

        all_carriers: sortedCarriers,

        patients: allPatients
    };

    // ========== AFFICHAGE RÉSUMÉ ==========
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ EXTRACTION 5 MOIS TERMINÉE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`📊 STATISTIQUES GLOBALES:`);
    console.log(`   • Total patients: ${finalResult.metadata.total_patients}`);
    console.log(`   • Total carriers: ${finalResult.metadata.total_carriers}`);
    console.log(`   • Période: Juin-Octobre 2025\n`);

    console.log(`📅 PAR MOIS:`);
    Object.entries(monthlyStats).forEach(([month, count]) => {
        console.log(`   • ${month}: ${count} patients`);
    });

    console.log(`\n🏆 TOP 20 CARRIERS (5 mois):`);
    sortedCarriers.slice(0, 20).forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.carrier_name}: ${c.total_patients} patients (${c.percentage}%)`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💾 EXPORT DES DONNÉES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Données sauvegardées dans: window.fiveMonthsData');
    console.log('\n🔧 COMMANDES UTILES:');
    console.log('   • Copier JSON: copy(JSON.stringify(window.fiveMonthsData, null, 2))');
    console.log('   • Top 20: console.table(window.fiveMonthsData.carriers_top_20)');
    console.log('   • Par mois: console.table(window.fiveMonthsData.monthly_summary)\n');

    // Sauvegarder dans window
    window.fiveMonthsData = finalResult;

    // Fonction helper pour télécharger
    window.downloadJSON = function(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log(`✅ Fichier téléchargé: ${filename}`);
    };

    console.log('💾 Pour télécharger: downloadJSON(window.fiveMonthsData, "5months_carrier_stats.json")\n');

    return finalResult;
}

// LANCER L'EXTRACTION
console.log('✅ Script chargé !');
console.log('📋 Pour lancer: extract5MonthsCarrierStats()');
console.log('⏱️  Durée estimée: ~10 minutes\n');
