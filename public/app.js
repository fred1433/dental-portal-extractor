"use strict";
function isInputElement(element) {
    return element !== null && element instanceof HTMLInputElement;
}
function isSelectElement(element) {
    return element !== null && element instanceof HTMLSelectElement;
}
function isFormElement(element) {
    return element !== null && element instanceof HTMLFormElement;
}
function safeGetElement(id) {
    return document.getElementById(id);
}
function safeSetValue(id, value) {
    const element = safeGetElement(id);
    if (element && isInputElement(element)) {
        element.value = value;
    }
}
function safeGetValue(id) {
    const element = safeGetElement(id);
    if (element && isInputElement(element)) {
        return element.value;
    }
    if (element && isSelectElement(element)) {
        return element.value;
    }
    return '';
}
function safeSetHTML(id, html) {
    const element = safeGetElement(id);
    if (element) {
        element.innerHTML = html;
    }
}
function safeShow(id) {
    const element = safeGetElement(id);
    if (element) {
        element.style.display = 'block';
    }
}
function safeHide(id) {
    const element = safeGetElement(id);
    if (element) {
        element.style.display = 'none';
    }
}
const urlParams = new URLSearchParams(window.location.search);
const apiKey = urlParams.get('key') || 'demo2024secure';
const testData = {
    'DNOA': {
        firstName: 'SOPHIE',
        lastName: 'ROBINSON',
        subscriberId: '825978894',
        dateOfBirth: '09/27/2016'
    },
    'DentaQuest': {
        firstName: 'Cason',
        lastName: 'Wright',
        subscriberId: '710875473',
        dateOfBirth: '03/29/2016'
    },
    'MetLife': {
        firstName: 'AVERLY',
        lastName: 'TEDFORD',
        subscriberId: '635140654',
        dateOfBirth: '06/15/2015'
    },
    'Cigna': {
        firstName: 'ELLIE',
        lastName: 'WILLIAMS',
        subscriberId: 'U72997972',
        dateOfBirth: '11/14/2017'
    },
    'DOT': {
        firstName: 'MAURICE',
        lastName: 'BEREND',
        subscriberId: '916797559',
        dateOfBirth: '12/16/1978'
    },
    'Aetna': {
        firstName: '',
        lastName: '',
        subscriberId: '',
        dateOfBirth: ''
    },
    'UnitedHealthcare': {
        firstName: '',
        lastName: '',
        subscriberId: '',
        dateOfBirth: ''
    },
    'DDINS': {
        firstName: 'Estelle',
        lastName: 'Mazet',
        subscriberId: '002175461802',
        dateOfBirth: '10/19/2011'
    }
};
let eventSource = null;
let extractedData = null;
async function checkVPNLocation() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        try {
            const response = await fetch('/api/location');
            const data = await response.json();
            if (data && data.isUS === false) {
                safeShow('vpnWarning');
            }
            else if (data && data.isUS === true) {
                safeHide('vpnWarning');
            }
        }
        catch (error) {
            console.debug('Location check failed:', error);
        }
    }
}
function fillFormWithTestData(portal) {
    const data = testData[portal];
    if (data) {
        safeSetValue('firstName', data.firstName);
        safeSetValue('lastName', data.lastName);
        safeSetValue('subscriberId', data.subscriberId);
        safeSetValue('dateOfBirth', data.dateOfBirth);
    }
    // Handle extraction mode availability
    const bulkOption = document.getElementById('bulkOption');
    const extractionModeSelect = document.getElementById('extractionMode');

    if (bulkOption && extractionModeSelect) {
        if (portal === 'DNOA') {
            bulkOption.disabled = false;
            bulkOption.textContent = '📋 Bulk Mode (Unlimited)';
        } else {
            bulkOption.disabled = true;
            bulkOption.textContent = '🚀 Bulk Mode (Coming Soon)';
            // Reset to single mode if not DNOA
            extractionModeSelect.value = 'single';
        }
    }
    updateFormFieldVisibility(portal);
}
function updateFormFieldVisibility(portal) {
    const firstName = safeGetElement('firstName');
    const lastName = safeGetElement('lastName');
    const subscriberId = safeGetElement('subscriberId');
    const subscriberIdLabel = safeGetElement('subscriberIdLabel');
    const dateOfBirth = safeGetElement('dateOfBirth');
    const firstNameGroup = firstName?.parentElement;
    const lastNameGroup = lastName?.parentElement;
    const subscriberIdGroup = subscriberId?.parentElement;
    const dateOfBirthGroup = dateOfBirth?.parentElement;
    const bulkFields = safeGetElement('bulkFields');
    const formGrid = document.querySelector('.form-grid');

    // Add/remove dnoa-mode class for proper grid positioning
    if (formGrid) {
        if (portal === 'DNOA' || portal === 'DOT') {
            formGrid.classList.add('dnoa-mode');
        } else {
            formGrid.classList.remove('dnoa-mode');
        }
    }

    // Hide bulk fields by default
    if (bulkFields) bulkFields.classList.remove('active');

    // DNOA handling
    if (portal === 'DNOA') {
        const modeSelect = document.getElementById('extractionMode');
        let selectedMode = modeSelect ? modeSelect.value : 'single';

        if (selectedMode === 'bulk') {
            // Show bulk fields
            if (bulkFields) bulkFields.classList.add('active');
            // Hide single patient fields
            if (firstNameGroup) firstNameGroup.style.display = 'none';
            if (lastNameGroup) lastNameGroup.style.display = 'none';
            if (subscriberIdGroup) subscriberIdGroup.style.display = 'none';
            if (dateOfBirthGroup) dateOfBirthGroup.style.display = 'none';
            // Make single fields not required
            if (firstName && isInputElement(firstName)) firstName.required = false;
            if (lastName && isInputElement(lastName)) lastName.required = false;
            if (subscriberId && isInputElement(subscriberId)) subscriberId.required = false;
            if (dateOfBirth && isInputElement(dateOfBirth)) dateOfBirth.required = false;
        } else {
            // Single mode - hide name fields for DNOA
            if (firstNameGroup) firstNameGroup.style.display = 'none';
            if (lastNameGroup) lastNameGroup.style.display = 'none';
            if (firstName && isInputElement(firstName)) firstName.required = false;
            if (lastName && isInputElement(lastName)) lastName.required = false;
            if (subscriberIdLabel) subscriberIdLabel.textContent = 'Member ID or SSN';
            if (subscriberIdGroup) subscriberIdGroup.style.display = '';
            if (dateOfBirthGroup) dateOfBirthGroup.style.display = '';
        }
    }
    else if (portal === 'DDINS') {
        const modeRadios = document.getElementsByName('extractionMode');
        let selectedMode = 'single';
        Array.from(modeRadios).forEach(radio => {
            if (radio.checked) {
                selectedMode = radio.value;
            }
        });
        if (selectedMode === 'bulk') {
            if (firstNameGroup)
                firstNameGroup.style.display = 'none';
            if (lastNameGroup)
                lastNameGroup.style.display = 'none';
            if (subscriberIdGroup)
                subscriberIdGroup.style.display = 'none';
            if (dateOfBirthGroup)
                dateOfBirthGroup.style.display = 'none';
            if (firstName && isInputElement(firstName))
                firstName.required = false;
            if (lastName && isInputElement(lastName))
                lastName.required = false;
            if (subscriberId && isInputElement(subscriberId))
                subscriberId.required = false;
            if (dateOfBirth && isInputElement(dateOfBirth))
                dateOfBirth.required = false;
        }
        else {
            if (firstNameGroup)
                firstNameGroup.style.display = '';
            if (lastNameGroup)
                lastNameGroup.style.display = '';
            if (subscriberIdGroup)
                subscriberIdGroup.style.display = '';
            if (dateOfBirthGroup)
                dateOfBirthGroup.style.display = '';
            if (firstName && isInputElement(firstName))
                firstName.required = true;
            if (lastName && isInputElement(lastName))
                lastName.required = true;
            if (subscriberId && isInputElement(subscriberId))
                subscriberId.required = true;
            if (dateOfBirth && isInputElement(dateOfBirth))
                dateOfBirth.required = true;
        }
    }
    else if (portal === 'DOT') {
        // DOT doesn't need names either
        if (firstNameGroup)
            firstNameGroup.style.display = 'none';
        if (lastNameGroup)
            lastNameGroup.style.display = 'none';
        if (subscriberIdGroup)
            subscriberIdGroup.style.display = '';
        if (dateOfBirthGroup)
            dateOfBirthGroup.style.display = '';
        if (firstName && isInputElement(firstName))
            firstName.required = false;
        if (lastName && isInputElement(lastName))
            lastName.required = false;
        if (subscriberIdLabel)
            subscriberIdLabel.textContent = 'Member ID or SSN';
    }
    else {
        // Other portals (MetLife, Cigna, DentaQuest) need all fields
        if (firstNameGroup)
            firstNameGroup.style.display = '';
        if (lastNameGroup)
            lastNameGroup.style.display = '';
        if (subscriberIdGroup)
            subscriberIdGroup.style.display = '';
        if (dateOfBirthGroup)
            dateOfBirthGroup.style.display = '';
        if (firstName && isInputElement(firstName))
            firstName.required = true;
        if (lastName && isInputElement(lastName))
            lastName.required = true;
        if (subscriberId && isInputElement(subscriberId))
            subscriberId.required = true;
        if (dateOfBirth && isInputElement(dateOfBirth))
            dateOfBirth.required = true;
    }
}
function resetForm() {
    const form = safeGetElement('extractForm');
    if (form && isFormElement(form)) {
        form.reset();
    }
    safeSetHTML('logsContainer', '');
    const summaryGrid = safeGetElement('summaryGrid');
    const cdtCodesSection = safeGetElement('cdtCodesSection');
    if (summaryGrid)
        summaryGrid.innerHTML = '';
    if (cdtCodesSection)
        cdtCodesSection.innerHTML = '';
    safeHide('logsSection');
    safeHide('resultsSection');
    safeHide('errorMessage');
    safeHide('otpSection');
    const extractBtn = safeGetElement('extractBtn');
    if (extractBtn) {
        extractBtn.disabled = false;
    }
    const btnText = safeGetElement('btnText');
    if (btnText) {
        btnText.textContent = 'Extract Data';
    }
    const statusBadge = safeGetElement('statusBadge');
    if (statusBadge) {
        statusBadge.textContent = 'Ready';
        statusBadge.className = 'status-badge ready';
    }
    const portal = safeGetValue('portal');
    fillFormWithTestData(portal);
}
function showError(message) {
    const errorMessage = safeGetElement('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}
function hideError() {
    safeHide('errorMessage');
}
function addLog(message, _level = 'info') {
    const logsContainer = safeGetElement('logsContainer');
    if (!logsContainer)
        return;
    const logEntry = document.createElement('div');
    logEntry.className = 'log-line';
    logEntry.textContent = message;
    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}
function displayResults(data) {
    if (!data.summary) {
        showError('No summary data available');
        return;
    }
    const summary = data.summary;
    console.log('Full data:', data);
    console.log('Summary:', summary);
    console.log('Summary.cdtCodes:', summary.cdtCodes);
    const summaryGrid = safeGetElement('summaryGrid');
    if (summaryGrid) {
        if (summary.planName) {
            const deductInfo = summary.deductible || {};
            const maxInfo = summary.annualMaximum || {};
            let dnoaCards = [];
            dnoaCards.push(`
                <div class="summary-card">
                    <h4>Patient</h4>
                    <div class="value">${summary.patientName}</div>
                    <div class="subtitle">ID: ${summary.memberId}</div>
                </div>
            `);
            dnoaCards.push(`
                <div class="summary-card">
                    <h4>Plan</h4>
                    <div class="value">${summary.status || 'Active'}</div>
                    <div class="subtitle">${summary.planName}</div>
                </div>
            `);
            if (deductInfo.amount && deductInfo.amount > 0) {
                dnoaCards.push(`
                    <div class="summary-card">
                        <h4>Deductible</h4>
                        <div class="value">$${formatAmount(deductInfo.remaining || 0)}</div>
                        <div class="subtitle">Remaining of $${formatAmount(deductInfo.amount)}</div>
                    </div>
                `);
            }
            if (maxInfo.amount && maxInfo.amount > 0) {
                dnoaCards.push(`
                    <div class="summary-card">
                        <h4>Annual Maximum</h4>
                        <div class="value">$${formatAmount(maxInfo.remaining || 0)}</div>
                        <div class="subtitle">Remaining of $${formatAmount(maxInfo.amount)}</div>
                    </div>
                `);
            }
            if (summary.benefitCategories !== undefined && summary.benefitCategories > 0) {
                dnoaCards.push(`
                    <div class="summary-card">
                        <h4>Benefits</h4>
                        <div class="value">${summary.benefitCategories}</div>
                        <div class="subtitle">Coverage categories</div>
                    </div>
                `);
            }
            summaryGrid.innerHTML = dnoaCards.join('');
        }
        else {
            let cards = [];
            if (summary.patientName || summary.memberId) {
                cards.push(`
                    <div class="summary-card">
                        <h4>Patient</h4>
                        <div class="value">${summary.patientName || 'N/A'}</div>
                        ${summary.memberId ? `<div class="subtitle">ID: ${summary.memberId}</div>` : ''}
                    </div>
                `);
            }
            const totalBilled = calculateTotalBilled(data.claims);
            const totalPaid = calculateTotalPaid(data.claims);
            const patientBalance = calculatePatientBalance(data.claims);
            if (totalBilled > 0) {
                cards.push(`
                    <div class="summary-card">
                        <h4>💰 Total Billed</h4>
                        <div class="value">$${formatAmount(totalBilled)}</div>
                        <div class="subtitle">Submitted charges</div>
                    </div>
                `);
            }
            if (totalPaid > 0) {
                cards.push(`
                    <div class="summary-card">
                        <h4>✅ Insurance Paid</h4>
                        <div class="value">$${formatAmount(totalPaid)}</div>
                        <div class="subtitle">Approved amount</div>
                    </div>
                `);
            }
            if (patientBalance > 0) {
                cards.push(`
                    <div class="summary-card">
                        <h4>Patient Balance</h4>
                        <div class="value">$${formatAmount(patientBalance)}</div>
                        <div class="subtitle">Amount due</div>
                    </div>
                `);
            }
            if (data.claims && data.claims.length > 0) {
                cards.push(`
                    <div class="summary-card">
                        <h4>📋 Claims Processed</h4>
                        <div class="value">${data.claims.length}</div>
                        <div class="subtitle">Historical claims</div>
                    </div>
                `);
            }
            const deductibleRemaining = summary.deductibleRemaining || summary.deductible?.remaining || summary.deductible;
            const deductibleAmount = summary.deductible?.amount || summary.deductible;
            if (deductibleRemaining > 0 || deductibleAmount > 0) {
                cards.push(`
                    <div class="summary-card">
                        <h4>Deductible</h4>
                        <div class="value">$${formatAmount(deductibleRemaining || 0)}</div>
                        ${deductibleAmount > 0 ? `<div class="subtitle">Remaining of $${formatAmount(deductibleAmount)}</div>` : '<div class="subtitle">Remaining</div>'}
                    </div>
                `);
            }
            if (summary.planMaximum > 0 || summary.maximumRemaining > 0) {
                cards.push(`
                    <div class="summary-card">
                        <h4>Annual Maximum</h4>
                        <div class="value">$${formatAmount(summary.maximumRemaining || summary.planMaximum || 0)}</div>
                        <div class="subtitle">Remaining</div>
                    </div>
                `);
            }
            if (summary.totalClaims > 0 && summary.totalClaims !== data.claims?.length) {
                cards.push(`
                    <div class="summary-card">
                        <h4>Total Claims</h4>
                        <div class="value">${summary.totalClaims}</div>
                        <div class="subtitle">From summary</div>
                    </div>
                `);
            }
            summaryGrid.innerHTML = cards.join('');
        }
    }
    const resultsSection = safeGetElement('resultsSection');
    if (resultsSection) {
        resultsSection.classList.add('active');
    }
    const statusBadge = safeGetElement('statusBadge');
    if (statusBadge) {
        statusBadge.textContent = 'Success';
        statusBadge.className = 'status-badge success';
    }
}
function displayBulkResults(data) {
    // Hide error message
    safeHide('errorMessage');

    const summaryGrid = safeGetElement('summaryGrid');
    if (summaryGrid) {
        // Simple table
        let tableHTML = `
            <div style="width: 100%; margin: 20px 0;">
                <h3 style="color: #22c55e; margin-bottom: 15px;">✅ Bulk Extraction Complete: ${data.successful}/${data.total} patients</h3>
                <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb;">
                    <thead>
                        <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                            <th style="padding: 12px; text-align: left;">Status</th>
                            <th style="padding: 12px; text-align: left;">Member ID</th>
                            <th style="padding: 12px; text-align: left;">Deductible</th>
                            <th style="padding: 12px; text-align: left;">Maximum Remaining</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Add rows for successful extractions
        if (data.results && data.results.length > 0) {
            data.results.forEach(result => {
                const s = result.data?.summary;
                const deductible = s?.deductible;
                const maxRemaining = s?.annualMaximum?.remaining;

                tableHTML += `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px;">✅</td>
                        <td style="padding: 12px; font-family: monospace;">${result.patient.subscriberId}</td>
                        <td style="padding: 12px;">$${deductible?.remaining || 0}/$${deductible?.amount || 0}</td>
                        <td style="padding: 12px; font-weight: bold;">$${maxRemaining || 'N/A'}</td>
                    </tr>
                `;
            });
        }

        // Add rows for errors
        if (data.errors && data.errors.length > 0) {
            data.errors.forEach(error => {
                tableHTML += `
                    <tr style="border-bottom: 1px solid #e5e7eb; background: #fee2e2;">
                        <td style="padding: 12px;">❌</td>
                        <td style="padding: 12px; font-family: monospace;">${error.patient.subscriberId}</td>
                        <td style="padding: 12px;" colspan="2">${error.error}</td>
                    </tr>
                `;
            });
        }

        tableHTML += `
                    </tbody>
                </table>
                <div style="margin-top: 20px;">
                    <button class="btn" onclick="downloadBulkJSON()" style="margin-right: 10px;">📥 Download JSON</button>
                    <button class="btn" onclick="downloadBulkCSV()" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">📊 Download CSV</button>
                </div>
            </div>
        `;

        summaryGrid.innerHTML = tableHTML;
    }

    // Hide the single-patient action buttons for bulk mode
    const actionButtons = document.querySelector('.action-buttons');
    if (actionButtons) {
        actionButtons.style.display = 'none';
    }

    const resultsSection = safeGetElement('resultsSection');
    if (resultsSection) {
        resultsSection.classList.add('active');
    }

    const statusBadge = safeGetElement('statusBadge');
    if (statusBadge) {
        statusBadge.textContent = 'Success';
        statusBadge.className = 'status-badge success';
    }
}

function displayCDTCodesFromArray(_cdtCodes) {
    return;
}
function displayCDTCodes(_claims) {
    return;
}
function formatAmount(value) {
    if (value === null || value === undefined)
        return '0.00';
    if (typeof value === 'object') {
        if ('amount' in value)
            return formatAmount(value.amount);
        if ('value' in value)
            return formatAmount(value.value);
        if ('remaining' in value)
            return formatAmount(value.remaining);
        if ('total' in value)
            return formatAmount(value.total);
        return '0.00';
    }
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
    return isNaN(num) ? '0.00' : num.toFixed(2);
}
function calculateTotalBilled(claims) {
    if (!claims)
        return 0;
    return claims.reduce((sum, claim) => sum + (claim.billed || 0), 0);
}
function calculateTotalPaid(claims) {
    if (!claims)
        return 0;
    return claims.reduce((sum, claim) => sum + (claim.paid || 0), 0);
}
function calculatePatientBalance(claims) {
    if (!claims)
        return 0;
    return claims.reduce((sum, claim) => sum + (claim.patientPay || 0), 0);
}
function fillVerificationForm() {
    if (!extractedData) {
        showError('No data available to transfer');
        return;
    }
    sessionStorage.setItem('extractedPatientData', JSON.stringify(extractedData));
    const urlParams = new URLSearchParams(window.location.search);
    const apiKey = urlParams.get('key') || 'demo2024secure';
    window.location.href = `/verification-form.html?key=${apiKey}&autoFill=true`;
}
function downloadJSON() {
    if (!extractedData)
        return;
    const dataStr = JSON.stringify(extractedData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `dental-data-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}
function viewJSONRaw() {
    if (!extractedData)
        return;
    const jsonWindow = window.open('', '_blank');
    if (jsonWindow) {
        jsonWindow.document.write(`
            <html>
                <head>
                    <title>Raw API Data</title>
                    <style>
                        body {
                            font-family: monospace;
                            padding: 20px;
                            background: #1e1e1e;
                            color: #d4d4d4;
                        }
                        pre {
                            white-space: pre-wrap;
                            word-wrap: break-word;
                        }
                    </style>
                </head>
                <body>
                    <pre>${JSON.stringify(extractedData, null, 2)}</pre>
                </body>
            </html>
        `);
        jsonWindow.document.close();
    }
}
function viewJSONNormalized() {
    if (!extractedData || !extractedData.normalizedDA) {
        alert('Normalized DA format data not available');
        return;
    }
    const jsonWindow = window.open('', '_blank');
    if (jsonWindow) {
        jsonWindow.document.write(`
            <html>
                <head>
                    <title>Normalized DA Format</title>
                    <style>
                        body {
                            font-family: monospace;
                            padding: 20px;
                            background: #1e1e1e;
                            color: #d4d4d4;
                        }
                        pre {
                            white-space: pre-wrap;
                            word-wrap: break-word;
                        }
                        h2 {
                            color: #98c379;
                        }
                    </style>
                </head>
                <body>
                    <h2>Normalized Data (DA Format)</h2>
                    <pre>${JSON.stringify(extractedData.normalizedDA, null, 2)}</pre>
                </body>
            </html>
        `);
        jsonWindow.document.close();
    }
}
async function submitOTP() {
    const otpInput = safeGetElement('otpInput');
    const otp = otpInput ? otpInput.value : '';
    if (!otp || otp.length !== 6) {
        showError('Please enter a 6-digit OTP code');
        return;
    }
    try {
        const response = await fetch(`/api/submit-otp?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otp })
        });
        if (response.ok) {
            safeHide('otpSection');
            if (otpInput) {
                otpInput.value = '';
            }
        }
        else {
            showError('Failed to submit OTP');
        }
    }
    catch (error) {
        showError('Error submitting OTP');
    }
}
async function handleExtraction(event) {
    event.preventDefault();
    hideError();
    safeSetHTML('logsContainer', '');
    const logsSection = safeGetElement('logsSection');
    const resultsSection = safeGetElement('resultsSection');
    if (logsSection) {
        logsSection.classList.add('active');
    }
    if (resultsSection) {
        resultsSection.classList.remove('active');
    }
    const summaryGrid = safeGetElement('summaryGrid');
    const cdtCodesSection = safeGetElement('cdtCodesSection');
    if (summaryGrid)
        summaryGrid.innerHTML = '';
    if (cdtCodesSection)
        cdtCodesSection.innerHTML = '';
    const statusBadge = safeGetElement('statusBadge');
    if (statusBadge) {
        statusBadge.textContent = 'Running';
        statusBadge.className = 'status-badge running';
    }
    const extractBtn = safeGetElement('extractBtn');
    if (extractBtn) {
        extractBtn.disabled = true;
    }
    const btnText = safeGetElement('btnText');
    if (btnText) {
        btnText.textContent = 'Extracting...';
    }
    const portal = safeGetValue('portal');
    let requestData = {
        portal,
        firstName: safeGetValue('firstName'),
        lastName: safeGetValue('lastName'),
        subscriberId: safeGetValue('subscriberId'),
        dateOfBirth: safeGetValue('dateOfBirth')
    };

    // Handle DNOA bulk mode
    if (portal === 'DNOA') {
        const modeSelect = document.getElementById('extractionMode');
        let selectedMode = modeSelect ? modeSelect.value : 'single';

        if (selectedMode === 'bulk') {
            // Parse textarea content
            const bulkTextarea = document.getElementById('bulkPatientsTextarea');
            const bulkPatients = [];

            if (bulkTextarea && bulkTextarea.value) {
                const lines = bulkTextarea.value.trim().split('\n');

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith('...')) continue;

                    // Support multiple delimiters: comma, tab, semicolon
                    const parts = trimmed.split(/[,\t;]+/).map(p => p.trim());

                    if (parts.length >= 2) {
                        const [subscriberId, dateOfBirth] = parts;

                        // Skip invalid lines
                        if (subscriberId && dateOfBirth) {
                            bulkPatients.push({
                                subscriberId,
                                dateOfBirth,
                                firstName: '',
                                lastName: ''
                            });
                        }
                    }
                }
            }

            if (bulkPatients.length === 0) {
                showError('Please enter at least one patient (Member ID and Date of Birth)');
                if (extractBtn) extractBtn.disabled = false;
                if (btnText) btnText.textContent = 'Extract Data';
                return;
            }

            // Change request to bulk format
            requestData = {
                portal: 'DNOA',
                mode: 'bulk',
                patients: bulkPatients
            };

            if (btnText) btnText.textContent = `Extracting ${bulkPatients.length} patients...`;
        }
    }

    if (portal === 'DDINS') {
        const modeRadios = document.getElementsByName('extractionMode');
        Array.from(modeRadios).forEach(radio => {
            if (radio.checked) {
                requestData.mode = radio.value;
            }
        });
        if (requestData.mode === 'bulk') {
            requestData.firstName = '';
            requestData.lastName = '';
            requestData.subscriberId = '';
            requestData.dateOfBirth = '';
        }
    }
    if (eventSource) {
        eventSource.close();
    }
    eventSource = new EventSource(`/api/stream?key=${apiKey}`);
    eventSource.addEventListener('log', (e) => {
        const data = JSON.parse(e.data);
        addLog(data.message, data.level || 'info');
    });
    eventSource.addEventListener('otp_required', () => {
        safeShow('otpSection');
        const otpInput = safeGetElement('otpInput');
        if (otpInput) {
            otpInput.focus();
        }
    });
    eventSource.addEventListener('complete', () => {
        addLog('✅ Extraction complete', 'info');
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
    });
    eventSource.addEventListener('error', () => {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
    });
    try {
        const response = await fetch(`/api/extract?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        const result = await response.json();
        if (extractBtn) {
            extractBtn.disabled = false;
        }
        if (btnText) {
            btnText.textContent = 'Extract Data';
        }
        if (result.success && result.data) {
            extractedData = result.data;
            const currentPortal = safeGetValue('portal');

            // Check if it's bulk mode response
            if (result.mode === 'bulk') {
                displayBulkResults(result.data);
            } else {
                console.log('Checking normalizedDA:', {
                    hasNormalizedDA: !!result.data.normalizedDA,
                    keys: Object.keys(result.data),
                    portal: currentPortal
                });
                displayResults(result.data);
            }
        }
        else {
            showError(result.error || 'Extraction failed');
            if (statusBadge) {
                statusBadge.textContent = 'Failed';
                statusBadge.className = 'status-badge error';
            }
        }
    }
    catch (error) {
        showError('Network error occurred');
        if (extractBtn) {
            extractBtn.disabled = false;
        }
        if (btnText) {
            btnText.textContent = 'Extract Data';
        }
        if (statusBadge) {
            statusBadge.textContent = 'Error';
            statusBadge.className = 'status-badge error';
        }
    }
    finally {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
    }
}
function initializeEventListeners() {
    // Add real-time patient counter for textarea
    const bulkTextarea = document.getElementById('bulkPatientsTextarea');
    if (bulkTextarea) {
        const updateCounter = () => {
            const lines = bulkTextarea.value.trim().split('\n');
            let validCount = 0;

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('...')) continue;
                const parts = trimmed.split(/[,\t;]+/);
                if (parts.length >= 2 && parts[0] && parts[1]) {
                    validCount++;
                }
            }

            const counter = document.getElementById('bulkPatientCount');
            if (counter) {
                counter.textContent = `${validCount} patient${validCount !== 1 ? 's' : ''} detected`;
                counter.style.color = validCount > 0 ? '#22c55e' : '#666';
            }
        };

        bulkTextarea.addEventListener('input', updateCounter);
        bulkTextarea.addEventListener('paste', () => setTimeout(updateCounter, 10));
    }

    const portalSelect = safeGetElement('portal');
    if (portalSelect && isSelectElement(portalSelect)) {
        portalSelect.addEventListener('change', (e) => {
            const target = e.target;
            const portal = target.value;
            safeSetHTML('logsContainer', '');
            const resultsSection = safeGetElement('resultsSection');
            if (resultsSection) {
                resultsSection.classList.remove('active');
            }
            const summaryGrid = safeGetElement('summaryGrid');
            const cdtCodesSection = safeGetElement('cdtCodesSection');
            if (summaryGrid)
                summaryGrid.innerHTML = '';
            if (cdtCodesSection)
                cdtCodesSection.innerHTML = '';
            safeHide('errorMessage');
            safeSetHTML('errorMessage', '');
            fillFormWithTestData(portal);
        });
    }
    // DNOA mode toggle
    const modeSelect = document.getElementById('extractionMode');
    if (modeSelect) {
        modeSelect.addEventListener('change', () => {
            const portal = safeGetValue('portal');
            if (portal === 'DNOA') {
                updateFormFieldVisibility(portal);
            }
        });
    }

    // Removed DDINS mode toggle since we're using unified extraction mode
    const form = safeGetElement('extractForm');
    if (form && isFormElement(form)) {
        form.addEventListener('submit', handleExtraction);
    }
    const submitOtpBtn = safeGetElement('submitOtpBtn');
    if (submitOtpBtn) {
        submitOtpBtn.addEventListener('click', submitOTP);
    }
    const otpInput = safeGetElement('otpInput');
    if (otpInput && isInputElement(otpInput)) {
        otpInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitOTP();
            }
        });
    }
}
function initialize() {
    initializeEventListeners();
    const portalSelect = safeGetElement('portal');
    if (portalSelect && isSelectElement(portalSelect)) {
        const portal = portalSelect.value || 'DDINS';
        fillFormWithTestData(portal);
    }
    checkVPNLocation();
}
document.addEventListener('DOMContentLoaded', initialize);
// Bulk download functions
function downloadBulkJSON() {
    if (!extractedData) return;
    const dataStr = JSON.stringify(extractedData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `bulk-dnoa-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function downloadBulkCSV() {
    if (!extractedData) return;

    let csv = 'Status,MemberID,Deductible_Remaining,Deductible_Total,Maximum_Remaining\n';

    if (extractedData.results) {
        extractedData.results.forEach(result => {
            const s = result.data?.summary;
            const deductible = s?.deductible;
            const maxRemaining = s?.annualMaximum?.remaining;
            csv += `Success,${result.patient.subscriberId},${deductible?.remaining || 0},${deductible?.amount || 0},${maxRemaining || 'N/A'}\n`;
        });
    }

    if (extractedData.errors) {
        extractedData.errors.forEach(error => {
            csv += `Failed,${error.patient.subscriberId},ERROR,ERROR,ERROR\n`;
        });
    }

    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    const exportFileDefaultName = `bulk-dnoa-${new Date().toISOString().split('T')[0]}.csv`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

window.downloadJSON = downloadJSON;
window.viewJSONRaw = viewJSONRaw;
window.viewJSONNormalized = viewJSONNormalized;
window.resetForm = resetForm;
window.fillVerificationForm = fillVerificationForm;
window.downloadBulkJSON = downloadBulkJSON;
window.downloadBulkCSV = downloadBulkCSV;
//# sourceMappingURL=app.js.map