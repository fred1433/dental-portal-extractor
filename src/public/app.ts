/**
 * ⚠️  AUTO-GENERATED FILE - DO NOT EDIT public/app.js DIRECTLY!
 *
 * This JavaScript file is compiled from src/public/app.ts
 * Any changes made to public/app.js will be OVERWRITTEN by `npm run build`
 *
 * 📝 TO MODIFY THIS CODE: Edit src/public/app.ts (this file)
 * 🔧 TO COMPILE: Run `npm run build`
 * 🚫 DO NOT EDIT: public/app.js (auto-generated, in .gitignore)
 *
 * Frontend TypeScript application for dental portal extraction
 */

// Type definitions (inline for browser compatibility)
type PortalType = 'DNOA' | 'DentaQuest' | 'MetLife' | 'Cigna' | 'DOT' | 'Aetna' | 'UnitedHealthcare' | 'DDINS';

interface PortalTestData {
    firstName: string;
    lastName: string;
    subscriberId: string;
    dateOfBirth: string;
}

type BulkPatient = {
    subscriberId: string;
    dateOfBirth: string;
    firstName?: string;
    lastName?: string;
};

interface BulkRunResult {
    total: number;
    successful: number;
    failed: number;
    results: Array<{ success: true; patient: BulkPatient; data: ExtractionResult }>;
    errors: Array<{ patient: BulkPatient; error: string }>;
    performance?: { durationSeconds: number; patientsPerMinute: number };
}

interface ExtractionRequest {
    portal: PortalType;
    subscriberId: string;
    dateOfBirth: string;
    firstName: string;
    lastName: string;
    clinicId?: string;
    mode?: 'single' | 'bulk';
    patients?: BulkPatient[];  // Correct field name for server contract
    bulkPatients?: BulkPatient[];  // Keep for backward compat
}

interface ExtractionResponse {
    success: boolean;
    mode?: 'single' | 'bulk';
    data?: ExtractionResult | BulkRunResult;
    error?: string;
}

interface ExtractionResult {
    success: boolean;
    summary?: any;
    eligibility?: any;
    claims?: Claim[];
    patient?: any;
    error?: string;
    timestamp?: string;
}

interface Claim {
    number: string;
    serviceDate: string;
    status: string;
    patientName: string;
    patientId?: string;
    dateOfBirth?: string;
    providerName?: string;
    tin?: string;
    billed: number;
    paid: number;
    patientPay?: number;
    services: CDTCode[];
    detailUrl?: string;
    link?: string;
}

interface CDTCode {
    code: string;
    description: string;
    toothNumber?: string;
    tooth?: string;  // DNOA uses 'tooth'
    serviceDate?: string;
    date?: string;  // DNOA uses 'date'
    provider?: string;
    amountBilled?: number;
    amountPaid?: number;
    patientPay?: number;
}

interface LogEvent {
    message: string;
    timestamp: string;
    level?: 'info' | 'warning' | 'error';
}

// ============= Type Guards =============

function isInputElement(element: Element | null): element is HTMLInputElement {
    return element !== null && element instanceof HTMLInputElement;
}

function isSelectElement(element: Element | null): element is HTMLSelectElement {
    return element !== null && element instanceof HTMLSelectElement;
}

function isFormElement(element: Element | null): element is HTMLFormElement {
    return element !== null && element instanceof HTMLFormElement;
}

// ============= DOM Helper Functions =============

function safeGetElement<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
}

function safeSetValue(id: string, value: string): void {
    const element = safeGetElement<HTMLInputElement>(id);
    if (element && isInputElement(element)) {
        element.value = value;
    }
}

function safeGetValue(id: string): string {
    const element = safeGetElement<HTMLElement>(id);
    if (element && isInputElement(element)) {
        return element.value;
    }
    if (element && isSelectElement(element)) {
        return element.value;
    }
    return '';
}

function safeSetHTML(id: string, html: string): void {
    const element = safeGetElement<HTMLElement>(id);
    if (element) {
        element.innerHTML = html;
    }
}

function safeShow(id: string): void {
    const element = safeGetElement<HTMLElement>(id);
    if (element) {
        element.style.display = 'block';
    }
}

function safeHide(id: string): void {
    const element = safeGetElement<HTMLElement>(id);
    if (element) {
        element.style.display = 'none';
    }
}

// ============= Configuration =============

