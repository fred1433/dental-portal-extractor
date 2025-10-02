import { extractSpecialNotesAnswers } from '../core/specialNotes.js';
function setRadioValue(name, value) {
    if (!value)
        return;
    const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
    radios.forEach(radio => {
        const radioEl = radio;
        if (radioEl.value.toLowerCase() === value.toLowerCase()) {
            radioEl.checked = true;
            radioEl.classList.add('has-extracted-value');
            const container = radioEl.closest('.radio-group');
            if (container) {
                container.classList.add('has-extracted-value');
                container.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    });
}
function setNoteInput(labelContains, value) {
    if (!value)
        return;
    const inputs = Array.from(document.querySelectorAll('.note-item input[type="text"]'));
    for (const input of inputs) {
        const parent = input.closest('.note-item');
        if (!parent)
            continue;
        const question = parent.querySelector('.note-question')?.textContent || '';
        if (question.toLowerCase().includes(labelContains.toLowerCase())) {
            input.value = value;
            input.classList.add('has-extracted-value');
            parent.classList.add('has-extracted-value');
            break;
        }
    }
}
export function applyProcedureHistory(normalized, raw) {
    const answers = extractSpecialNotesAnswers(normalized, raw || { eligibility: {}, claims: [] });
    setRadioValue('work-progress', answers.workInProgress);
    setRadioValue('pano-fmx', answers.panoFmxSameDay);
    setRadioValue('medical-first', answers.medicalFirst);
    setRadioValue('d9232-covered', answers.d9232Covered);
    setRadioValue('limited-share', answers.limitedShareFrequency);
    setRadioValue('perio-share', answers.perioShareFrequency);
    setRadioValue('composite-downgrade', answers.compositeDowngrade);
    setRadioValue('d0140-same-day', answers.d0140SameDay);
    setRadioValue('srp-waiting', answers.srpWaitingPeriod);
    setRadioValue('core-buildup-day', answers.coreBuildupSameDay);
    const hasWaitingPeriod = normalized.waitingPeriods && normalized.waitingPeriods.length > 0 ? 'yes' : 'no';
    setRadioValue('waiting-period', hasWaitingPeriod);
    if (answers.crownPayment) {
        setRadioValue('crown-payment', answers.crownPayment);
    }
    if (answers.sealantAgeLimit) {
        setNoteInput('sealants', `${answers.sealantAgeLimit} years`);
    }
    if (answers.srpPerioMaintenanceTime) {
        setNoteInput('time between srp', answers.srpPerioMaintenanceTime);
    }
}
//# sourceMappingURL=procedureTables.js.map