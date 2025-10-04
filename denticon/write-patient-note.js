/**
 * TEST NAVIGATION PATIENT TEST
 *
 * Script READ-ONLY pour tester la navigation vers le patient test
 * PATID: 2000084 (Patient, Test)
 *
 * NE MODIFIE RIEN - Juste lecture et affichage
 */

const { chromium } = require('playwright');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function testNavigateToPatient() {
    console.log('🔍 TEST NAVIGATION PATIENT TEST\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ========== IDs HARDCODÉS (Patient Test) ==========
    const TEST_PATIENT_ID = 2000084;
    const TEST_RP_ID = 2000084;
    console.log('🎯 Patient cible:');
    console.log(`   PATID: ${TEST_PATIENT_ID}`);
    console.log(`   RPID: ${TEST_RP_ID}`);
    console.log(`   Nom: Patient, Test\n`);

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
        const selectionUrl = `https://c1.denticon.com/?pgid=3169&patid=${TEST_PATIENT_ID}&oid=102&uid=DENTISTRYAUTO&rpid=${TEST_RP_ID}&ckey=cnPrm&pagename=PatientOverview&ts=${timestamp}&ShowPicture=True&referral=3&IsLaunchFlashAlert=1&t=${encodeURIComponent(securityToken)}`;

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

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ TEST TERMINÉ (READ-ONLY - Rien n\'a été modifié)');
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

testNavigateToPatient();