// Get API key from URL params
const urlParams = new URLSearchParams(window.location.search);
const apiKey = urlParams.get('key') || 'demo2024secure';

// Test data for each portal
const testData: Record<PortalType, PortalTestData> = {
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
        subscriberId: '132236890',
        dateOfBirth: '09/17/2019'
    },
    'DDINS': {
        firstName: 'Estelle',
        lastName: 'Mazet',
        subscriberId: '002175461802',
        dateOfBirth: '10/19/2011'
    }
};

// Clinic-specific test data (overrides generic testData when clinic is selected)
const testDataByClinic: Record<string, Partial<Record<PortalType, PortalTestData>>> = {
    'sdb': {
        'DDINS': {
            firstName: 'Estelle',
            lastName: 'Mazet',
            subscriberId: '002175461802',
            dateOfBirth: '10/19/2011'
        }
    },
    'ace_dental': {
        'DDINS': {
            firstName: 'Karen',
            lastName: 'Ilumin',
            subscriberId: '121875916101',
            dateOfBirth: '10/21/1998'
        }
    }
};

function resolvePortalTestKey(portal: string): PortalType {
    return portal === 'UHC' ? 'UnitedHealthcare' : portal as PortalType;
}
let eventSource: EventSource | null = null;
let extractedData: any = null;  // Allow bulk or single data

// ============= VPN Location Check =============

async function checkVPNLocation(): Promise<void> {
    // Only check location if running locally (not on Render)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        try {
            const response = await fetch('/api/location');
            const data = await response.json();
            
            if (data && data.isUS === false) {
                safeShow('vpnWarning');
            } else if (data && data.isUS === true) {
                safeHide('vpnWarning');
            }
        } catch (error) {
            // Silently fail if location check doesn't work
            console.debug('Location check failed:', error);
        }
    }
}

// ============= Form Handling =============

function fillFormWithTestData(portalValue: string): void {
    const portalKey = resolvePortalTestKey(portalValue);
    const clinicId = safeGetValue('clinic');

    // Try clinic-specific data first, fall back to generic testData
    let data = testData[portalKey];
    if (clinicId && testDataByClinic[clinicId] && testDataByClinic[clinicId][portalKey]) {
        data = testDataByClinic[clinicId][portalKey]!;
    }

    if (data) {
        safeSetValue('firstName', data.firstName);
        safeSetValue('lastName', data.lastName);
        safeSetValue('subscriberId', data.subscriberId);
        safeSetValue('dateOfBirth', data.dateOfBirth);
    }

    const normalizedPortal = portalKey;

    // Handle extraction mode availability
    const bulkOption = document.getElementById('bulkOption') as HTMLOptionElement;
    const extractionModeSelect = document.getElementById('extractionMode') as HTMLSelectElement;

    if (bulkOption && extractionModeSelect) {
        if (normalizedPortal === 'DNOA') {
            bulkOption.disabled = false;
            bulkOption.textContent = 'Bulk Mode (Unlimited)';
        } else {
            bulkOption.disabled = true;
            bulkOption.textContent = 'Bulk Mode (Coming Soon)';
            // Reset to single mode if not DNOA
            extractionModeSelect.value = 'single';
        }
    }

    // Show/hide form fields based on portal and mode
    updateFormFieldVisibility(portalValue);
}

