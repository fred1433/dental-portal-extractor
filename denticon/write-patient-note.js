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
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ==================== CONFIGURATION DES PATIENTS TEST ====================
const TEST_PATIENTS = {
    PATIENT_TEST: {
        name: 'Patient, Test',
        lastName: 'Patient',
        firstName: 'Test',
        patid: 2000084,
        rpid: 2000084,
        currentNote: 'ZXYZUNIQUE123',
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
        currentNote: 'test',
        dob: '05/21/1994',
        age: 31,
        sex: 'F'
    }
};

// ========== SÉLECTIONNER LE PATIENT CIBLE (MODIFIER ICI) ==========
const TARGET_PATIENT = TEST_PATIENTS.PATIENT_TEST;  // ← Change manuellement pour tester
const NEW_NOTE_URL = `https://example.com/patient-data/${TARGET_PATIENT.patid}`;

// =======================================================================

async function writePatientNote() {
    console.log('📝 WRITE PATIENT NOTE - Script sécurisé\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎯 Patient cible:');
    console.log(`   Nom: ${TARGET_PATIENT.name}`);
    console.log(`   PATID: ${TARGET_PATIENT.patid}`);
    console.log(`   RPID: ${TARGET_PATIENT.rpid}`);
    console.log(`   Note actuelle: "${TARGET_PATIENT.currentNote}"`);
    console.log(`   Nouvelle URL: "${NEW_NOTE_URL}"\n`);

    const browser = await chromium.launch({
        headless: false,
        slowMo: 100
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
        await page.waitForTimeout(2000);

        // ========== ÉTAPE 4: Vérification et affichage ==========
        console.log('📊 Extraction des informations patient...\n');

        const patientInfo = await page.evaluate(() => {
            const doc = document;

            // Vérifier erreur d'autorisation
            const bodyText = doc.body.textContent;
            if (bodyText.includes('not authorized') || bodyText.includes('Not Authorized')) {
                return { error: 'Not authorized - missing token or params' };
            }

            // Helper
            const getText = (selector) => {
                const el = doc.querySelector(selector);
                return el ? el.textContent.trim() : null;
            };

            // Extraire infos
            const patientName = getText('.patient-name-container .patient-name');
            const patientId = getText('.patient-name-container .patient-id-label');
            const patientNote = getText('.patient-notes .label-inner');

            return {
                success: true,
                name: patientName,
                id: patientId,
                note: patientNote
            };
        });

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

        // ========== ÉTAPE 4: Navigation vers EditPatientInfo ==========
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📝 ÉTAPE 2: Navigation vers EditPatientInfo');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const editUrl = `https://c1.denticon.com/EditPatientInfo/Index?patid=${TARGET_PATIENT.patid}&rpid=${TARGET_PATIENT.rpid}`;
        console.log(`🔗 URL EditPatientInfo: ${editUrl.substring(0, 80)}...\n`);
        console.log('🚀 Navigation vers le formulaire d\'édition...\n');

        await page.goto(editUrl);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        // ========== ÉTAPE 5: Parser TOUS les champs du formulaire ==========
        console.log('📊 Extraction de TOUS les champs du formulaire...\n');

        const formData = await page.evaluate(() => {
            const form = document.querySelector('form');
            if (!form) {
                return { error: 'Formulaire non trouvé' };
            }

            const formDataObj = new FormData(form);
            const fields = {};
            let count = 0;

            for (const [key, value] of formDataObj.entries()) {
                fields[key] = value;
                count++;
            }

            // Aussi extraire le token CSRF s'il est dans un input hidden
            const csrfInput = document.querySelector('input[name="__RequestVerificationToken"]');
            if (csrfInput) {
                fields['__RequestVerificationToken'] = csrfInput.value;
            }

            return {
                success: true,
                fields: fields,
                count: count
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

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ PARSING TERMINÉ (READ-ONLY - Rien n\'a été modifié)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('⏸️  Le navigateur reste ouvert pour vérification visuelle.');
        console.log('   Appuyez sur Entrée pour fermer...');

        // Attendre input utilisateur
        await new Promise(resolve => {
            process.stdin.once('data', resolve);
        });

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.error(error.stack);
    } finally {
        await browser.close();
    }
}

writePatientNote();
