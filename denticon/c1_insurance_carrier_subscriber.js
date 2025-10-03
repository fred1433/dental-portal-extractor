// SCRIPT D'EXPORT FINAL - OCTOBRE 2025
// Extrait toutes les données d'assurance d'octobre et génère un JSON complet

async function exportFinalOctober() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 EXPORT FINAL - DONNÉES ASSURANCE OCTOBRE 2025');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const allPatients = [];
    const carrierStats = {};
    const dailyStats = {};

    // Tous les jours d'octobre (1-31)
    for (let day = 1; day <= 31; day++) {
        const date = `10/${day}/2025`;
        const url = `https://c1.denticon.com/EligibilityVerificationReport/GetPatientEligibilityTableData?PGID=3169&OID=102&APPTPRDR=ALL&APTDATE=${encodeURIComponent(date)}&ELIGSTATUS=ALL&_=${Date.now()}`;

        try {
            const response = await fetch(url, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            if (response.status === 200) {
                const data = await response.json();
                const patients = data.tableData || [];

                if (patients.length > 0) {
                    console.log(`✅ ${date}: ${patients.length} patients`);

                    dailyStats[date] = patients.length;

                    patients.forEach(p => {
                        // Données patient complètes
                        const patientData = {
                            date: date,
                            patient_id: p.PATID,
                            patient_name: p.PatName,
                            date_of_birth: p.PrimSubBirthDateFormatted,
                            phone_cell: p.CELLPHONE,
                            phone_home: p.HOMEPHONE,
                            phone_work: p.WORKPHONE,
                            email: p.Email || null,
                            appointment_time: p.ApptTime,

                            // Assurance primaire
                            primary_insurance: {
                                carrier_id: p.PrimCarrID,
                                carrier_name: p.PrimCarrName,
                                subscriber_id: p.PrimSUBID,
                                subscriber_name: p.PrimSubName,
                                plan_id: p.PrimINSPLANID,
                                eligibility_status: p.PrimEligStatus,
                                last_verified: p.PrimLastVerifiedOnFormatted,
                                verified_by: p.PrimLastVerifiedBy
                            },

                            // Métadonnées
                            rpid: p.RPID
                        };

                        allPatients.push(patientData);

                        // Stats par assureur
                        const carrier = p.PrimCarrName || 'Unknown';
                        if (!carrierStats[carrier]) {
                            carrierStats[carrier] = {
                                carrier_id: p.PrimCarrID,
                                count: 0,
                                patients: []
                            };
                        }
                        carrierStats[carrier].count++;
                        carrierStats[carrier].patients.push({
                            name: p.PatName,
                            date: date,
                            subscriber_id: p.PrimSUBID
                        });
                    });
                }
            }
        } catch (error) {
            console.error(`❌ ${date}: ${error.message}`);
        }

        // Pause entre requêtes
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Trier les assureurs par volume
    const sortedCarriers = Object.entries(carrierStats)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({
            carrier_name: name,
            carrier_id: data.carrier_id,
            patient_count: data.count,
            percentage: ((data.count / allPatients.length) * 100).toFixed(2),
            examples: data.patients.slice(0, 3)
        }));

    // Résultat final structuré
    const finalExport = {
        metadata: {
            extraction_date: new Date().toISOString(),
            month: 'October 2025',
            total_patients: allPatients.length,
            total_carriers: sortedCarriers.length,
            days_with_appointments: Object.keys(dailyStats).length
        },

        carriers_summary: sortedCarriers,

        daily_stats: dailyStats,

        patients: allPatients
    };

    // Affichage résumé
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ EXTRACTION TERMINÉE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`📊 STATISTIQUES:`);
    console.log(`   • Total patients: ${finalExport.metadata.total_patients}`);
    console.log(`   • Total assureurs: ${finalExport.metadata.total_carriers}`);
    console.log(`   • Jours avec RDV: ${finalExport.metadata.days_with_appointments}`);

    console.log(`\n🏆 TOP 5 ASSUREURS:`);
    sortedCarriers.slice(0, 5).forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.carrier_name}: ${c.patient_count} patients (${c.percentage}%)`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 EXPORT JSON');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Option 1 - Copier dans le presse-papier:');
    console.log('copy(JSON.stringify(window.octoberExport, null, 2))\n');

    console.log('Option 2 - Télécharger comme fichier:');
    console.log('downloadJSON(window.octoberExport, "october_2025_insurance_data.json")\n');

    console.log('Option 3 - Afficher le JSON complet:');
    console.log('console.log(JSON.stringify(window.octoberExport, null, 2))\n');

    // Sauvegarder dans window pour accès facile
    window.octoberExport = finalExport;

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

    console.log('✅ Données sauvegardées dans: window.octoberExport');
    console.log('✅ Fonction de téléchargement créée: window.downloadJSON()\n');

    return finalExport;
}

// LANCER L'EXPORT
exportFinalOctober();
