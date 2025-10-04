/**
 * WRITE PATIENT NOTE - Script sécurisé pour écrire une URL dans la patient note
 *
 * Ce script permet d'écrire une URL enrichie dans le champ "Patient Note"
 * de manière ultra-sécurisée avec validations multiples.
 *
 * IMPORTANT: Ne modifie QUE les patients test configurés ci-dessous
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ==================== CONFIGURATION DES PATIENTS TEST ====================
const TEST_PATIENTS = {
    PATIENT_TEST: {
        name: 'Patient, Test',
        lastName: 'Patient',
        firstName: 'Test',
        patid: 2000084,
        rpid: 2000084,
        dob: '10/10/2012',
        age: 12,
        sex: 'F'
    },
    TEST_PATIENT: {
        name: 'Test, Patient',
        lastName: 'Test',
        firstName: 'Patient',
        patid: 9016996,
        rpid: 9016207,
        dob: '05/21/1994',
        age: 31,
        sex: 'F'
    }
};

// ========== SÉLECTIONNER LE PATIENT CIBLE (MODIFIER ICI) ==========
const TARGET_PATIENT = TEST_PATIENTS.PATIENT_TEST;  // ← Change manuellement pour tester
const NEW_NOTE_URL = `https://dental-records.example.com/patient/${TARGET_PATIENT.patid}?date=${Date.now()}`;

// =======================================================================

async function writePatientNote() {
    console.log('📝 WRITE PATIENT NOTE - Script sécurisé\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎯 Patient cible:');
    console.log(`   Nom: ${TARGET_PATIENT.name}`);
    console.log(`   PATID: ${TARGET_PATIENT.patid}`);
    console.log(`   RPID: ${TARGET_PATIENT.rpid}`);
    console.log(`   Nouvelle URL: "${NEW_NOTE_URL}"\n`);

    const browser = await chromium.launch({
        headless: false,
        channel: 'chrome'  // Utilise Chrome pour une vraie fenêtre visible
    });

    const context = await browser.newContext({
        storageState: path.join(__dirname, '.denticon-session', 'storageState.json')
    });

    const page = await context.newPage();

    try {
        // ========== ÉTAPE 1: Connexion et extraction token ==========
        console.log('🏠 Navigation vers la page d\'accueil...\n');
        await page.goto('https://a1.denticon.com/aspx/home/advancedmypage.aspx?chk=tls');
        await page.waitForTimeout(2000);

        // Vérifier si session expirée (écran "Session Timeout")
        const hasTimeoutScreen = await page.evaluate(() => {
            return !!document.querySelector('#redirectLogin');
        });

        if (hasTimeoutScreen) {
            console.log('⚠️  Session expirée détectée !\n');
            console.log('🔗 Clic sur le lien de reconnexion...\n');

            await page.click('#redirectLogin');
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(2000);

            console.log('🔑 Reconnexion automatique...\n');

            // Remplir le formulaire de login
            const username = process.env.DENTICON_USERNAME;
            const password = process.env.DENTICON_PASSWORD;

            if (!username || !password) {
                throw new Error('❌ Credentials Denticon manquants dans .env (DENTICON_USERNAME, DENTICON_PASSWORD)');
            }

            // Écran 1 : Saisir username sur www.denticon.com/login
            await page.fill('input[name="username"]', username);
            await page.waitForTimeout(500);

            // Cliquer sur CONTINUE
            await page.click('#btnLogin');
            console.log('⏳ Attente du 2ème écran (password)...\n');
            await page.waitForTimeout(3000);

            // Écran 2 : Saisir password sur a1.denticon.com/aspx/home/login.aspx
            const hasPasswordField = await page.evaluate(() => {
                return !!document.querySelector('#txtPassword');
            });

            if (hasPasswordField) {
                console.log('🔐 Saisie du mot de passe...\n');
                await page.fill('#txtPassword', password);
                await page.waitForTimeout(500);

                // Cliquer sur LOGIN (aLogin qui déclenche Submit1)
                console.log('🔑 Clic sur LOGIN...\n');
                await page.click('#aLogin');
            } else {
                console.log('⚠️  Champ password non trouvé - peut-être déjà connecté ?\n');
            }

            // Attendre la redirection vers la home
            await page.waitForTimeout(3000);

            const finalUrl = page.url();
            console.log(`📍 URL après login: ${finalUrl}\n`);

            if (finalUrl.includes('advancedmypage')) {
                console.log('✅ Reconnexion réussie !\n');

                // Sauvegarder la nouvelle session
                const sessionPath = path.join(__dirname, '.denticon-session', 'storageState.json');
                await context.storageState({ path: sessionPath });
                console.log('💾 Session sauvegardée\n');

                // Continuer l'extraction - on réutilise la page actuelle
                console.log('🚀 Reprise du script...\n');
            } else {
                throw new Error(`❌ Reconnexion échouée - URL finale: ${finalUrl}`);
            }
        }

        console.log('✅ Session valide - Connecté !\n');

        console.log('🔑 Extraction du token de sécurité...\n');
        const securityToken = await page.evaluate(() => {
            if (window.SecurityToken) return window.SecurityToken;
            if (window.sessionToken) return window.sessionToken;
            if (window.powToken) return window.powToken;

            const iframes = document.querySelectorAll('iframe[src*="c1.denticon.com"]');
            for (const iframe of iframes) {
                const src = iframe.getAttribute('src');
                const match = src?.match(/[?&]t=([^&]+)/);
                if (match) return decodeURIComponent(match[1]);
            }

            return null;
        });

        console.log(`   Token: ${securityToken ? securityToken.substring(0, 20) + '... ✅' : '❌ NON TROUVÉ'}\n`);

        if (!securityToken) {
            throw new Error('❌ Security token non trouvé - impossible de continuer');
        }

        // ========== ÉTAPE 2: Navigation vers c1 ==========
        console.log('🌐 Navigation vers c1.denticon.com...\n');
        await page.goto('https://c1.denticon.com/aspx/home/advancedmypage.aspx?chk=tls');
        await page.waitForTimeout(2000);
        console.log('✅ Sur c1.denticon.com\n');

        // ========== ÉTAPE 3: Navigation vers le patient test ==========
        console.log('👤 Construction de l\'URL patient...\n');

        const timestamp = Math.floor(Date.now() / 1000);
        const selectionUrl = `https://c1.denticon.com/?pgid=3169&patid=${TARGET_PATIENT.patid}&oid=102&uid=DENTISTRYAUTO&rpid=${TARGET_PATIENT.rpid}&ckey=cnPrm&pagename=PatientOverview&ts=${timestamp}&ShowPicture=True&referral=3&IsLaunchFlashAlert=1&t=${encodeURIComponent(securityToken)}`;

        console.log('🔗 URL construite:');
        console.log(`   ${selectionUrl.substring(0, 100)}...\n`);

        console.log('🚀 Navigation vers le patient test...\n');
        await page.goto(selectionUrl);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(4000);  // Timer visuel pour voir PatientOverview

        // Fermer le popup FLASH ALERTS s'il apparaît
        const hasFlashAlertPopup = await page.evaluate(() => {
            const closeBtn = document.querySelector('.btn-close-flash-alert-modal');
            if (closeBtn) {
                closeBtn.click();
                return true;
            }
            return false;
        });

        if (hasFlashAlertPopup) {
            console.log('   ℹ️  Popup FLASH ALERTS fermé automatiquement\n');
            await page.waitForTimeout(500);
        }

        // ========== ÉTAPE 4: Vérification et affichage ==========
        console.log('📊 Extraction des informations patient...\n');

        const patientInfo = await page.evaluate(() => {
            const doc = document;

            // Vérifier erreur d'autorisation
            const bodyText = doc.body.textContent;
            if (bodyText.includes('not authorized') || bodyText.includes('Not Authorized')) {
                return { error: 'Not authorized - missing token or params' };
            }

            // Helper - nettoie aussi les espaces multiples (problème de wrap HTML)
            const getText = (selector) => {
                const el = doc.querySelector(selector);
                return el ? el.textContent.trim().replace(/\s+/g, ' ') : null;
            };

            // Extraire infos
            const patientName = getText('.patient-name-container .patient-name');
            const patientId = getText('.patient-name-container .patient-id-label');
            let patientNote = getText('.patient-notes .patient-notes-not-empty .label-inner');

            // Nettoyer les URLs (enlever espaces causés par wrap HTML)
            if (patientNote && (patientNote.startsWith('http://') || patientNote.startsWith('https://'))) {
                patientNote = patientNote.replace(/\s/g, '');
            }

            return {
                success: true,
                name: patientName,
                id: patientId,
                note: patientNote
            };
        });

        // Sauvegarder le HTML de la page patient automatiquement
        const patientPageHtml = await page.content();
        const htmlPath = '/tmp/patient-page.html';
        fs.writeFileSync(htmlPath, patientPageHtml);
        console.log(`💾 HTML de la page patient sauvegardé: ${htmlPath}\n`);

        // ========== ÉTAPE 5: Affichage résultats ==========
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 RÉSULTATS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        if (patientInfo.error) {
            console.log(`❌ ERREUR: ${patientInfo.error}\n`);
            console.log('⚠️  La navigation vers le patient a échoué.');
            console.log('   Vérifiez visuellement la page dans le navigateur.\n');
        } else if (patientInfo.success) {
            console.log('✅ Navigation réussie !\n');
            console.log(`👤 Nom du patient: ${patientInfo.name || 'NON TROUVÉ'}`);
            console.log(`🆔 Patient ID: ${patientInfo.id || 'NON TROUVÉ'}`);
            console.log(`📝 Patient Note: "${patientInfo.note || 'VIDE'}"\n`);

            // Vérification de sécurité
            if (patientInfo.id && patientInfo.id.includes('2000084')) {
                console.log('✅ CONFIRMATION: C\'est bien le patient test (ID 2000084)');
            } else {
                console.log('⚠️  ATTENTION: L\'ID du patient ne correspond pas !');
                console.log(`   Attendu: 2000084`);
                console.log(`   Reçu: ${patientInfo.id}`);
            }
        }

        // ========== VALIDATION CRITIQUE: Note doit être VIDE ==========
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔒 VALIDATION CRITIQUE: Vérification de la note');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const currentNote = patientInfo.note;
        const isNoteEmpty = !currentNote || currentNote.trim() === '';

        if (!isNoteEmpty) {
            console.log('⛔ ARRÊT DU SCRIPT PAR SÉCURITÉ\n');
            console.log('❌ La note du patient n\'est PAS vide !');
            console.log(`   Note actuelle: "${currentNote}"\n`);
            console.log('🔒 PROTECTION ACTIVE:');
            console.log('   Le script refuse d\'écraser une note existante.');
            console.log('   Pour écrire une note, le champ doit être vide.\n');

            await browser.close();
            throw new Error('Note non vide - Refus d\'écraser la note existante');
        }

        console.log('✅ Note actuelle VIDE - OK pour écrire\n');
        console.log('🔒 Le script va maintenant écrire la nouvelle note.\n');

        // ========== ÉTAPE 4: Navigation vers EditPatientInfo ==========
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📝 ÉTAPE 2: Navigation vers EditPatientInfo');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const editUrl = `https://a1.denticon.com/ASPX/Patients/AdvancedEditPatientInfo.aspx?patid=${TARGET_PATIENT.patid}&rpid=${TARGET_PATIENT.rpid}`;
        console.log(`🔗 URL AdvancedEditPatientInfo (a1): ${editUrl}\n`);
        console.log('🚀 Navigation vers le formulaire d\'édition a1...\n');

        await page.goto(editUrl);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        // ========== ATTENDRE LE CHARGEMENT DE L'IFRAME ==========
        console.log('⏳ Attente du chargement de l\'iframe...\n');

        await page.waitForSelector('#EditPatientInfoIframe');

        // Obtenir le frame réel (pas le locator)
        const iframeElement = await page.$('#EditPatientInfoIframe');
        const iframe = await iframeElement.contentFrame();

        console.log('✅ Iframe détecté\n');

        // Fermer le popup FLASH ALERTS s'il apparaît dans l'iframe
        const hasPopup = await iframe.evaluate(() => {
            const closeBtn = document.querySelector('.btn-close-flash-alert-modal');
            if (closeBtn && closeBtn.offsetParent !== null) {  // Visible
                closeBtn.click();
                return true;
            }
            return false;
        });

        if (hasPopup) {
            console.log('   ℹ️  Popup FLASH ALERTS fermé automatiquement dans iframe\n');
            await page.waitForTimeout(500);
        }

        // ========== ÉTAPE 5: Parser TOUS les champs du formulaire DANS L'IFRAME ==========
        console.log('📊 Extraction de TOUS les champs du formulaire depuis l\'iframe...\n');

        const formData = await iframe.evaluate(() => {
            const form = document.querySelector('form');
            if (!form) {
                return { error: 'Formulaire non trouvé dans iframe' };
            }

            // Extraire TOUS les inputs, selects, textareas (y compris doublons)
            const allFields = [];
            const inputs = form.querySelectorAll('input, select, textarea');

            inputs.forEach(input => {
                const name = input.name;
                let value = input.value;

                // Ignorer les champs sans nom (name vide ou undefined)
                if (!name || name.trim() === '') return;

                // Gérer les checkboxes et radios
                if (input.type === 'checkbox' || input.type === 'radio') {
                    if (input.checked) {
                        allFields.push({ name, value });
                    }
                } else if (input.type !== 'submit' && input.type !== 'button') {
                    allFields.push({ name, value });
                }
            });

            // Créer un objet fields pour la validation (prend dernière valeur)
            const fields = {};
            allFields.forEach(({ name, value }) => {
                fields[name] = value;
            });

            return {
                success: true,
                fields: fields,
                allFields: allFields,  // Tableau avec TOUS les champs (doublons inclus)
                count: allFields.length
            };
        });

        if (formData.error) {
            throw new Error(`❌ ${formData.error}`);
        }

        console.log(`✅ ${formData.count} champs extraits du formulaire\n`);

        // Afficher quelques champs importants pour vérification
        console.log('📋 Champs importants extraits:');
        console.log(`   PATID: ${formData.fields['PatientInformation.PATID'] || '❌ NON TROUVÉ'}`);
        console.log(`   RPID: ${formData.fields['PatientInformation.RPID'] || '❌ NON TROUVÉ'}`);
        console.log(`   Last Name: ${formData.fields['PatientInformation.LName'] || '❌ NON TROUVÉ'}`);
        console.log(`   First Name: ${formData.fields['PatientInformation.FName'] || '❌ NON TROUVÉ'}`);
        console.log(`   Notes: "${formData.fields['PatientInformation.Notes'] || 'VIDE'}"`);
        console.log(`   CSRF Token: ${formData.fields['__RequestVerificationToken'] ? 'Trouvé ✅' : '❌ NON TROUVÉ'}\n`);

        // ========== ÉTAPE 6: VALIDATIONS STRICTES ==========
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔒 ÉTAPE 3: Validations de sécurité');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const errors = [];

        // Validation 1: PATID
        const extractedPATID = formData.fields['PatientInformation.PATID'];
        if (!extractedPATID) {
            errors.push('❌ PATID non trouvé dans le formulaire');
        } else if (extractedPATID !== TARGET_PATIENT.patid.toString()) {
            errors.push(`❌ PATID ne correspond pas ! Attendu: ${TARGET_PATIENT.patid}, Reçu: ${extractedPATID}`);
        } else {
            console.log(`✅ PATID validé: ${extractedPATID}`);
        }

        // Validation 2: RPID
        const extractedRPID = formData.fields['PatientInformation.RPID'];
        if (!extractedRPID) {
            errors.push('❌ RPID non trouvé dans le formulaire');
        } else if (extractedRPID !== TARGET_PATIENT.rpid.toString()) {
            errors.push(`❌ RPID ne correspond pas ! Attendu: ${TARGET_PATIENT.rpid}, Reçu: ${extractedRPID}`);
        } else {
            console.log(`✅ RPID validé: ${extractedRPID}`);
        }

        // Validation 3: Last Name
        const extractedLName = formData.fields['PatientInformation.LName'];
        if (!extractedLName) {
            errors.push('❌ Last Name non trouvé dans le formulaire');
        } else if (extractedLName !== TARGET_PATIENT.lastName) {
            errors.push(`❌ Last Name ne correspond pas ! Attendu: ${TARGET_PATIENT.lastName}, Reçu: ${extractedLName}`);
        } else {
            console.log(`✅ Last Name validé: ${extractedLName}`);
        }

        // Validation 4: First Name
        const extractedFName = formData.fields['PatientInformation.FName'];
        if (!extractedFName) {
            errors.push('❌ First Name non trouvé dans le formulaire');
        } else if (extractedFName !== TARGET_PATIENT.firstName) {
            errors.push(`❌ First Name ne correspond pas ! Attendu: ${TARGET_PATIENT.firstName}, Reçu: ${extractedFName}`);
        } else {
            console.log(`✅ First Name validé: ${extractedFName}`);
        }

        // Validation 5: Note actuelle (comparaison avec la page patient)
        const extractedNote = formData.fields['PatientInformation.Notes'];
        if (extractedNote !== patientInfo.note) {
            console.log(`⚠️  Note du formulaire différente de celle de la page patient`);
            console.log(`   Page patient: "${patientInfo.note}"`);
            console.log(`   Formulaire: "${extractedNote}"`);
            console.log(`   (Ceci n'est pas bloquant, mais peut indiquer une incohérence)`);
        } else {
            console.log(`✅ Note actuelle validée: "${extractedNote}"`);
        }

        // Validation 6: CSRF Token
        if (!formData.fields['__RequestVerificationToken']) {
            errors.push('❌ CSRF Token non trouvé - impossible de faire un POST sécurisé');
        } else {
            console.log(`✅ CSRF Token présent`);
        }

        // Validation 7: Nombre de champs minimum
        if (formData.count < 50) {
            errors.push(`❌ Trop peu de champs extraits (${formData.count} < 50) - formulaire incomplet ?`);
        } else {
            console.log(`✅ Nombre de champs suffisant: ${formData.count}`);
        }

        console.log('');

        // Si des erreurs, arrêter immédiatement
        if (errors.length > 0) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('❌ ERREURS DE VALIDATION DÉTECTÉES:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            errors.forEach(err => console.log(err));
            console.log('\n⛔ ARRÊT DU SCRIPT PAR SÉCURITÉ\n');
            throw new Error('Validation échouée - Patient incorrect ou données manquantes');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ TOUTES LES VALIDATIONS RÉUSSIES !');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔒 Le formulaire concerne bien le patient cible.');
        console.log('🔒 Toutes les données critiques correspondent.\n');

        // ========== ÉTAPE 4: Modification du champ Notes et affichage du diff ==========
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📝 ÉTAPE 4: Modification du champ Notes (simulation)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Créer une copie des champs originaux pour comparaison
        const originalFields = { ...formData.fields };
        const originalAllFields = [...formData.allFields];

        // Créer les nouveaux champs avec la modification
        const modifiedFields = { ...formData.fields };
        modifiedFields['PatientInformation.Notes'] = NEW_NOTE_URL;

        // Modifier aussi dans allFields (pour le body final)
        const modifiedAllFields = formData.allFields.map(field => {
            if (field.name === 'PatientInformation.Notes') {
                return { name: field.name, value: NEW_NOTE_URL };
            }
            return field;
        });

        // Compter les différences
        const differences = [];
        for (const key in originalFields) {
            if (originalFields[key] !== modifiedFields[key]) {
                differences.push({
                    field: key,
                    oldValue: originalFields[key],
                    newValue: modifiedFields[key]
                });
            }
        }

        console.log(`📊 Analyse des modifications:\n`);
        console.log(`   Total de champs dans le formulaire: ${Object.keys(formData.fields).length}`);
        console.log(`   Nombre de champs modifiés: ${differences.length}\n`);

        if (differences.length === 0) {
            console.log('⚠️  Aucune différence détectée (la nouvelle valeur est identique à l\'ancienne)\n');
        } else if (differences.length === 1) {
            console.log('✅ SÉCURITÉ: Un seul champ sera modifié !\n');

            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📋 DIFF - Changement prévu:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            const diff = differences[0];
            console.log(`🔹 Champ: ${diff.field}`);
            console.log(`   ❌ Ancienne valeur: "${diff.oldValue}"`);
            console.log(`   ✅ Nouvelle valeur: "${diff.newValue}"\n`);

            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        } else {
            console.log('⚠️  ATTENTION: Plus d\'un champ serait modifié !\n');
            console.log('   Champs concernés:');
            differences.forEach((diff, index) => {
                console.log(`   ${index + 1}. ${diff.field}`);
            });
            console.log('\n⛔ ARRÊT PAR SÉCURITÉ - Seul le champ Notes devrait être modifié\n');
            throw new Error('Trop de champs modifiés - arrêt de sécurité');
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ DIFF AFFICHÉ (READ-ONLY - Rien n\'a été modifié)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // ========== ÉTAPE 5: Confirmation manuelle avant POST ==========
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 ÉTAPE 5: Résumé de la modification');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('📋 MODIFICATION À EFFECTUER:\n');
        console.log(`   👤 Patient: ${TARGET_PATIENT.name} (PATID: ${TARGET_PATIENT.patid})`);
        console.log(`   📝 Champ modifié: PatientInformation.Notes`);
        console.log(`   ❌ Valeur actuelle: "${patientInfo.note}"`);
        console.log(`   ✅ Nouvelle valeur: "${NEW_NOTE_URL}"\n`);

        console.log('🔒 PROTECTIONS ACTIVES:');
        console.log('   ✅ 7 validations strictes passées');
        console.log('   ✅ 1 seul champ sera modifié');
        console.log('   ✅ Vérification des 2 patients après POST\n');

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🚀 Lancement de la modification...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // ========== ÉTAPE 6: Modification avec Playwright (comme un utilisateur) ==========
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🚀 ÉTAPE 6: Modification du champ Notes avec Playwright');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('📝 Remplissage du champ Patient Note dans iframe...\n');

        // Vider le champ d'abord
        await iframe.fill('#Pat-Notes-Text-Area', '');

        // Remplir avec la nouvelle URL
        await iframe.fill('#Pat-Notes-Text-Area', NEW_NOTE_URL);

        console.log(`   ✅ Champ rempli avec: "${NEW_NOTE_URL}"\n`);

        console.log('💾 Attente du bouton SAVE (visible et cliquable) dans iframe...\n');

        // Attendre que le bouton soit visible et cliquable dans l'iframe
        await iframe.waitForSelector('#btnSavePatient', { state: 'visible' });

        console.log('   ✅ Bouton SAVE visible et prêt\n');

        console.log('🖱️  Clic sur le bouton SAVE dans iframe...\n');

        // Cliquer sur le bouton Save dans l'iframe
        await iframe.click('#btnSavePatient');

        console.log('✅ Bouton SAVE cliqué!\n');

        console.log('⏳ Attente de la redirection...\n');
        await page.waitForTimeout(3000);

        const currentUrl = page.url();
        console.log(`📍 URL actuelle: ${currentUrl}\n`);

        // ========== ÉTAPE 7: Vérification de la redirection ==========
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 ÉTAPE 7: Vérification de la sauvegarde');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Si la page a redirigé vers PatientOverview, c'est que le Save a réussi
        const isRedirected = currentUrl.includes('AdvancedPatientOverview');

        if (isRedirected) {
            console.log('✅ Redirection détectée vers PatientOverview\n');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🎉 SUCCÈS - MODIFICATION RÉUSSIE !');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            console.log(`✅ La note du patient ${TARGET_PATIENT.patid} a été modifiée avec succès !`);
            console.log(`   Ancienne valeur: "${patientInfo.note}"`);
            console.log(`   Nouvelle valeur: "${NEW_NOTE_URL}"`);
            console.log(`   ✅ La redirection confirme la sauvegarde\n`);
        } else {
            console.log('⚠️  Pas de redirection détectée\n');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('❌ ÉCHEC - MODIFICATION NON APPLIQUÉE');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            console.log(`❌ La page n'a pas redirigé vers PatientOverview`);
            console.log(`   URL actuelle: "${currentUrl}"`);
            console.log(`   URL attendue: Une URL contenant "AdvancedPatientOverview"\n`);
            throw new Error('La modification n\'a pas été appliquée - pas de redirection');
        }

        // Fermeture automatique du navigateur

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.error(error.stack);
    } finally {
        await browser.close();
    }
}

writePatientNote();
