/**
 * ORCHESTRATION COMPLÈTE : PMS → ASSURANCE → FORMULAIRE
 *
 * Ce script fait le workflow complet :
 * 1. Extrait les rendez-vous depuis Denticon (PMS)
 * 2. Pour chaque rendez-vous, extrait les données d'assurance
 * 3. Combine tout pour créer le formulaire final pré-rempli
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { savePatient } = require('../db/mongodb-client');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'demo2024secure';
const CLINIC_ID = process.env.DENTICON_CLINIC_ID || 'ace_dental';
const CLINIC_NAME = 'Ace Dental Heights'; // TODO: mapper depuis CLINIC_ID

async function extractAppointmentsFromDenticon() {
    console.log('🔍 ÉTAPE 1: Extraction des rendez-vous depuis Denticon\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚡ Utilisation du script extract-patient-records.js...\n');

    // Lancer le script d'extraction existant qui fait déjà tout !
    const { spawn } = require('child_process');

    return new Promise((resolve, reject) => {
        const child = spawn('node', ['extract-patient-records.js'], {
            cwd: __dirname,
            stdio: 'inherit' // Affiche la sortie du script
        });

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Script extract-patient-records.js terminé avec code ${code}`));
                return;
            }

            // Lire le fichier JSON généré
            const dataDir = path.join(__dirname, 'data');
            const files = fs.readdirSync(dataDir)
                .filter(f => f.startsWith('patients-') && f.endsWith('.json'))
                .sort()
                .reverse(); // Le plus récent en premier

            if (files.length === 0) {
                reject(new Error('Aucun fichier de sortie trouvé dans data/'));
                return;
            }

            const latestFile = path.join(dataDir, files[0]);
            console.log(`\n📂 Lecture du fichier: ${files[0]}\n`);

            const data = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
            console.log(`✅ ${data.length} patients extraits avec données complètes\n`);

            resolve(data);
        });

        child.on('error', reject);
    });
}

async function extractInsuranceData(patientData) {
    console.log(`\n📋 ÉTAPE 2: Extraction assurance pour ${patientData.patient_name}`);

    // Parser le nom du patient
    const nameParts = patientData.patient_name.split(',').map(s => s.trim());
    const lastName = nameParts[0] || '';
    const firstName = nameParts[1]?.split(' ')[0] || ''; // Prend juste le prénom (pas le middle name)

    // Récupérer subscriber ID (plusieurs sources possibles)
    const subscriberId = patientData.primary_subscriber_id_primary
        || patientData.primary_subscriber_id
        || patientData.scraped_primary?.subscriber_id;

    const dateOfBirth = patientData.date_of_birth;

    // Vérifier qu'on a les données nécessaires
    if (!subscriberId || !dateOfBirth) {
        console.log(`⚠️  Données manquantes - Subscriber ID: ${subscriberId || 'MANQUANT'}, DOB: ${dateOfBirth || 'MANQUANT'}`);
        return null;
    }

    console.log(`   ✅ Données PMS trouvées: SubID=${subscriberId}, DOB=${dateOfBirth}`);

    // Préparer la requête API avec les VRAIES données du PMS
    const requestData = {
        firstName: firstName,
        lastName: lastName,
        subscriberId: subscriberId,  // ← Depuis extraction Primary Insurance
        dateOfBirth: dateOfBirth,    // ← Depuis a1
        portal: 'DDINS',
        clinicId: CLINIC_ID,
        // Données PMS optionnelles (rendez-vous)
        appointmentDate: patientData.date,
        appointmentTime: patientData.time
    };

    try {
        const response = await axios.post(`${API_URL}/api/extract`, requestData, {
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Extraction assurance réussie');
        return response.data;

    } catch (error) {
        console.error(`❌ Erreur extraction assurance: ${error.message}`);
        return null;
    }
}

async function saveResults(results) {
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `full-extraction-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Résultats sauvegardés: ${filename}`);

    return filepath;
}

async function main() {
    console.log('🚀 DÉMARRAGE ORCHESTRATION COMPLÈTE\n');
    console.log('════════════════════════════════════════\n');

    try {
        // Étape 1: Extraire données complètes depuis Denticon (a1 + c1)
        const patientsData = await extractAppointmentsFromDenticon();

        if (!patientsData || patientsData.length === 0) {
            console.log('\n⚠️  Aucun patient trouvé');
            return;
        }

        // Traiter tous les patients extraits (sans filtre de date)
        const todayPatients = patientsData;
        console.log(`\n📅 Patients à traiter: ${todayPatients.length}\n`);

        // Étape 2: Pour chaque patient, enrichir avec données du payeur
        const results = [];
        let mongoSaved = 0;

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 ENRICHISSEMENT AVEC DONNÉES ASSURANCE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        for (const patient of todayPatients) {
            const insuranceData = await extractInsuranceData(patient);

            // Construire le document fusionné pour JSON local
            const mergedResult = {
                pms_data: patient,  // Données complètes depuis Denticon
                payer_data: insuranceData,  // Données depuis le portail assurance
                timestamp: new Date().toISOString()
            };

            results.push(mergedResult);

            // === SAUVEGARDE MONGODB ===
            // Construire le document MongoDB avec la structure correcte
            try {
                // Parser le nom du patient
                const nameParts = patient.patient_name.split(',').map(s => s.trim());
                const lastName = nameParts[0] || '';
                const firstName = nameParts[1]?.split(' ')[0] || '';

                // Formater DOB en YYYY-MM-DD
                let formattedDOB = patient.date_of_birth;
                if (patient.date_of_birth && patient.date_of_birth.includes('/')) {
                    const [month, day, year] = patient.date_of_birth.split('/');
                    formattedDOB = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }

                // Détecter le portal depuis insuranceData ou utiliser défaut
                const portalCode = insuranceData?.data?.extraction?.portalCode || 'DDINS';

                const mongoDocument = {
                    extraction: {
                        clinic: CLINIC_NAME,
                        clinicId: CLINIC_ID,
                        portal: portalCode,
                        portalCode: portalCode,
                        mode: 'orchestrated',
                        date: new Date().toISOString(),
                        version: '1.0',
                        sources: ['PMS', portalCode]
                    },
                    patient: {
                        subscriberId: patient.primary_subscriber_id_primary || patient.primary_subscriber_id,
                        firstName: firstName.toUpperCase(),
                        lastName: lastName.toUpperCase(),
                        dateOfBirth: formattedDOB
                    },
                    pms_data: patient,  // Toutes les données PMS
                    payer_data: insuranceData?.data || insuranceData  // Données d'assurance
                };

                await savePatient(mongoDocument);
                mongoSaved++;
                console.log(`   💾 Sauvegardé dans MongoDB: ${firstName} ${lastName}`);

            } catch (mongoError) {
                console.error(`   ⚠️  Erreur MongoDB (non-bloquante): ${mongoError.message}`);
            }

            // Pause entre requêtes pour éviter rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Étape 3: Sauvegarder les résultats
        const filepath = await saveResults(results);

        // Résumé
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ ORCHESTRATION TERMINÉE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log(`📝 Patients traités: ${results.length}`);
        console.log(`💾 Fichier local: ${filepath}`);
        console.log(`💾 MongoDB: ${mongoSaved}/${results.length} patients sauvegardés\n`);

        // Afficher résumé des extractions réussies
        const successful = results.filter(r => r.payer_data?.success).length;
        console.log(`✅ Extractions assurance réussies: ${successful}/${results.length}`);
        console.log(`❌ Échecs: ${results.length - successful}\n`);

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Lancer le script si appelé directement
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { extractAppointmentsFromDenticon, extractInsuranceData };