function updateFormFieldVisibility(portal: string): void {
    const firstName = safeGetElement<HTMLElement>('firstName');
    const lastName = safeGetElement<HTMLElement>('lastName');
    const subscriberId = safeGetElement<HTMLElement>('subscriberId');
    const subscriberIdLabel = safeGetElement<HTMLElement>('subscriberIdLabel');
    const dateOfBirth = safeGetElement<HTMLElement>('dateOfBirth');
    const firstNameGroup = firstName?.parentElement;
    const lastNameGroup = lastName?.parentElement;
    const subscriberIdGroup = subscriberId?.parentElement;
    const dateOfBirthGroup = dateOfBirth?.parentElement;
    const bulkFields = safeGetElement<HTMLElement>('bulkFields');
    const formGrid = document.querySelector('.form-grid') as HTMLElement;

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

    const isUHC = portal === 'UHC' || portal === 'UnitedHealthcare';

    // DNOA handling
    if (portal === 'DNOA') {
        const modeSelect = document.getElementById('extractionMode') as HTMLSelectElement;
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
            if ((radio as HTMLInputElement).checked) {
                selectedMode = (radio as HTMLInputElement).value;
            }
        })

        if (selectedMode === 'bulk') {
            // Hide all patient fields for bulk mode
            if (firstNameGroup) firstNameGroup.style.display = 'none';
            if (lastNameGroup) lastNameGroup.style.display = 'none';
            if (subscriberIdGroup) subscriberIdGroup.style.display = 'none';
            if (dateOfBirthGroup) dateOfBirthGroup.style.display = 'none';

            // Remove required attribute
            if (firstName && isInputElement(firstName)) firstName.required = false;
            if (lastName && isInputElement(lastName)) lastName.required = false;
            if (subscriberId && isInputElement(subscriberId)) subscriberId.required = false;
            if (dateOfBirth && isInputElement(dateOfBirth)) dateOfBirth.required = false;
        } else {
            // Show all fields for single mode
            if (firstNameGroup) firstNameGroup.style.display = '';
            if (lastNameGroup) lastNameGroup.style.display = '';
            if (subscriberIdGroup) subscriberIdGroup.style.display = '';
            if (dateOfBirthGroup) dateOfBirthGroup.style.display = '';

            // Add required attribute back
            if (firstName && isInputElement(firstName)) firstName.required = true;
            if (lastName && isInputElement(lastName)) lastName.required = true;
            if (subscriberId && isInputElement(subscriberId)) subscriberId.required = true;
            if (dateOfBirth && isInputElement(dateOfBirth)) dateOfBirth.required = true;
        }
    }
    else if (portal === 'DOT') {
        // Hide first and last name for DOT, keep other fields
        if (firstNameGroup) firstNameGroup.style.display = 'none';
        if (lastNameGroup) lastNameGroup.style.display = 'none';
        if (firstName && isInputElement(firstName)) firstName.required = false;
        if (lastName && isInputElement(lastName)) lastName.required = false;
        if (subscriberIdLabel) subscriberIdLabel.textContent = 'Member ID';
        if (subscriberIdGroup) subscriberIdGroup.style.display = '';
        if (dateOfBirthGroup) dateOfBirthGroup.style.display = '';
    }
    else if (isUHC) {
        if (firstNameGroup) firstNameGroup.style.display = 'none';
        if (lastNameGroup) lastNameGroup.style.display = 'none';
        if (subscriberIdGroup) subscriberIdGroup.style.display = '';
        if (dateOfBirthGroup) dateOfBirthGroup.style.display = '';
        if (subscriberIdLabel) subscriberIdLabel.textContent = 'Member ID';

        if (firstName && isInputElement(firstName)) {
            firstName.required = false;
            firstName.value = '';
        }
        if (lastName && isInputElement(lastName)) {
            lastName.required = false;
            lastName.value = '';
        }
        if (subscriberId && isInputElement(subscriberId)) {
            subscriberId.required = true;
        }
        if (dateOfBirth && isInputElement(dateOfBirth)) {
            dateOfBirth.required = true;
        }
    }
    else {
        // Show all fields for other portals
        if (firstNameGroup) firstNameGroup.style.display = '';
        if (lastNameGroup) lastNameGroup.style.display = '';
        if (subscriberIdGroup) subscriberIdGroup.style.display = '';
        if (dateOfBirthGroup) dateOfBirthGroup.style.display = '';

        // Reset label and required attributes for other portals
        if (subscriberIdLabel) subscriberIdLabel.textContent = 'Subscriber ID';
        if (firstName && isInputElement(firstName)) firstName.required = true;
        if (lastName && isInputElement(lastName)) lastName.required = true;
        if (subscriberId && isInputElement(subscriberId)) subscriberId.required = true;
        if (dateOfBirth && isInputElement(dateOfBirth)) dateOfBirth.required = true;
    }
}

