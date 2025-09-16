/**
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

interface ExtractionRequest {
    portal: PortalType;
    subscriberId: string;
    dateOfBirth: string;
    firstName: string;
    lastName: string;
    mode?: 'single' | 'bulk';
}

interface ExtractionResponse {
    success: boolean;
    data?: ExtractionResult;
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
    normalizedDA?: any;
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

// ============= Global State =============

let eventSource: EventSource | null = null;
let extractedData: ExtractionResult | null = null;

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

function fillFormWithTestData(portal: PortalType): void {
    const data = testData[portal];
    if (data) {
        safeSetValue('firstName', data.firstName);
        safeSetValue('lastName', data.lastName);
        safeSetValue('subscriberId', data.subscriberId);
        safeSetValue('dateOfBirth', data.dateOfBirth);
    }
    
    // Show/hide DDINS mode toggle
    const ddinsMode = safeGetElement<HTMLElement>('ddinsMode');
    if (ddinsMode) {
        if (portal === 'DDINS') {
            ddinsMode.style.display = 'block';
        } else {
            ddinsMode.style.display = 'none';
        }
    }
    
    // Show/hide form fields based on portal and mode
    updateFormFieldVisibility(portal);
}

function updateFormFieldVisibility(portal: PortalType): void {
    const firstName = safeGetElement<HTMLElement>('firstName');
    const lastName = safeGetElement<HTMLElement>('lastName');
    const subscriberId = safeGetElement<HTMLElement>('subscriberId');
    const dateOfBirth = safeGetElement<HTMLElement>('dateOfBirth');
    
    // Get their parent containers
    const firstNameGroup = firstName?.parentElement;
    const lastNameGroup = lastName?.parentElement;
    const subscriberIdGroup = subscriberId?.parentElement;
    const dateOfBirthGroup = dateOfBirth?.parentElement;
    
    if (portal === 'DDINS') {
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
    } else {
        // Show all fields for other portals
        if (firstNameGroup) firstNameGroup.style.display = '';
        if (lastNameGroup) lastNameGroup.style.display = '';
        if (subscriberIdGroup) subscriberIdGroup.style.display = '';
        if (dateOfBirthGroup) dateOfBirthGroup.style.display = '';
        
        // Ensure required attributes are set
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
    }
    
    // Update status
    const statusBadge = safeGetElement<HTMLElement>('statusBadge');
    if (statusBadge) {
        statusBadge.textContent = 'Success';
        statusBadge.className = 'status-badge success';
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

function fillVerificationForm(): void {
    if (!extractedData) {
        showError('No data available to transfer');
        return;
    }

    // Store the data in sessionStorage for transfer
    sessionStorage.setItem('extractedPatientData', JSON.stringify(extractedData));

    // Get the API key from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const apiKey = urlParams.get('key') || 'demo2024secure';

    // Navigate to the verification form
    window.location.href = `/verification-form.html?key=${apiKey}&autoFill=true`;
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

function viewJSONNormalized(): void {
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
    const requestData: ExtractionRequest = {
        portal,
        firstName: safeGetValue('firstName'),
        lastName: safeGetValue('lastName'),
        subscriberId: safeGetValue('subscriberId'),
        dateOfBirth: safeGetValue('dateOfBirth')
    };
    
    // Add mode for DDINS portal
    if (portal === 'DDINS') {
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
            displayResults(result.data);
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
    
    // DDINS mode change listener
    const modeRadios = document.getElementsByName('extractionMode');
    Array.from(modeRadios).forEach(radio => {
        radio.addEventListener('change', () => {
            const portal = safeGetValue('portal') as PortalType;
            if (portal === 'DDINS') {
                updateFormFieldVisibility(portal);
            }
        });
    })
    
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
(window as any).viewJSONNormalized = viewJSONNormalized;
(window as any).resetForm = resetForm;
(window as any).fillVerificationForm = fillVerificationForm;