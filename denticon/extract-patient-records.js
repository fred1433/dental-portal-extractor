/**
 * TEST EXTRACTION APPOINTMENTS DENTICON
 *
 * Teste la qualité des données récupérées depuis le calendrier a1
 * avec enrichissement (téléphones, DOB, procédures, etc.)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function testAppointmentsExtraction() {
    console.log('🔍 TEST EXTRACTION APPOINTMENTS DENTICON\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 100
    });

    const context = await browser.newContext({
        storageState: path.join(__dirname, '.denticon-session', 'storageState.json')
    });

    const page = await context.newPage();

    try {
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
                console.log('🚀 Reprise de l\'extraction...\n');
            } else {
                throw new Error(`❌ Reconnexion échouée - URL finale: ${finalUrl}`);
            }
        }

        console.log('✅ Session valide - Connecté !\n');

        // ========== EXTRACTION TOKEN DE SÉCURITÉ (dès le départ !) ==========
        console.log('🔑 Extraction du token de sécurité (depuis a1 home)...\n');
        const securityToken = await page.evaluate(() => {
            // Chercher dans les variables globales window
            if (window.SecurityToken) return window.SecurityToken;
            if (window.sessionToken) return window.sessionToken;
            if (window.powToken) return window.powToken;

            // Chercher dans les liens iframe vers c1
            const iframes = document.querySelectorAll('iframe[src*="c1.denticon.com"]');
            for (const iframe of iframes) {
                const src = iframe.getAttribute('src');
                const match = src?.match(/[?&]t=([^&]+)/);
                if (match) return decodeURIComponent(match[1]);
            }

            return null;
        });

        console.log(`   Token: ${securityToken ? securityToken.substring(0, 20) + '... ✅' : '❌ NON TROUVÉ'}\n`);
        console.log('🚀 Exécution du script d\'extraction (depuis page d\'accueil)...\n');

        // Injecter et exécuter le script d'extraction
        const results = await page.evaluate(async () => {
            try {
                const testDates = ['10/1/2025', '10/2/2025', '10/3/2025', '10/6/2025'];  // 4 jours ouvrés
                const maxPatientsTotal = 5;  // TEST: 5 patients - validation optimisation vitesse

                console.log('🎯 EXTRACTION COMPLÈTE : Calendrier + Détails');
                console.log(`📅 Dates: ${testDates.join(', ')}`);
                console.log(`📊 Objectif: ${maxPatientsTotal} patients\n`);

                let allAppointments = [];

            // ========== ÉTAPE 1: Calendrier (plusieurs dates) ==========
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📍 ÉTAPE 1: Extraction du calendrier (4 dates)');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            for (const testDate of testDates) {
                console.log(`📅 Extraction pour le ${testDate}...`);
                const schedUrl = `https://a1.denticon.com/aspx/appointments/getsched.aspx?sv=1&svid=&p=&o=106&date=${testDate}&q=s&cols=8&stcol=1&hipaa=f&prodview=t&quicksaveview=f&rn=${Date.now()}&stoid=&hideProviderTime=f`;

            try {
                const schedResponse = await fetch(schedUrl, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });

                if (schedResponse.status !== 200) {
                    throw new Error(`Calendrier erreur: ${schedResponse.status}`);
                }

                const html = await schedResponse.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const appointments = doc.querySelectorAll('div.appt');

                console.log(`   ✅ ${appointments.length} rendez-vous trouvés`);

                // Filtrer vrais patients
                appointments.forEach(appt => {
                    const pid = appt.getAttribute('pid');
                    const aid = appt.getAttribute('aid');
                    const patientName = appt.querySelector('.patn')?.textContent.trim();

                    if (pid && pid !== '0' && aid && patientName &&
                        !patientName.includes('READ, BLOCKS') &&
                        !patientName.includes('DR, KANG') &&
                        !patientName.includes('STAFFING')) {
                        allAppointments.push({
                            appointment_id: aid,
                            patient_id: pid,
                            patient_name: patientName,
                            time: appt.getAttribute('t'),
                            date: testDate
                        });
                    }
                });

            } catch (error) {
                console.error(`   ❌ Erreur pour ${testDate}:`, error.message);
            }
            }

            console.log(`\n📊 Total: ${allAppointments.length} rendez-vous sur ${testDates.length} jours`);

            const toProcess = allAppointments.slice(0, maxPatientsTotal);
            console.log(`👥 ${toProcess.length} rendez-vous à enrichir:\n`);

            // ========== ÉTAPE 2: Enrichissement ==========
                console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('📍 ÉTAPE 2: Enrichissement avec détails');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

                const enrichedData = [];

                for (let i = 0; i < toProcess.length; i++) {
                    const appt = toProcess[i];
                    console.log(`\n👤 Rendez-vous ${i+1}/${toProcess.length}`);
                    console.log(`   ${appt.patient_name} - ${appt.time}`);
                    console.log('   ─────────────────────────────────────');

                    const detailsUrl = `https://a1.denticon.com/ASPX/GetApptDetails.aspx?rnd=${Date.now()}&apptid=${appt.appointment_id}&oid=102&hipaa=f&act=det&zon=3&hideProviderTime=f`;

                    try {
                        const detailsResponse = await fetch(detailsUrl, {
                            method: 'POST',
                            headers: { 'X-Requested-With': 'XMLHttpRequest' }
                        });

                        if (detailsResponse.status === 200) {
                            const detailsHtml = await detailsResponse.text();

                            // Parser les données enrichies
                            const headerMatch = detailsHtml.match(/\((\d+) - ([MF]) - (\d+) yrs - ([\d\/]+)\)/);
                            const dob = headerMatch ? headerMatch[4] : null;

                            // Téléphones
                            const phoneMatch = detailsHtml.match(/W: ([^\<]+)<br>\s*H: ([^\<]+)<br>\s*C: ([^\<]+)/);
                            const phones = phoneMatch ? {
                                work: phoneMatch[1].trim(),
                                home: phoneMatch[2].trim(),
                                cell: phoneMatch[3].trim()
                            } : null;

                            // Procédures
                            const procedureMatches = detailsHtml.matchAll(/<td class=smalldata colspan=2 nowrap=nowrap>([D\d]+)<\/td>\s*<td class=smalldata colspan=6 nowrap=nowrap>([^<]+)<\/td>\s*<td class=smalldata colspan=2 align=right nowrap=nowrap>([\d.]+)<\/td>/g);
                            const procedures = [];
                            for (const match of procedureMatches) {
                                procedures.push({
                                    cdt_code: match[1].trim(),
                                    description: match[2].trim(),
                                    price: parseFloat(match[3])
                                });
                            }

                            // Totaux
                            const totalMatch = detailsHtml.match(/<i>Modified:<\/i>.*?<td class=smalldata[^>]*>([\d.]+)<\/td>/);
                            const total = totalMatch ? parseFloat(totalMatch[1]) : null;

                            const estPatMatch = detailsHtml.match(/Est\. Pat\.&nbsp;&nbsp;<\/td>\s*<td class=smalldata[^>]*>([\d.]+)<\/td>/);
                            const estPat = estPatMatch ? parseFloat(estPatMatch[1]) : null;

                            const enriched = {
                                ...appt,
                                date_of_birth: dob,
                                phone_work: phones?.work || 'N/A',
                                phone_home: phones?.home || 'N/A',
                                phone_cell: phones?.cell || 'N/A',
                                procedures_detailed: procedures,
                                total_amount: total,
                                estimated_patient: estPat
                            };

                            enrichedData.push(enriched);

                            console.log('   ✅ Données enrichies:');
                            console.log(`      DOB: ${dob || 'N/A'}`);
                            console.log(`      Cell: ${phones?.cell || 'N/A'}`);
                            console.log(`      Home: ${phones?.home || 'N/A'}`);
                            console.log(`      Work: ${phones?.work || 'N/A'}`);
                            console.log(`      Procédures: ${procedures.length}`);
                            procedures.forEach(p => console.log(`        - ${p.cdt_code}: ${p.description} ($${p.price})`));
                            console.log(`      Total: $${total || 0}`);
                            console.log(`      Est. Patient: $${estPat || 0}`);
                        }
                    } catch (error) {
                        console.error(`   ❌ Erreur: ${error.message}`);
                    }

                    // Pause entre requêtes
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('✅ EXTRACTION TERMINÉE');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

                return enrichedData;

            } catch (error) {
                console.error('❌ Erreur globale:', error);
                return null;
            }
        });

        // ========== PARTIE 2: EXTRACTION c1 ==========
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📍 PARTIE 2: Navigation vers c1 (insurance)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const c1StartTime = Date.now();
        await page.goto('https://c1.denticon.com/aspx/home/advancedmypage.aspx?chk=tls');
        const c1NavTime = Date.now() - c1StartTime;
        await page.waitForTimeout(2000);
        console.log(`✅ Sur c1.denticon.com (navigation: ${c1NavTime}ms + attente: 2000ms)\n`);

        const c1FetchStart = Date.now();
        const c1Results = await page.evaluate(async () => {
            const testDate = '10/2/2025';
            const fetchStart = Date.now();
            const url = `https://c1.denticon.com/EligibilityVerificationReport/GetPatientEligibilityTableData?PGID=3169&OID=102&APPTPRDR=ALL&APTDATE=${encodeURIComponent(testDate)}&ELIGSTATUS=ALL&_=${Date.now()}`;

            const response = await fetch(url, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            const data = await response.json();
            const fetchTime = Date.now() - fetchStart;
            console.log(`✅ c1 endpoint: ${data.tableData?.length || 0} patients (requête: ${fetchTime}ms)`);
            return data.tableData || [];
        });
        const c1TotalTime = Date.now() - c1FetchStart;
        console.log(`⏱️  Temps total c1 (fetch + parsing): ${c1TotalTime}ms`);

        console.log(`\n📧 Données c1 extraites: ${c1Results.length} patients\n`);

        // ========== PARTIE 3: FUSION a1 + c1 ==========
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📍 PARTIE 3: Fusion a1 + c1');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const merged = results.map(a1Patient => {
            // Chercher patient correspondant dans c1
            const c1Patient = c1Results.find(c1 => {
                const a1LastName = a1Patient.patient_name.split(',')[0].toLowerCase();
                return c1.PatName && c1.PatName.toLowerCase().includes(a1LastName);
            });

            return {
                ...a1Patient,
                // IDs
                rpid: c1Patient?.RPID || null,  // ← AJOUT DU RPID !
                // Contact
                email: c1Patient?.Email || null,
                cell_phone_c1: c1Patient?.CELLPHONE || null,
                // Assurance primaire
                primary_carrier: c1Patient?.PrimCarrName || null,
                primary_subscriber_id: c1Patient?.PrimSUBID || null,
                primary_subscriber_name: c1Patient?.PrimSubName || null,
                primary_subscriber_dob: c1Patient?.PrimSubBirthDateFormatted || null,
                primary_eligibility_status: c1Patient?.PrimEligStatus || null,
                primary_last_verified: c1Patient?.PrimLastVerifiedOnFormatted || null,
                primary_website: c1Patient?.PrimWEBSITE || null,
                primary_notes: c1Patient?.PrimINSNOTES || null,
                // Assurance secondaire
                secondary_carrier: c1Patient?.SecCarrName || null,
                secondary_subscriber_id: c1Patient?.SecSUBID || null,
                secondary_subscriber_name: c1Patient?.SecSubName || null,
                secondary_subscriber_dob: c1Patient?.SecSubBirthDateFormatted || null,
                secondary_eligibility_status: c1Patient?.SecEligStatus || null,
                secondary_last_verified: c1Patient?.SecLastVerifiedOnFormatted || null,
                // Provider
                provider_name: c1Patient?.ApptProviderName || null
            };
        });

        console.log(`✅ ${merged.length} patients fusionnés (a1 + c1)\n`);

        // ========== PARTIE 4: PATIENT OVERVIEW (Détails complets) ==========
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📍 PARTIE 4: Patient Overview (Détails complets)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // ✨ OPTIMISATION: Suppression du retour à a1 home (inutile - session déjà active)
        // La session a1 est maintenue même après visite de c1
        // On va directement vers les URLs Patient Overview spécifiques
        // await page.goto('https://a1.denticon.com/aspx/home/advancedmypage.aspx?chk=tls');
        // await page.waitForTimeout(2000);
        console.log('✅ Session a1 active (pas de retour home nécessaire)\n');

        const fullyEnriched = [];

        for (let i = 0; i < merged.length; i++) {
            const patient = merged[i];
            console.log(`\n👤 Patient ${i+1}/${merged.length}: ${patient.patient_name}`);
            console.log('   ─────────────────────────────────────');

            // URL de sélection du patient sur a1 (Patient Overview)
            const rpid = patient.rpid || patient.patient_id; // RPID depuis c1, sinon fallback sur patient_id

            // Construire l'URL Patient Overview sur a1 (comme manuellement)
            const selectionUrl = `https://a1.denticon.com/ASPX/Patients/AdvancedPatientOverview.aspx?patid=${patient.patient_id}&rpid=${rpid}&setfocus=true`;

            console.log(`   🔗 Sélection patient: PID=${patient.patient_id}, RPID=${rpid}`);
            await page.goto(selectionUrl);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(3000); // Timeout plus long pour a1

            // ========== DIAGNOSTIC: SAUVEGARDER HTML DE a1 ==========
            if (i === 0) { // Seulement pour le premier patient
                console.log('   📄 Sauvegarde HTML de a1 Patient Overview pour diagnostic...');

                const pageInfo = await page.evaluate(() => {
                    return {
                        url: window.location.href,
                        title: document.title,
                        html: document.documentElement.outerHTML
                    };
                });

                const debugPath = path.join(__dirname, 'debug-a1-patient-overview.html');
                fs.writeFileSync(debugPath, pageInfo.html);
                console.log(`   ✅ HTML sauvegardé: ${debugPath}`);
                console.log(`   📍 URL: ${pageInfo.url}`);
                console.log(`   📋 Title: ${pageInfo.title}`);

                // Screenshot aussi pour visualiser
                const screenshotPath = path.join(__dirname, 'debug-a1-patient-overview.png');
                await page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`   📸 Screenshot: ${screenshotPath}\n`);
            }

            // ========== ACCÈS À L'IFRAME C1 ==========
            // La page a1 Patient Overview est un wrapper contenant un iframe c1
            // Il faut accéder au contenu de l'iframe pour scraper les données

            console.log('   🔍 Recherche de l\'iframe Patient Overview...');

            // ✨ Optimisé: Court délai pour laisser l'iframe c1 se charger (2000ms → 800ms)
            await page.waitForTimeout(800);

            // Trouver l'iframe par son ID ou URL
            const frame = page.frame({ name: 'AdvancedPatientOverviewIFrame' }) ||
                          page.frame({ url: /c1\.denticon\.com/ });

            if (!frame) {
                console.error('   ❌ IFRAME NON TROUVÉ! Liste des frames:');
                const frames = page.frames();
                frames.forEach((f, idx) => {
                    console.log(`      Frame ${idx}: ${f.name()} - ${f.url()}`);
                });
                throw new Error('Iframe Patient Overview non trouvé');
            }

            console.log(`   ✅ Iframe trouvé: ${frame.url().substring(0, 80)}...`);

            // ✨ Smart wait: Attendre que l'iframe soit complètement chargé
            await frame.waitForLoadState('domcontentloaded');

            // Scraper Patient Overview depuis l'iframe
            const overviewData = await frame.evaluate(() => {
                try {
                    const doc = document; // DOM actuel au lieu de fetched HTML

                    // DEBUG: Vérifier si on a une erreur d'autorisation
                    const bodyText = doc.body.textContent;
                    if (bodyText.includes('not authorized') || bodyText.includes('Not Authorized')) {
                        console.log('   ❌ ERREUR: Not authorized detected!');
                        console.log('   📄 Body text (first 500 chars):', bodyText.substring(0, 500));
                        return { success: false, error: 'Not authorized - missing token or params' };
                    }

                    // ========== HELPERS ROBUSTES (inspirés ChatGPT-5 Pro) ==========

                    // Helper: extraire texte d'un élément
                    const getText = (selector) => {
                        const el = doc.querySelector(selector);
                        return el ? el.textContent.trim() : null;
                    };

                    // Helper: extraire attribut tooltip
                    const getTooltip = (selector, attr = 'data-custom-tooltip-data') => {
                        const el = doc.querySelector(selector);
                        return el ? el.getAttribute(attr) : null;
                    };

                    // Helper: extraire par LIBELLÉ (robuste aux changements CSS)
                    const byLabel = (label, containerSelector = '') => {
                        const container = containerSelector ? doc.querySelector(containerSelector) : doc;
                        if (!container) return null;

                        const labels = Array.from(container.querySelectorAll('div.label-inner'));
                        const labelEl = labels.find(el => el.textContent.trim() === label);
                        if (!labelEl) return null;

                        // Chercher la valeur dans la colonne suivante
                        const parentRow = labelEl.closest('.div-row');
                        if (!parentRow) return null;

                        const valueDivs = parentRow.querySelectorAll('.label-inner-value');
                        // Trouver l'index du label
                        const labelCols = parentRow.querySelectorAll('.label-inner');
                        const labelIndex = Array.from(labelCols).indexOf(labelEl);

                        return valueDivs[labelIndex]?.textContent.trim() || null;
                    };

                    // Helper: extraire ligne de table par libellé
                    const byTableRow = (rowLabel, containerSelector = '') => {
                        const container = containerSelector ? doc.querySelector(containerSelector) : doc;
                        if (!container) return null;

                        const rows = Array.from(container.querySelectorAll('table tbody tr'));
                        const row = rows.find(tr => {
                            const firstCell = tr.querySelector('td');
                            return firstCell && firstCell.textContent.trim() === rowLabel;
                        });

                        if (!row) return null;
                        const cells = Array.from(row.querySelectorAll('td'));
                        return cells.map(cell => cell.textContent.trim());
                    };

                    // ========== PATIENT DATE OF BIRTH (en haut de la page) ==========
                    // Format: "11 / Female 04/21/2014" ou "11/F 04/21/2014"
                    let patientDOB = null;

                    // Chercher dans la zone patient-basic-info ou patient-header
                    const patientInfoText = doc.body.textContent;

                    // Pattern 1: "Age / Gender MM/DD/YYYY"
                    const dobMatch1 = patientInfoText.match(/\d+\s*\/\s*(?:Female|Male|F|M)\s+(\d{2}\/\d{2}\/\d{4})/);
                    if (dobMatch1) {
                        patientDOB = dobMatch1[1];
                    } else {
                        // Pattern 2: Chercher directement dans les éléments de la page
                        // Le DOB est souvent dans un span ou div à côté du nom
                        const infoElements = Array.from(doc.querySelectorAll('span, div'));
                        for (const el of infoElements) {
                            const text = el.textContent.trim();
                            // Chercher pattern "MM/DD/YYYY" isolé
                            const dobMatch = text.match(/^(\d{2}\/\d{2}\/\d{4})$/);
                            if (dobMatch) {
                                patientDOB = dobMatch[1];
                                break;
                            }
                        }
                    }

                    // EMERGENCY CONTACT (dans tooltip)
                    const emergencyTooltip = getTooltip('a[data-custom-tooltip-title="Emergency Contact Information"]');
                    let emergencyContact = null;
                    let emergencyPhone = null;
                    if (emergencyTooltip) {
                        const nameMatch = emergencyTooltip.match(/<b>Emergency Contact: <\/b>([^<]+)/);
                        const phoneMatch = emergencyTooltip.match(/<b>Emergency Phone.*?: <\/b>([^<]+)/);
                        emergencyContact = nameMatch ? nameMatch[1].trim() : null;
                        emergencyPhone = phoneMatch ? phoneMatch[1].trim() : null;
                    }

                    // ========== ADRESSE (corrigé - capture APT + City/State/ZIP) ==========
                    const addressRows = doc.querySelectorAll('.address-div .label-inner-value');
                    const street = addressRows[0]?.textContent.trim() || null;
                    const apt = addressRows[1]?.textContent.trim() || null; // APT 101

                    // City/State/ZIP via byLabel
                    const cityStateZip = byLabel('City, State and Zip') || null;

                    // PATIENT INFO EXTENDED
                    const provider = getText('.patient-basic-info-div .col-lg-3:nth-child(2) .label-inner-value');
                    const hygienist = getText('.patient-basic-info-div .div-row:nth-child(2) .col-lg-3:nth-child(2) .label-inner-value');
                    const homeOffice = getText('.patient-basic-info-div .div-row:nth-child(3) .col-lg-3:nth-child(2) .label-inner-value');
                    const referralType = getText('.patient-basic-info-div .col-lg-3:nth-child(4) .label-inner-value');
                    const feeSchedule = getText('.patient-basic-info-div .div-row:nth-child(7) .col-lg-3:nth-child(4) .label-inner-value');
                    const patientNote = getText('.patient-notes .label-inner');

                    // MEDICAL ALERTS
                    const medicalAlertDateEl = doc.querySelector('.patient-medical-created-on');
                    const medicalAlertDate = medicalAlertDateEl ? medicalAlertDateEl.textContent.match(/\((.*?)\)/)?.[1] : null;
                    const medicalAlertContent = getText('.patient-medical-alert');

                    // DATES
                    const firstVisit = getText('.patient-basic-info-div .div-row:nth-child(4) .col-lg-3:nth-child(2) .label-inner-value');
                    const homePhone = getText('.patient-basic-info-div .div-row:nth-child(5) .col-lg-3:nth-child(2) .label-inner-value');
                    const workPhone = getText('.patient-basic-info-div .div-row:nth-child(6) .col-lg-3:nth-child(2) .label-inner-value');

                    // ========== RESPONSIBLE PARTY (corrigé - byLabel au lieu de colonnes) ==========
                    const rpContainer = '.resp-ins-info-container .patient-information-wrapper';
                    const rpName = byLabel('Name', rpContainer);
                    const rpCell = byLabel('Cell', rpContainer);
                    const rpId = byLabel('Resp ID', rpContainer);
                    const rpType = byLabel('Type', rpContainer);
                    const rpHomeOffice = byLabel('Home Office', rpContainer);

                    // Email (lien dans la valeur)
                    const rpEmailContainer = doc.querySelector(rpContainer);
                    const rpEmailLabel = Array.from(rpEmailContainer?.querySelectorAll('.label-inner') || [])
                        .find(el => el.textContent.trim() === 'Email');
                    const rpEmailRow = rpEmailLabel?.closest('.div-row');
                    const rpEmail = rpEmailRow?.querySelector('a')?.textContent.trim() || null;

                    // INSURANCE PRIMARY DENTAL
                    const primDentalCarrier = getText('#pri-sec-dental-ins .div-row:nth-child(2) .custom-col-40:nth-child(2) a');
                    const primDentalGroup = getText('#pri-sec-dental-ins .div-row:nth-child(3) .custom-col-40:nth-child(2) a');
                    const primDentalPhone = getText('#pri-sec-dental-ins .div-row:nth-child(4) .custom-col-40:nth-child(2) .label-inner-value');
                    const primDentalSubscriberRaw = getText('#pri-sec-dental-ins .div-row:nth-child(5) .custom-col-40:nth-child(2) .label-inner-value');

                    // Parser la relationship: "Reyes, Alex (Self)" → name + relationship
                    let primDentalSubscriberName = primDentalSubscriberRaw;
                    let primDentalRelationship = null;
                    if (primDentalSubscriberRaw) {
                        const relMatch = primDentalSubscriberRaw.match(/^(.+?)\s*\((.+?)\)\s*$/);
                        if (relMatch) {
                            primDentalSubscriberName = relMatch[1].trim();
                            primDentalRelationship = relMatch[2].trim(); // Self, Spouse, Child, Dependent, etc.
                        }
                    }

                    const primDentalMax = getText('#pri-sec-dental-ins .div-row:nth-child(6) .custom-col-40:nth-child(2) .label-inner-value');
                    const primDentalDed = getText('#pri-sec-dental-ins .div-row:nth-child(7) .custom-col-40:nth-child(2) .label-inner-value');

                    // INSURANCE SECONDARY DENTAL
                    const secDentalCarrier = getText('#pri-sec-dental-ins .div-row:nth-child(2) .custom-col-40:nth-child(3) a');
                    const secDentalGroup = getText('#pri-sec-dental-ins .div-row:nth-child(3) .custom-col-40:nth-child(3) a');
                    const secDentalSubscriberRaw = getText('#pri-sec-dental-ins .div-row:nth-child(5) .custom-col-40:nth-child(3) .label-inner-value');

                    // Parser la relationship secondaire
                    let secDentalSubscriberName = secDentalSubscriberRaw;
                    let secDentalRelationship = null;
                    if (secDentalSubscriberRaw) {
                        const relMatch = secDentalSubscriberRaw.match(/^(.+?)\s*\((.+?)\)\s*$/);
                        if (relMatch) {
                            secDentalSubscriberName = relMatch[1].trim();
                            secDentalRelationship = relMatch[2].trim();
                        }
                    }

                    // BALANCES
                    const balanceRows = doc.querySelectorAll('.balances-table tbody tr');
                    const accountBalance = {
                        current: null,
                        over30: null,
                        over60: null,
                        over90: null,
                        over120: null,
                        balance: null,
                        estPat: null,
                        estIns: null
                    };

                    if (balanceRows.length > 0) {
                        const acctRow = balanceRows[0];
                        const cells = acctRow.querySelectorAll('td');
                        if (cells.length >= 8) {
                            accountBalance.current = cells[1].textContent.trim();
                            accountBalance.over30 = cells[2].textContent.trim();
                            accountBalance.over60 = cells[3].textContent.trim();
                            accountBalance.over90 = cells[4].textContent.trim();
                            accountBalance.over120 = cells[5].textContent.trim();
                            accountBalance.balance = cells[6].textContent.trim();
                            accountBalance.estPat = cells[7].textContent.trim();
                            accountBalance.estIns = cells[8].textContent.trim();
                        }
                    }

                    // ========== BILLING INFO (corrigé - table Billing spécifique) ==========
                    // Trouver la section "BILLING" dans summary
                    const billingSection = Array.from(doc.querySelectorAll('#summary .col-lg-6'))
                        .find(section => section.textContent.includes('BILLING'));

                    let lastPatPay = null, lastPatPayDate = null;
                    let lastInsPay = null, lastInsPayDate = null;

                    if (billingSection) {
                        const billingRows = billingSection.querySelectorAll('table tbody tr');
                        billingRows.forEach(row => {
                            const cells = row.querySelectorAll('td');
                            if (cells.length >= 3) {
                                const label = cells[0].textContent.trim();
                                if (label === 'Last Pat Pay') {
                                    lastPatPay = cells[1].textContent.trim();
                                    lastPatPayDate = cells[2].textContent.trim();
                                } else if (label === 'Last Ins Pay') {
                                    lastInsPay = cells[1].textContent.trim();
                                    lastInsPayDate = cells[2].textContent.trim();
                                }
                            }
                        });
                    }

                    // APPOINTMENTS (tous)
                    const apptRows = doc.querySelectorAll('.appointments-table tbody tr');
                    const appointments = [];
                    apptRows.forEach(row => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 8) {
                            appointments.push({
                                date: cells[0].textContent.trim(),
                                time: cells[1].textContent.trim(),
                                office: cells[2].textContent.trim(),
                                operatory: cells[3].textContent.trim(),
                                provider: cells[4].textContent.trim(),
                                duration: cells[5].textContent.trim(),
                                status: cells[6].textContent.trim(),
                                last_updated: cells[7].textContent.trim()
                            });
                        }
                    });

                    // RECALLS
                    const recallRows = doc.querySelectorAll('.recalls-table tbody tr');
                    const recalls = [];
                    recallRows.forEach(row => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 6) {
                            recalls.push({
                                code: cells[0].textContent.trim(),
                                interval: cells[1].textContent.trim(),
                                recall_date: cells[2].textContent.trim(),
                                reason: cells[3].textContent.trim(),
                                schedule_date: cells[4].textContent.trim(),
                                schedule_time: cells[5].textContent.trim()
                            });
                        }
                    });

                    return {
                        success: true,
                        date_of_birth_overview: patientDOB,  // DOB scraped depuis Patient Overview
                        emergency_contact: emergencyContact,
                        emergency_phone: emergencyPhone,
                        address_street: street,
                        address_apt: apt,
                        address_city_state_zip: cityStateZip,
                        provider_extended: provider,
                        hygienist: hygienist,
                        home_office: homeOffice,
                        referral_type: referralType,
                        fee_schedule: feeSchedule,
                        patient_note: patientNote,
                        medical_alert_date: medicalAlertDate,
                        medical_alert_content: medicalAlertContent,
                        first_visit: firstVisit,
                        phone_home_extended: homePhone,
                        phone_work_extended: workPhone,
                        responsible_party_name: rpName,
                        responsible_party_id: rpId,
                        responsible_party_type: rpType,
                        responsible_party_cell: rpCell,
                        responsible_party_email: rpEmail,
                        responsible_party_home_office: rpHomeOffice,
                        insurance_primary_dental_carrier: primDentalCarrier,
                        insurance_primary_dental_group: primDentalGroup,
                        insurance_primary_dental_phone: primDentalPhone,
                        insurance_primary_dental_subscriber_name: primDentalSubscriberName,
                        insurance_primary_dental_relationship: primDentalRelationship,
                        insurance_primary_dental_max: primDentalMax,
                        insurance_primary_dental_ded: primDentalDed,
                        insurance_secondary_dental_carrier: secDentalCarrier,
                        insurance_secondary_dental_group: secDentalGroup,
                        insurance_secondary_dental_subscriber_name: secDentalSubscriberName,
                        insurance_secondary_dental_relationship: secDentalRelationship,
                        balance_account: accountBalance,
                        last_patient_payment: lastPatPay,
                        last_patient_payment_date: lastPatPayDate,
                        last_insurance_payment: lastInsPay,
                        last_insurance_payment_date: lastInsPayDate,
                        appointments_all: appointments,
                        recalls_all: recalls
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            if (overviewData.success) {
                console.log('   ✅ Données Patient Overview extraites:');
                console.log(`      DOB (Overview): ${overviewData.date_of_birth_overview || 'NULL'}`);
                console.log(`      Emergency: ${overviewData.emergency_contact || 'N/A'} (${overviewData.emergency_phone || 'N/A'})`);
                console.log(`      Adresse: ${overviewData.address_street || 'N/A'}, ${overviewData.address_city_state_zip || 'N/A'}`);
                console.log(`      Provider: ${overviewData.provider_extended || 'N/A'}`);
                console.log(`      Hygienist: ${overviewData.hygienist || 'N/A'}`);
                console.log(`      Home Office: ${overviewData.home_office || 'N/A'}`);
                console.log(`      Medical Alert: ${overviewData.medical_alert_date || 'N/A'}`);
                console.log(`      Balance: ${overviewData.balance_account?.balance || 'N/A'}`);
                console.log(`      Appointments (total): ${overviewData.appointments_all?.length || 0}`);
                console.log(`      Recalls: ${overviewData.recalls_all?.length || 0}`);

                // ========== PRIMARY INSURANCE SCRAPING ==========
                let primaryData = null;
                const hasInsurance = overviewData.insurance_primary_dental_carrier || patient.primary_carrier;

                if (hasInsurance) {
                    console.log('   🔍 Scraping Primary Insurance page...');

                    try {
                        // Navigation DIRECTE vers Primary Insurance
                        const primaryUrl = 'https://a1.denticon.com/aspx/Patients/AdvancedEditPatientInsurance.aspx?planType=D&insType=P';

                        // ✨ Smart wait: domcontentloaded au lieu de networkidle (plus rapide)
                        await page.goto(primaryUrl, { waitUntil: 'domcontentloaded' });

                        // ✨ Optimisé: Court délai pour laisser l'iframe c1 se charger (3000ms → 1200ms)
                        await page.waitForTimeout(1200);

                        // ========== DIAGNOSTIC: SAUVEGARDER HTML PRIMARY INSURANCE ==========
                        if (i === 0) { // Seulement pour le premier patient
                            console.log('   📄 Sauvegarde HTML Primary Insurance APRÈS attente pour diagnostic...');

                            const fullPageHTML = await page.evaluate(() => {
                                return {
                                    url: window.location.href,
                                    title: document.title,
                                    html: document.documentElement.outerHTML
                                };
                            });

                            const debugPrimaryPath = path.join(__dirname, 'debug-primary-insurance-after-wait.html');
                            fs.writeFileSync(debugPrimaryPath, fullPageHTML.html);
                            console.log(`   ✅ HTML Primary (after wait) sauvegardé: ${debugPrimaryPath}`);

                            const screenshotPrimaryPath = path.join(__dirname, 'debug-primary-insurance-after-wait.png');
                            await page.screenshot({ path: screenshotPrimaryPath, fullPage: true });
                            console.log(`   📸 Screenshot Primary (after wait): ${screenshotPrimaryPath}\n`);
                        }

                        // ========== ACCÈS À L'IFRAME PRIMARY INSURANCE ==========
                        // Exactement comme Patient Overview, Primary Insurance utilise un iframe!
                        console.log('   🔍 Recherche de l\'iframe Primary Insurance...');

                        // Lister tous les frames
                        const allFrames = page.frames();
                        console.log(`   📦 Total frames: ${allFrames.length}`);
                        allFrames.forEach((f, idx) => {
                            console.log(`      Frame ${idx}: ${f.url().substring(0, 100)}`);
                        });

                        // Trouver l'iframe qui contient le formulaire Primary Insurance
                        // Il peut avoir une URL différente ou être un about:blank avec contenu injecté
                        let primaryFrame = null;

                        // Essayer de trouver le frame par contenu
                        for (const frame of allFrames) {
                            try {
                                const hasData = await frame.evaluate(() => {
                                    return document.body && document.body.textContent.includes('PLAN ID');
                                });
                                if (hasData) {
                                    primaryFrame = frame;
                                    console.log(`   ✅ Frame Primary trouvé (par contenu): ${frame.url().substring(0, 80)}...`);
                                    break;
                                }
                            } catch (e) {
                                // Frame inaccessible, continuer
                            }
                        }

                        if (!primaryFrame) {
                            console.log('   ❌ Frame Primary non trouvé');
                            throw new Error('Primary Insurance iframe non trouvé');
                        }

                        // ✨ Smart wait: Attendre que l'iframe soit complètement chargé
                        await primaryFrame.waitForLoadState('domcontentloaded');

                        // Scraper depuis l'iframe
                        primaryData = await primaryFrame.evaluate(() => {
                                const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || null;
                                const getValue = (sel) => document.querySelector(sel)?.value?.trim() || null;

                                return {
                                    // PLAN INFO
                                    primary_plan_id: getText('#showPlanID'),
                                    primary_group_number: getText('#showCarrierGroup') || getValue('#inputCarrierGroup'),

                                    // CARRIER
                                    primary_carrier_name: getText('#carrierName'),
                                    primary_carrier_address1: getText('#carrierAddr1'),
                                    primary_carrier_address2: getText('#carrierAddr2'),
                                    primary_carrier_address3: getText('#carrierAddr3'),
                                    primary_payer_id: getText('#payerID'),
                                    primary_carrier_id: getText('#carrierID'),
                                    primary_carrier_type: getText('#cType'),
                                    primary_carrier_phone: getText('#carrierPhone'),

                                    // EMPLOYER
                                    primary_employer_name: getText('#empName'),
                                    primary_employer_address1: getText('#empAddr1'),
                                    primary_employer_address2: getText('#empAddr2'),
                                    primary_employer_address3: getText('#empAddr3'),

                                    // SUBSCRIBER INFORMATION
                                    primary_subscriber_id_primary: getValue('#subIdValue'),
                                    primary_subscriber_last_name: getValue('#subLastName'),
                                    primary_subscriber_first_name: getValue('#subFirstName'),
                                    primary_subscriber_dob_primary: getValue('#subBirthDate'),
                                    primary_subscriber_sex: getValue('#subscriberSexInfoDropdown'),
                                    primary_subscriber_address: getValue('#subAddr'),
                                    primary_subscriber_address2: getValue('#subAddr2'),
                                    primary_subscriber_city: getValue('#subCity'),
                                    primary_subscriber_state: getValue('#STATE'),
                                    primary_subscriber_zip: getValue('#ZIP'),
                                    primary_subscriber_marital_status: getValue('#subscriberMaritalStatusInfoDropdown'),
                                    primary_subscriber_relationship_primary: getValue('#subscriberRelationInfoDropdown'),
                                    primary_subscriber_phone: getValue('#Number'),

                                    // ELIGIBILITY
                                    primary_effective_date_sub: getValue('#subEffectiveDate'),
                                    primary_term_date_sub: getValue('#subTermDate'),
                                    primary_anniversary_date: getText('#annivDate'),
                                    primary_eligibility_status_primary: getText('#currEligibilityStat'),
                                    primary_eligibility_verified_on: getText('#currEligibilityDateDiv'),
                                    primary_eligibility_verified_by: getText('#currEligibilityUser'),

                                    // BENEFIT INFO
                                    primary_deductible_ind: getText('#txtIndDed'),
                                    primary_deductible_ind_rem: getValue('#txtIndDedRem'),
                                    primary_deductible_fam: getText('#txtFamDed'),
                                    primary_deductible_fam_rem: getValue('#txtFamDedRem'),
                                    primary_annual_max_ind: getText('#txtIndMax'),
                                    primary_annual_max_ind_rem: getValue('#txtIndMaxRem'),
                                    primary_annual_max_fam: getText('#txtFamMax'),
                                    primary_annual_max_fam_rem: getValue('#txtFamMaxRem'),
                                    primary_ortho_ind: getText('#txtIndOrthoMax'),
                                    primary_ortho_ind_rem: getValue('#txtIndOrthoMaxRem')
                                };
                            });

                        console.log('   ✅ Primary Insurance scraped:');
                        console.log(`      Subscriber ID: ${primaryData.primary_subscriber_id_primary || 'NULL'}`);
                        console.log(`      Subscriber DOB: ${primaryData.primary_subscriber_dob_primary || 'NULL'}`);
                        console.log(`      Payer ID: ${primaryData.primary_payer_id || 'NULL'}`);
                        console.log(`      Employer: ${primaryData.primary_employer_name || 'NULL'}`);
                        console.log(`      Relationship: ${primaryData.primary_subscriber_relationship_primary || 'NULL'}`);

                    } catch (error) {
                        console.error(`   ❌ Erreur Primary scraping: ${error.message}`);
                    }
                } else {
                    console.log('   ⏭️  Pas d\'assurance - skip Primary scraping');
                }

                // Fusionner TOUTES les données
                fullyEnriched.push({
                    ...patient,
                    ...overviewData,
                    ...primaryData,
                    // ✨ Fusion intelligente DOB: utiliser Overview DOB si Appointment DOB manquant
                    date_of_birth: patient.date_of_birth || overviewData.date_of_birth_overview || null
                });

            } else {
                console.log(`   ❌ Erreur: ${overviewData.error}`);
                fullyEnriched.push(patient);
            }

            // ✨ Optimisé: Pause réduite entre patients (500ms → 200ms)
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log(`\n✅ ${fullyEnriched.length} patients avec données complètes (a1 + c1 + overview)\n`);

        // Afficher les résultats dans Node.js
        console.log('\n📊 RÉSULTATS FINAUX:\n');
        console.log(`✅ ${fullyEnriched?.length || 0} patients extraits avec succès (4 sources: a1 + c1 + overview)\n`);

        if (fullyEnriched && fullyEnriched.length > 0) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📋 RÉSUMÉ PAR PATIENT (Données complètes):');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            fullyEnriched.forEach((patient, i) => {
                console.log(`${i + 1}. ${patient.patient_name}`);
                console.log(`   📅 DOB: ${patient.date_of_birth}`);
                console.log(`   📱 Cell: ${patient.phone_cell} | Home: ${patient.phone_home_extended || 'N/A'} | Work: ${patient.phone_work_extended || 'N/A'}`);
                console.log(`   ✉️  Email: ${patient.email || 'N/A'}`);
                console.log(`   🏠 Adresse: ${patient.address_street || 'N/A'}, ${patient.address_city_state_zip || 'N/A'}`);
                console.log(`   🚨 Emergency: ${patient.emergency_contact || 'N/A'} (${patient.emergency_phone || 'N/A'})`);
                console.log(`   👨‍⚕️ Provider: ${patient.provider_extended || patient.provider_name || 'N/A'}`);
                console.log(`   🦷 Hygienist: ${patient.hygienist || 'N/A'}`);
                console.log(`   🏢 Office: ${patient.home_office || 'N/A'}`);
                console.log(`   💳 PRIMARY INS: ${patient.insurance_primary_dental_carrier || patient.primary_carrier || 'N/A'}`);
                console.log(`      Group: ${patient.insurance_primary_dental_group || 'N/A'} | Max: ${patient.insurance_primary_dental_max || 'N/A'}`);
                if (patient.insurance_secondary_dental_carrier || patient.secondary_carrier) {
                    console.log(`   💳 SECONDARY INS: ${patient.insurance_secondary_dental_carrier || patient.secondary_carrier || 'N/A'}`);
                }
                console.log(`   💰 Balance: ${patient.balance_account?.balance || 'N/A'} | Last Pay: ${patient.last_patient_payment || 'N/A'} (${patient.last_patient_payment_date || 'N/A'})`);
                console.log(`   📆 Appointments: ${patient.appointments_all?.length || 0} total | Recalls: ${patient.recalls_all?.length || 0}`);
                console.log(`   🩺 Medical Alert: ${patient.medical_alert_date || 'N/A'}`);
                console.log(`   📝 RDV du jour: ${patient.time} | Procédures: ${patient.procedures_detailed.length} | Total: $${patient.total_amount || 0}`);
                console.log('');
            });

            // Sauvegarder en JSON
            const outputFile = path.join(__dirname, 'test-results-appointments.json');
            fs.writeFileSync(outputFile, JSON.stringify(fullyEnriched, null, 2));
            console.log(`💾 Résultats sauvegardés: ${outputFile}\n`);
        }

        // ========== ÉVALUATION QUALITÉ ==========
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 ÉVALUATION QUALITÉ DES DONNÉES (4 SOURCES)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        let stats = {
            total: fullyEnriched.length,
            // a1 (appointments)
            with_dob: 0,
            with_cell: 0,
            with_home: 0,
            with_work: 0,
            with_any_phone: 0,
            with_procedures: 0,
            with_total_amount: 0,
            // c1 (insurance)
            with_email: 0,
            with_carrier: 0,
            with_subscriber_id: 0,
            with_provider: 0,
            with_secondary_ins: 0,
            with_eligibility_status: 0,
            matched_c1: 0,
            // overview (détails complets)
            with_address: 0,
            with_emergency_contact: 0,
            with_medical_alert: 0,
            with_balance: 0,
            with_last_payment: 0,
            with_home_office: 0,
            with_hygienist: 0,
            with_appointments_history: 0,
            with_recalls: 0,
            // Complétude
            complete_a1: 0,  // DOB + cell + procedures
            complete_c1: 0,  // email + carrier + subscriber_id
            complete_overview: 0,  // address + emergency
            complete_all: 0  // a1 + c1 + overview complet
        };

        fullyEnriched.forEach(p => {
            // a1
            if (p.date_of_birth) stats.with_dob++;
            if (p.phone_cell && p.phone_cell !== 'NA' && p.phone_cell !== 'N/A') stats.with_cell++;
            if (p.phone_home && p.phone_home !== 'NA' && p.phone_home !== 'N/A') stats.with_home++;
            if (p.phone_work && p.phone_work !== 'NA' && p.phone_work !== 'N/A') stats.with_work++;
            if ((p.phone_cell && p.phone_cell !== 'NA') ||
                (p.phone_home && p.phone_home !== 'NA') ||
                (p.phone_work && p.phone_work !== 'NA')) stats.with_any_phone++;
            if (p.procedures_detailed && p.procedures_detailed.length > 0) stats.with_procedures++;
            if (p.total_amount && p.total_amount > 0) stats.with_total_amount++;

            // c1
            if (p.email) stats.with_email++;
            if (p.primary_carrier) stats.with_carrier++;
            if (p.primary_subscriber_id) stats.with_subscriber_id++;
            if (p.provider_name) stats.with_provider++;
            if (p.secondary_carrier) stats.with_secondary_ins++;
            if (p.primary_eligibility_status && p.primary_eligibility_status !== 'Unknown') stats.with_eligibility_status++;
            if (p.email || p.primary_carrier || p.primary_subscriber_id) stats.matched_c1++;

            // overview
            if (p.address_street) stats.with_address++;
            if (p.emergency_contact) stats.with_emergency_contact++;
            if (p.medical_alert_date) stats.with_medical_alert++;
            if (p.balance_account?.balance) stats.with_balance++;
            if (p.last_patient_payment) stats.with_last_payment++;
            if (p.home_office) stats.with_home_office++;
            if (p.hygienist) stats.with_hygienist++;
            if (p.appointments_all && p.appointments_all.length > 0) stats.with_appointments_history++;
            if (p.recalls_all && p.recalls_all.length > 0) stats.with_recalls++;

            // Complétude
            const hasA1 = p.date_of_birth &&
                         (p.phone_cell && p.phone_cell !== 'NA') &&
                         p.procedures_detailed && p.procedures_detailed.length > 0;
            const hasC1 = p.email && p.primary_carrier && p.primary_subscriber_id;
            const hasOverview = p.address_street && p.emergency_contact;

            if (hasA1) stats.complete_a1++;
            if (hasC1) stats.complete_c1++;
            if (hasOverview) stats.complete_overview++;
            if (hasA1 && hasC1 && hasOverview) stats.complete_all++;
        });

        const pct = (val) => ((val / stats.total) * 100).toFixed(1);

        console.log('📋 SOURCE 1 - a1 (Appointments):');
        console.log(`   DOB               : ${stats.with_dob}/${stats.total} (${pct(stats.with_dob)}%)`);
        console.log(`   Téléphone cell    : ${stats.with_cell}/${stats.total} (${pct(stats.with_cell)}%)`);
        console.log(`   Téléphone home    : ${stats.with_home}/${stats.total} (${pct(stats.with_home)}%)`);
        console.log(`   Téléphone work    : ${stats.with_work}/${stats.total} (${pct(stats.with_work)}%)`);
        console.log(`   Au moins 1 tél    : ${stats.with_any_phone}/${stats.total} (${pct(stats.with_any_phone)}%)`);
        console.log(`   Procédures        : ${stats.with_procedures}/${stats.total} (${pct(stats.with_procedures)}%)`);
        console.log(`   Montant total     : ${stats.with_total_amount}/${stats.total} (${pct(stats.with_total_amount)}%)`);

        console.log('\n📧 SOURCE 2 - c1 (Insurance):');
        console.log(`   Email                : ${stats.with_email}/${stats.total} (${pct(stats.with_email)}%)`);
        console.log(`   Primary Carrier      : ${stats.with_carrier}/${stats.total} (${pct(stats.with_carrier)}%)`);
        console.log(`   Primary Subscriber ID: ${stats.with_subscriber_id}/${stats.total} (${pct(stats.with_subscriber_id)}%)`);
        console.log(`   Provider Name        : ${stats.with_provider}/${stats.total} (${pct(stats.with_provider)}%)`);
        console.log(`   Secondary Insurance  : ${stats.with_secondary_ins}/${stats.total} (${pct(stats.with_secondary_ins)}%)`);
        console.log(`   Eligibility Status   : ${stats.with_eligibility_status}/${stats.total} (${pct(stats.with_eligibility_status)}%)`);
        console.log(`   Match c1 trouvé      : ${stats.matched_c1}/${stats.total} (${pct(stats.matched_c1)}%)`);

        console.log('\n🏥 SOURCE 3 - Patient Overview (Détails complets):');
        console.log(`   Adresse complète        : ${stats.with_address}/${stats.total} (${pct(stats.with_address)}%)`);
        console.log(`   Contact urgence         : ${stats.with_emergency_contact}/${stats.total} (${pct(stats.with_emergency_contact)}%)`);
        console.log(`   Alertes médicales       : ${stats.with_medical_alert}/${stats.total} (${pct(stats.with_medical_alert)}%)`);
        console.log(`   Balance/AR              : ${stats.with_balance}/${stats.total} (${pct(stats.with_balance)}%)`);
        console.log(`   Dernier paiement        : ${stats.with_last_payment}/${stats.total} (${pct(stats.with_last_payment)}%)`);
        console.log(`   Home Office             : ${stats.with_home_office}/${stats.total} (${pct(stats.with_home_office)}%)`);
        console.log(`   Hygiéniste              : ${stats.with_hygienist}/${stats.total} (${pct(stats.with_hygienist)}%)`);
        console.log(`   Historique RDV complet  : ${stats.with_appointments_history}/${stats.total} (${pct(stats.with_appointments_history)}%)`);
        console.log(`   Recalls programmés      : ${stats.with_recalls}/${stats.total} (${pct(stats.with_recalls)}%)`);

        console.log('\n🎯 COMPLÉTUDE GLOBALE:');
        console.log(`   a1 complet (DOB+Tel+Proc)         : ${stats.complete_a1}/${stats.total} (${pct(stats.complete_a1)}%)`);
        console.log(`   c1 complet (Email+Carr+SubID)     : ${stats.complete_c1}/${stats.total} (${pct(stats.complete_c1)}%)`);
        console.log(`   Overview complet (Addr+Emergency) : ${stats.complete_overview}/${stats.total} (${pct(stats.complete_overview)}%)`);
        console.log(`   TOUT complet (a1+c1+overview)     : ${stats.complete_all}/${stats.total} (${pct(stats.complete_all)}%)`);

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ TEST TERMINÉ');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await browser.close();
    }
}

testAppointmentsExtraction();
