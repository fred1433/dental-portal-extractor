import { normalizeLabel } from '../shared/utils.js';
function attachFillIndicator(target) {
    if (!target)
        return;
    if (target.querySelector('.fill-indicator'))
        return;
    const indicator = document.createElement('span');
    indicator.className = 'fill-indicator';
    indicator.title = 'Auto-filled from extraction';
    indicator.textContent = '✓';
    if (target.classList.contains('procedure-code')) {
        indicator.classList.add('inline-indicator');
        target.appendChild(indicator);
    }
    else {
        target.appendChild(indicator);
    }
}
function processSpecialNotesRadios(map) {
    const questionMappings = {
        'missing-tooth': 'Missing Tooth Clause',
        'waiting-period': 'Waiting Period',
        'srp-category': 'SRP Category',
        'endo-category': 'Endo Category',
        'ext-category': 'Extraction Category'
    };
    for (const [radioName, fieldKey] of Object.entries(questionMappings)) {
        const value = map[fieldKey];
        if (!value)
            continue;
        const radios = document.querySelectorAll(`input[type="radio"][name="${radioName}"]`);
        radios.forEach(radio => {
            const radioEl = radio;
            const radioValue = radioEl.value.toLowerCase();
            const mappedValue = value.toLowerCase();
            if ((radioValue === 'yes' && mappedValue === 'yes') ||
                (radioValue === 'no' && mappedValue === 'no') ||
                (radioValue === 'basic' && mappedValue === 'basic') ||
                (radioValue === 'major' && mappedValue === 'major')) {
                radioEl.checked = true;
                radioEl.classList.add('has-extracted-value');
                const questionDiv = radioEl.closest('.radio-group');
                if (questionDiv) {
                    questionDiv.classList.add('has-extracted-value');
                    const htmlDiv = questionDiv;
                    htmlDiv.style.animation = 'fieldFilledPulse 0.5s ease';
                    setTimeout(() => {
                        htmlDiv.style.animation = '';
                    }, 500);
                    const noteItem = questionDiv.closest('.note-item');
                    if (noteItem) {
                        noteItem.classList.add('has-extracted-value');
                    }
                    const noteQuestion = noteItem?.querySelector('.note-question');
                    attachFillIndicator(noteQuestion ?? htmlDiv);
                }
            }
        });
    }
}
function processProcedureTables(map) {
    const tables = document.querySelectorAll('.procedure-table');
    tables.forEach(table => {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const codeSpan = row.querySelector('.procedure-code');
            if (!codeSpan)
                return;
            const code = codeSpan.textContent?.trim();
            if (!code)
                return;
            let codesToTry = [code];
            if (code.includes('/')) {
                codesToTry = [code, ...code.split('/').map(c => c.trim())];
            }
            else if (code.includes('-') && code.match(/D(\d+)-D(\d+)/)) {
                const match = code.match(/D(\d+)-D(\d+)/);
                if (match) {
                    const start = parseInt(match[1]);
                    const end = parseInt(match[2]);
                    const generatedCodes = [];
                    for (let num = start; num <= end; num++) {
                        generatedCodes.push(`D${num}`);
                    }
                    codesToTry = [code, ...generatedCodes];
                }
            }
            let lastDate, frequency, limitations, notes;
            for (const tryCode of codesToTry) {
                lastDate = lastDate || map[`${tryCode}_last_date`];
                frequency = frequency || map[`${tryCode}_frequency`];
                limitations = limitations || map[`${tryCode}_limitations`];
                notes = notes || map[`${tryCode}_notes`];
            }
            const inputs = row.querySelectorAll('input');
            if (inputs.length >= 4) {
                if (frequency && inputs[0]) {
                    inputs[0].value = frequency;
                    inputs[0].classList.add('has-extracted-value');
                }
                if (limitations && inputs[1]) {
                    inputs[1].value = limitations;
                    inputs[1].classList.add('has-extracted-value');
                }
                if (lastDate && inputs[2]) {
                    inputs[2].value = lastDate;
                    inputs[2].classList.add('has-extracted-value');
                }
                if (notes && inputs[3]) {
                    inputs[3].value = notes;
                    inputs[3].classList.add('has-extracted-value');
                }
                if (lastDate || frequency || limitations || notes) {
                    row.classList.add('has-history-data');
                    const htmlRow = row;
                    htmlRow.style.animation = 'fieldFilledPulse 0.5s ease';
                    setTimeout(() => {
                        htmlRow.style.animation = '';
                    }, 500);
                    attachFillIndicator(codeSpan);
                }
            }
        });
    });
}
export function applyFormFieldMapToDOM(map) {
    const groups = Array.from(document.querySelectorAll('.form-group'));
    const coverageItems = Array.from(document.querySelectorAll('.coverage-item'));
    const inputs = new Map();
    document.querySelectorAll('.fill-indicator').forEach(el => el.remove());
    groups.forEach(group => {
        group.classList.remove('field-filled', 'field-empty');
    });
    for (const group of groups) {
        const labelText = group.querySelector('label')?.textContent;
        const input = group.querySelector('input, select, textarea');
        if (!labelText || !input)
            continue;
        inputs.set(normalizeLabel(labelText), { input, group });
    }
    for (const item of coverageItems) {
        const labelText = item.querySelector('label')?.textContent;
        const input = item.querySelector('input, select');
        if (!labelText || !input)
            continue;
        inputs.set(normalizeLabel(labelText), { input, group: item });
    }
    processProcedureTables(map);
    processSpecialNotesRadios(map);
    for (const [key, value] of Object.entries(map)) {
        const normalizedKey = normalizeLabel(key);
        const item = inputs.get(normalizedKey);
        if (!item)
            continue;
        const { input, group } = item;
        const stringValue = String(value).trim();
        const valueExists = value != null && stringValue !== '';
        const isMeaningfulValue = valueExists &&
            stringValue !== '$0.00' &&
            stringValue !== 'N/A';
        if (valueExists) {
            if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
                input.value = value;
            }
            else if (input instanceof HTMLSelectElement) {
                input.value = value;
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (isMeaningfulValue) {
            group.classList.add('field-filled');
            input.classList.add('has-extracted-value');
            const label = group.querySelector('label');
            if (label) {
                attachFillIndicator(label);
            }
            else {
                attachFillIndicator(group);
            }
            group.style.animation = 'fieldFilledPulse 0.5s ease';
            setTimeout(() => {
                group.style.animation = '';
            }, 500);
        }
        else {
            group.classList.add('field-empty');
        }
    }
}
//# sourceMappingURL=binder.js.map