function resetForm(): void {
    const form = safeGetElement<HTMLFormElement>('extractForm');
    if (form && isFormElement(form)) {
        form.reset();
    }
    
    // Clear sections
    safeSetHTML('logsContainer', '');
    const summaryGrid = safeGetElement<HTMLElement>('summaryGrid');
    const cdtCodesSection = safeGetElement<HTMLElement>('cdtCodesSection');
    if (summaryGrid) summaryGrid.innerHTML = '';
    if (cdtCodesSection) cdtCodesSection.innerHTML = '';
    
    // Hide sections
    safeHide('logsSection');
    safeHide('resultsSection');
    safeHide('errorMessage');
    safeHide('otpSection');
    
    // Reset button state
    const extractBtn = safeGetElement<HTMLButtonElement>('extractBtn');
    if (extractBtn) {
        extractBtn.disabled = false;
    }
    
    const btnText = safeGetElement<HTMLElement>('btnText');
    if (btnText) {
        btnText.textContent = 'Extract Data';
    }
    
    const statusBadge = safeGetElement<HTMLElement>('statusBadge');
    if (statusBadge) {
        statusBadge.textContent = 'Ready';
        statusBadge.className = 'status-badge ready';
    }
    
    // Pre-fill with default test data
    const portal = safeGetValue('portal') as PortalType;
    fillFormWithTestData(portal);
}

// ============= Error Handling =============

function showError(message: string): void {
    const errorMessage = safeGetElement<HTMLElement>('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

function hideError(): void {
    safeHide('errorMessage');
}

// ============= Log Display =============

function addLog(message: string, _level: 'info' | 'warning' | 'error' = 'info'): void {
    const logsContainer = safeGetElement<HTMLElement>('logsContainer');
    if (!logsContainer) return;
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-line';
    logEntry.textContent = message;
    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

// ============= Results Display =============

function displayResults(data: ExtractionResult): void {
    if (!data.summary) {
        showError('No summary data available');
        return;
    }
    
    const summary = data.summary;
    
    // Debug: log the data structure
    console.log('Full data:', data);
    console.log('Summary:', summary);
    console.log('Summary.cdtCodes:', summary.cdtCodes);
    const summaryGrid = safeGetElement<HTMLElement>('summaryGrid');
    
    if (summaryGrid) {
        // Different display logic for different portals
        if (summary.planName) {
            // DNOA portal - has plan info and benefits
            const deductInfo = summary.deductible || {};
            const maxInfo = summary.annualMaximum || {};
            
            let dnoaCards = [];

            // Always show patient card
            dnoaCards.push(`
                <div class="summary-card">
                    <h4>Patient</h4>
                    <div class="value">${summary.patientName}</div>
                    <div class="subtitle">ID: ${summary.memberId}</div>
                </div>
            `);

            // Always show plan card
            dnoaCards.push(`
                <div class="summary-card">
                    <h4>Plan</h4>
                    <div class="value">${summary.status || 'Active'}</div>
                    <div class="subtitle">${summary.planName}</div>
                </div>
            `);

            // Only show deductible if there's an actual deductible amount
            if (deductInfo.amount && deductInfo.amount > 0) {
                dnoaCards.push(`
                    <div class="summary-card">
                        <h4>Deductible</h4>
                        <div class="value">$${formatAmount(deductInfo.remaining || 0)}</div>
                        <div class="subtitle">Remaining of $${formatAmount(deductInfo.amount)}</div>
                    </div>
                `);
            }

            // Only show annual maximum if there's an actual maximum
            if (maxInfo.amount && maxInfo.amount > 0) {
                dnoaCards.push(`
                    <div class="summary-card">
                        <h4>Annual Maximum</h4>
                        <div class="value">$${formatAmount(maxInfo.remaining || 0)}</div>
                        <div class="subtitle">Remaining of $${formatAmount(maxInfo.amount)}</div>
                    </div>
                `);
            }

            // Only show benefits if we have categories
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
        } else {
            // Other portals (Cigna, DentaQuest, MetLife, DDINS) - show only cards with actual data
            let cards = [];

            // Always show patient card if we have a name or ID
            if (summary.patientName || summary.memberId) {
                cards.push(`
                    <div class="summary-card">
                        <h4>Patient</h4>
                        <div class="value">${summary.patientName || 'N/A'}</div>
                        ${summary.memberId ? `<div class="subtitle">ID: ${summary.memberId}</div>` : ''}
                    </div>
                `);
            }

            // Only show financial cards if we have claims data
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

            // Show claims count if we have claims
            if (data.claims && data.claims.length > 0) {
                cards.push(`
                    <div class="summary-card">
                        <h4>📋 Claims Processed</h4>
                        <div class="value">${data.claims.length}</div>
                        <div class="subtitle">Historical claims</div>
                    </div>
                `);
            }

            // Show deductible only if we have actual values
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

            // Show annual maximum if available
            if (summary.planMaximum > 0 || summary.maximumRemaining > 0) {
                cards.push(`
                    <div class="summary-card">
                        <h4>Annual Maximum</h4>
                        <div class="value">$${formatAmount(summary.maximumRemaining || summary.planMaximum || 0)}</div>
                        <div class="subtitle">Remaining</div>
                    </div>
                `);
            }

            // Show total claims from summary if different from claims array
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
    
    // CDT codes display removed - no longer needed
    
    // Show results section
    const resultsSection = safeGetElement<HTMLElement>('resultsSection');
    if (resultsSection) {
        resultsSection.classList.add('active');
        // Scroll to results when extraction completes
        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }

    // Update status
    const statusBadge = safeGetElement<HTMLElement>('statusBadge');
    if (statusBadge) {
        statusBadge.textContent = 'Success';
        statusBadge.className = 'status-badge success';
    }

    // Refresh patient list if function exists (from index.html)
    if (typeof (window as any).loadPatientCount === 'function') {
        (window as any).loadPatientCount();
    }
}

function displayCDTCodesFromArray(_cdtCodes: CDTCode[]): void {
    // CDT codes display removed - no longer needed
    return;
}

function displayCDTCodes(_claims: Claim[]): void {
    // CDT codes display removed - no longer needed
    return;
}

// ============= Utility Functions =============

function formatAmount(value: any): string {
    if (value === null || value === undefined) return '0.00';
    
    // If it's an object, try to extract a numeric value
    if (typeof value === 'object') {
        // Try common property names
        if ('amount' in value) return formatAmount(value.amount);
        if ('value' in value) return formatAmount(value.value);
        if ('remaining' in value) return formatAmount(value.remaining);
        if ('total' in value) return formatAmount(value.total);
        return '0.00';
    }
    
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
    return isNaN(num) ? '0.00' : num.toFixed(2);
}

function calculateTotalBilled(claims?: Claim[]): number {
    if (!claims) return 0;
    return claims.reduce((sum, claim) => sum + (claim.billed || 0), 0);
}

function calculateTotalPaid(claims?: Claim[]): number {
    if (!claims) return 0;
    return claims.reduce((sum, claim) => sum + (claim.paid || 0), 0);
}

function calculatePatientBalance(claims?: Claim[]): number {
    if (!claims) return 0;
    return claims.reduce((sum, claim) => sum + (claim.patientPay || 0), 0);
}

// Expose function to load existing patient data (called from index.html)
(window as any).loadExistingPatientData = function(data: any) {
    extractedData = data;

    // Show results section (same as after extraction)
    const resultsSection = safeGetElement<HTMLElement>('resultsSection');
    if (resultsSection) {
        resultsSection.classList.add('active');
    }

    // Update status
    const statusBadge = safeGetElement<HTMLElement>('statusBadge');
    if (statusBadge) {
        statusBadge.textContent = 'Loaded';
        statusBadge.className = 'status-badge success';
    }
};

function fillVerificationForm(forceMaster: boolean = false): void {
    if (!extractedData) {
        showError('No data available to transfer');
        return;
    }

    // Get the API key from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const apiKey = urlParams.get('key') || 'demo2024secure';

    // Determine which form to use
    let formFile: string;

    if (forceMaster) {
        // Force master form for comparison
        formFile = 'master-verification-form.html';
    } else {
        // Use clinic-specific form based on clinicId
        const clinicId = extractedData.extraction?.clinicId || safeGetValue('clinic') || 'default';
        formFile = 'master-verification-form.html'; // Default

        if (clinicId === 'ace_dental') {
            formFile = 'ace-verification-form.html';
        } else if (clinicId === 'sdb') {
            formFile = 'sdb-verification-form.html';
        }
    }

    // Store the data in sessionStorage for transfer
    sessionStorage.setItem('extractedPatientData', JSON.stringify(extractedData));

    // Open verification form in new tab
    window.open(`${formFile}?key=${apiKey}&autoFill=true`, '_blank');
}

function downloadJSON(): void {
    if (!extractedData) return;

    const dataStr = JSON.stringify(extractedData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `dental-data-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function viewJSONRaw(): void {
    if (!extractedData) return;

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

// ============= Bulk Results Display =============

function displayBulkResults(data: BulkRunResult): void {
    safeHide('errorMessage');

    const summaryGrid = safeGetElement<HTMLElement>('summaryGrid');
    if (summaryGrid) {
        let html = `
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

        if (Array.isArray(data.results)) {
            for (const r of data.results) {
                const s = r.data?.summary || {};
                const deductible = s?.deductible;
                const maxRemaining = s?.annualMaximum?.remaining;
                html += `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px;">✅</td>
                        <td style="padding: 12px; font-family: monospace;">${r.patient.subscriberId}</td>
                        <td style="padding: 12px;">$${deductible?.remaining || 0}/$${deductible?.amount || 0}</td>
                        <td style="padding: 12px; font-weight: bold;">$${maxRemaining ?? 'N/A'}</td>
                    </tr>`;
            }
        }

        if (Array.isArray(data.errors)) {
            for (const e of data.errors) {
                html += `
                    <tr style="border-bottom: 1px solid #e5e7eb; background: #fee2e2;">
                        <td style="padding: 12px;">❌</td>
                        <td style="padding: 12px; font-family: monospace;">${e.patient.subscriberId}</td>
                        <td style="padding: 12px;" colspan="2">${e.error}</td>
                    </tr>`;
            }
        }

        html += `
                    </tbody>
                </table>
                <div style="margin-top: 20px;">
                    <button class="btn" onclick="downloadBulkJSON()" style="margin-right: 10px;">📥 Download JSON</button>
                    <button class="btn" onclick="downloadBulkCSV()" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">📊 Download CSV</button>
                </div>
            </div>`;
        summaryGrid.innerHTML = html;
    }

    const actionButtons = document.querySelector('.action-buttons') as HTMLElement | null;
    if (actionButtons) actionButtons.style.display = 'none';

    const resultsSection = safeGetElement<HTMLElement>('resultsSection');
    if (resultsSection) resultsSection.classList.add('active');

    const statusBadge = safeGetElement<HTMLElement>('statusBadge');
    if (statusBadge) {
        statusBadge.textContent = 'Success';
        statusBadge.className = 'status-badge success';
    }
}

// ============= Bulk Download Functions =============

function downloadBulkJSON(): void {
    if (!extractedData) return;
    const dataStr = JSON.stringify(extractedData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const filename = `bulk-dnoa-${new Date().toISOString().split('T')[0]}.json`;
    const a = document.createElement('a');
    a.href = dataUri;
    a.download = filename;
    a.click();
}

function downloadBulkCSV(): void {
    if (!extractedData) return;
    const data = extractedData as BulkRunResult;
    let csv = 'Status,MemberID,Deductible_Remaining,Deductible_Total,Maximum_Remaining\n';

    if (Array.isArray(data.results)) {
        for (const r of data.results) {
            const s = r.data?.summary || {};
            const d = s?.deductible || {};
            const max = s?.annualMaximum?.remaining;
            csv += `Success,${r.patient.subscriberId},${d.remaining || 0},${d.amount || 0},${max ?? 'N/A'}\n`;
        }
    }

    if (Array.isArray(data.errors)) {
        for (const e of data.errors) {
            csv += `Failed,${e.patient.subscriberId},ERROR,ERROR,ERROR\n`;
        }
    }

    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    const filename = `bulk-dnoa-${new Date().toISOString().split('T')[0]}.csv`;
    const a = document.createElement('a');
    a.href = dataUri;
    a.download = filename;
    a.click();
}

// ============= OTP Handling =============

async function submitOTP(): Promise<void> {
    const otpInput = safeGetElement<HTMLInputElement>('otpInput');
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
        } else {
            showError('Failed to submit OTP');
        }
    } catch (error) {
        showError('Error submitting OTP');
    }
}

// ============= Main Extraction Function =============

async function handleExtraction(event: Event): Promise<void> {
    event.preventDefault();
    
    hideError();
    safeSetHTML('logsContainer', '');
    
    const logsSection = safeGetElement<HTMLElement>('logsSection');
    const resultsSection = safeGetElement<HTMLElement>('resultsSection');
    
    if (logsSection) {
        logsSection.classList.add('active');
        // Scroll to logs section when extraction starts
        setTimeout(() => {
            logsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
    if (resultsSection) {
        resultsSection.classList.remove('active');
    }
    
    // Clear previous results
    const summaryGrid = safeGetElement<HTMLElement>('summaryGrid');
    const cdtCodesSection = safeGetElement<HTMLElement>('cdtCodesSection');
    if (summaryGrid) summaryGrid.innerHTML = '';
    if (cdtCodesSection) cdtCodesSection.innerHTML = '';
    
    const statusBadge = safeGetElement<HTMLElement>('statusBadge');
    if (statusBadge) {
        statusBadge.textContent = 'Running';
        statusBadge.className = 'status-badge running';
    }
    
    // Disable button
    const extractBtn = safeGetElement<HTMLButtonElement>('extractBtn');
    if (extractBtn) {
        extractBtn.disabled = true;
    }
    
    const btnText = safeGetElement<HTMLElement>('btnText');
    if (btnText) {
        btnText.textContent = 'Extracting...';
    }
    
    // Prepare request data
    const portal = safeGetValue('portal') as PortalType;
    const clinicId = safeGetValue('clinic');
    const requestData: ExtractionRequest = {
        portal,
        firstName: safeGetValue('firstName'),
        lastName: safeGetValue('lastName'),
        subscriberId: safeGetValue('subscriberId'),
        dateOfBirth: safeGetValue('dateOfBirth'),
        clinicId
    };
    
    // Handle DNOA bulk mode
    if (portal === 'DNOA') {
        const modeSelect = document.getElementById('extractionMode') as HTMLSelectElement;
        let selectedMode = modeSelect ? modeSelect.value : 'single';

        if (selectedMode === 'bulk') {
            // Parse textarea content
            const bulkTextarea = document.getElementById('bulkPatientsTextarea') as HTMLTextAreaElement;
            const bulkPatients: BulkPatient[] = [];

            if (bulkTextarea && bulkTextarea.value) {
                const lines = bulkTextarea.value.trim().split('\n');

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith('...')) continue;

                    // Support multiple delimiters: comma, tab, semicolon
                    const parts = trimmed.split(/[,\t;]+/).map(p => p.trim());

                    if (parts.length >= 2) {
                        const [subscriberId, dateOfBirth] = parts;
                        bulkPatients.push({ subscriberId, dateOfBirth, firstName: '', lastName: '' });
                    }
                }
            }

            if (bulkPatients.length === 0) {
                showError('Please enter at least one patient (Member ID and Date of Birth)');
                if (extractBtn) extractBtn.disabled = false;
                if (btnText) btnText.textContent = 'Extract Data';
                return;
            }

            // Use 'patients' field for server contract
            requestData.mode = 'bulk';
            requestData.patients = bulkPatients;  // CORRECT FIELD NAME
            // Clear single patient fields
            requestData.firstName = '';
            requestData.lastName = '';
            requestData.subscriberId = '';
            requestData.dateOfBirth = '';

            if (btnText) btnText.textContent = `Extracting ${bulkPatients.length} patients...`;
        }
    }
    // Add mode for DDINS portal
    else if (portal === 'DDINS') {
        const modeRadios = document.getElementsByName('extractionMode');
        Array.from(modeRadios).forEach(radio => {
            if ((radio as HTMLInputElement).checked) {
                requestData.mode = (radio as HTMLInputElement).value as 'single' | 'bulk';
            }
        })

        // For bulk mode, clear patient fields
        if (requestData.mode === 'bulk') {
            requestData.firstName = '';
            requestData.lastName = '';
            requestData.subscriberId = '';
            requestData.dateOfBirth = '';
        }
    }
    
    // Close existing SSE connection
    if (eventSource) {
        eventSource.close();
    }
    
    // Create new SSE connection
    eventSource = new EventSource(`/api/stream?key=${apiKey}`);
    
    eventSource.addEventListener('log', (e: MessageEvent) => {
        const data: LogEvent = JSON.parse(e.data);
        addLog(data.message, data.level || 'info');
    });
    
    eventSource.addEventListener('otp_required', () => {
        safeShow('otpSection');
        const otpInput = safeGetElement<HTMLInputElement>('otpInput');
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
    
    // Send extraction request
    try {
        const response = await fetch(`/api/extract?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        const result: ExtractionResponse = await response.json();
        
        if (extractBtn) {
            extractBtn.disabled = false;
        }
        if (btnText) {
            btnText.textContent = 'Extract Data';
        }
        
        if (result.success && result.data) {
            extractedData = result.data;

            // Check if it's bulk mode response
            if (result.mode === 'bulk') {
                displayBulkResults(result.data as BulkRunResult);
            } else {
                displayResults(result.data as ExtractionResult);
            }
        } else {
            showError(result.error || 'Extraction failed');
            if (statusBadge) {
                statusBadge.textContent = 'Failed';
                statusBadge.className = 'status-badge error';
            }
        }
    } catch (error) {
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
    } finally {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
    }
}

// ============= Event Listeners =============

function initializeEventListeners(): void {
    // Portal change listener
    const portalSelect = safeGetElement<HTMLSelectElement>('portal');
    if (portalSelect && isSelectElement(portalSelect)) {
        portalSelect.addEventListener('change', (e: Event) => {
            const target = e.target as HTMLSelectElement;
            const portal = target.value as PortalType;

            // Clear logs and previous results when switching portals
            safeSetHTML('logsContainer', '');

            // Hide and clear results section
            const resultsSection = safeGetElement<HTMLElement>('resultsSection');
            if (resultsSection) {
                resultsSection.classList.remove('active');
            }

            // Clear summary grid and CDT codes
            const summaryGrid = safeGetElement<HTMLElement>('summaryGrid');
            const cdtCodesSection = safeGetElement<HTMLElement>('cdtCodesSection');
            if (summaryGrid) summaryGrid.innerHTML = '';
            if (cdtCodesSection) cdtCodesSection.innerHTML = '';

            // Clear any error messages
            safeHide('errorMessage');
            safeSetHTML('errorMessage', '');

            // Fill form with test data for the new portal
            fillFormWithTestData(portal);
        });
    }

    // Clinic change listener
    const clinicSelect = safeGetElement<HTMLSelectElement>('clinic');
    if (clinicSelect && isSelectElement(clinicSelect)) {
        clinicSelect.addEventListener('change', () => {
            const portal = safeGetValue('portal') as PortalType;
            // Refresh test data based on new clinic selection
            fillFormWithTestData(portal);
        });
    }
    
    // Bulk patient counter for DNOA
    const bulkTextarea = document.getElementById('bulkPatientsTextarea') as HTMLTextAreaElement;
    if (bulkTextarea) {
        const updateCounter = () => {
            const lines = bulkTextarea.value.trim().split('\n');
            let validCount = 0;

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('...')) continue;

                // Support multiple delimiters
                const parts = trimmed.split(/[,\t;]+/).map(p => p.trim());
                if (parts.length >= 2) {
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

    // DNOA mode toggle
    const modeSelect = document.getElementById('extractionMode') as HTMLSelectElement;
    if (modeSelect) {
        modeSelect.addEventListener('change', () => {
            const portal = safeGetValue('portal') as PortalType;
            updateFormFieldVisibility(portal);
        });
    }
    
    // Form submission
    const form = safeGetElement<HTMLFormElement>('extractForm');
    if (form && isFormElement(form)) {
        form.addEventListener('submit', handleExtraction);
    }
    
    // OTP submission
    const submitOtpBtn = safeGetElement<HTMLButtonElement>('submitOtpBtn');
    if (submitOtpBtn) {
        submitOtpBtn.addEventListener('click', submitOTP);
    }
    
    const otpInput = safeGetElement<HTMLInputElement>('otpInput');
    if (otpInput && isInputElement(otpInput)) {
        otpInput.addEventListener('keypress', (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                submitOTP();
            }
        });
    }
}

// ============= Initialization =============

function initialize(): void {
    // Initialize event listeners first
    initializeEventListeners();
    
    // Then fill default values (after DOM is guaranteed to be ready)
    const portalSelect = safeGetElement<HTMLSelectElement>('portal');
    if (portalSelect && isSelectElement(portalSelect)) {
        const portal = portalSelect.value as PortalType || 'DDINS';
        fillFormWithTestData(portal);
    }
    
    // Check VPN location
    checkVPNLocation();
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', initialize);

// ============= Global Functions (for HTML onclick) =============

// Make functions available globally for HTML onclick handlers
(window as any).downloadJSON = downloadJSON;
(window as any).viewJSONRaw = viewJSONRaw;
(window as any).resetForm = resetForm;
(window as any).fillVerificationForm = fillVerificationForm;
(window as any).downloadBulkJSON = downloadBulkJSON;
(window as any).downloadBulkCSV = downloadBulkCSV;
