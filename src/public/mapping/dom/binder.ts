import type { FormFieldMap, VerificationFieldKey } from '../shared/types.js';
import { normalizeLabel } from '../shared/utils.js';

type FormInput = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function attachFillIndicator(target: Element | null) {
  if (!target) return;
  if (target.querySelector('.fill-indicator')) return;

  const indicator = document.createElement('span');
  indicator.className = 'fill-indicator';
  indicator.title = 'Auto-filled from extraction';
  indicator.textContent = '✓';

  if (target.classList.contains('procedure-code')) {
    indicator.classList.add('inline-indicator');
    target.appendChild(indicator);
  } else {
    target.appendChild(indicator);
  }
}

function processSpecialNotesRadios(map: any) {
  // Map of questions to field names in our data
  const questionMappings = {
    'missing-tooth': 'Missing Tooth Clause',
    'waiting-period': 'Waiting Period',
    'srp-category': 'SRP Category',
    'endo-category': 'Endo Category',
    'ext-category': 'Extraction Category',
    'previous-extractions': 'Previous Extractions Covered'
  };

  for (const [radioName, fieldKey] of Object.entries(questionMappings)) {
    const value = map[fieldKey];
    if (!value) continue;

    // Find the radio buttons ANYWHERE in document (not just .special-notes)
    const radios = document.querySelectorAll(`input[type="radio"][name="${radioName}"]`);
    radios.forEach(radio => {
      const radioEl = radio as HTMLInputElement;
      const radioValue = radioEl.value.toLowerCase();
      const mappedValue = value.toLowerCase();

      // Check if this radio should be selected
        if ((radioValue === 'yes' && mappedValue === 'yes') ||
            (radioValue === 'no' && mappedValue === 'no') ||
            (radioValue === 'basic' && mappedValue === 'basic') ||
            (radioValue === 'major' && mappedValue === 'major')) {
          radioEl.checked = true;
          radioEl.classList.add('has-extracted-value');

          // Add visual indicator to the parent question
          const questionDiv = radioEl.closest('.radio-group');
          if (questionDiv) {
            questionDiv.classList.add('has-extracted-value');
            const htmlDiv = questionDiv as HTMLElement;
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

function processCoverageQuestions(map: any) {
  // Map Coverage Questions field names to HTML input names
  const coverageQuestionMappings: Record<string, string> = {
    'd9232-covered': 'D9232 Coverage',
    'sealant-age-limit': 'Sealant Age Limit',
    'time-srp-perio': 'Time Between SRP and Perio Maintenance',
    'composite-downgrade': 'Composite Downgrade',
    'work-progress': 'Work in Progress Covered',
    'pano-fmx': 'Pano Same Day as FMX',
    'medical-first': 'D7210/D7953 Medical First',
    'limited-share': 'Limited Share Frequency',
    'd0140-same-day': 'D0140 Same Day',
    'srp-waiting': 'SRP Waiting Period',
    'core-buildup-day': 'Core Buildup Day',
    'crown-payment': 'Crown Payment Day'
  };

  for (const [inputName, fieldKey] of Object.entries(coverageQuestionMappings)) {
    const value = map[fieldKey];
    if (!value) continue;

    // Check if it's a radio button field
    const radios = document.querySelectorAll(`input[type="radio"][name="${inputName}"]`);
    if (radios.length > 0) {
      // Handle radio buttons (Yes/No, Prep/Seat, etc.)
      radios.forEach(radio => {
        const radioEl = radio as HTMLInputElement;
        const radioValue = radioEl.value.toLowerCase();
        const mappedValue = String(value).toLowerCase();

        if ((radioValue === 'yes' && mappedValue === 'yes') ||
            (radioValue === 'no' && mappedValue === 'no') ||
            (radioValue === 'prep' && mappedValue === 'prep') ||
            (radioValue === 'seat' && mappedValue === 'seat')) {
          radioEl.checked = true;
          radioEl.classList.add('has-extracted-value');

          // Add visual indicator
          const radioGroup = radioEl.closest('tr');
          if (radioGroup) {
            const htmlRow = radioGroup as HTMLElement;
            htmlRow.style.animation = 'fieldFilledPulse 0.5s ease';
            setTimeout(() => {
              htmlRow.style.animation = '';
            }, 500);
          }
        }
      });
    } else {
      // Handle text inputs
      const input = document.querySelector(`input[type="text"][name="${inputName}"]`) as HTMLInputElement;
      if (input) {
        input.value = String(value);
        input.classList.add('has-extracted-value');

        // Add visual indicator
        const row = input.closest('tr');
        if (row) {
          const htmlRow = row as HTMLElement;
          htmlRow.style.animation = 'fieldFilledPulse 0.5s ease';
          setTimeout(() => {
            htmlRow.style.animation = '';
          }, 500);
        }
      }
    }
  }
}

function processProcedureTables(map: any) {
  // Find all procedure tables on the page
  const tables = document.querySelectorAll('.procedure-table');

  tables.forEach(table => {
    const rows = table.querySelectorAll('tbody tr');

    rows.forEach(row => {
      // Get the procedure code from this row
      const codeSpan = row.querySelector('.procedure-code');
      if (!codeSpan) return;

      const code = codeSpan.textContent?.trim();
      if (!code) return;

      // Handle combined codes (e.g., "D0272/D0274" or "D2391-D2394")
      // Try exact match first, then try each code separately
      let codesToTry = [code];
      if (code.includes('/')) {
        // Slash separator: just split
        codesToTry = [code, ...code.split('/').map(c => c.trim())];
      } else if (code.includes('-') && code.match(/D(\d+)-D(\d+)/)) {
        // Hyphen separator: generate all codes in range
        const match = code.match(/D(\d+)-D(\d+)/);
        if (match) {
          const start = parseInt(match[1]);
          const end = parseInt(match[2]);
          const generatedCodes = [];

          // Generate all codes in range (D2391, D2392, D2393, D2394)
          for (let num = start; num <= end; num++) {
            generatedCodes.push(`D${num}`);
          }

          codesToTry = [code, ...generatedCodes];
        }
      }

      // Find data from any matching code
      let lastDate, frequency, limitations, notes;
      for (const tryCode of codesToTry) {
        lastDate = lastDate || map[`${tryCode}_last_date`];
        frequency = frequency || map[`${tryCode}_frequency`];
        limitations = limitations || map[`${tryCode}_limitations`];
        notes = notes || map[`${tryCode}_notes`];
      }

      // Fill the fields in this row
      const inputs = row.querySelectorAll('input');
      if (inputs.length >= 4) {
        // Typically: frequency, limitations, date, notes
        if (frequency && inputs[0]) {
          (inputs[0] as HTMLInputElement).value = frequency;
          inputs[0].classList.add('has-extracted-value');
        }

        if (limitations && inputs[1]) {
          (inputs[1] as HTMLInputElement).value = limitations;
          inputs[1].classList.add('has-extracted-value');
        }

        if (lastDate && inputs[2]) {
          (inputs[2] as HTMLInputElement).value = lastDate;
          inputs[2].classList.add('has-extracted-value');
        }

        if (notes && inputs[3]) {
          (inputs[3] as HTMLInputElement).value = notes;
          inputs[3].classList.add('has-extracted-value');
        }

        // Add visual indicator if any field was filled
        if (lastDate || frequency || limitations || notes) {
          row.classList.add('has-history-data');
          const htmlRow = row as HTMLElement;
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

export function applyFormFieldMapToDOM(map: FormFieldMap) {
  const groups = Array.from(document.querySelectorAll('.form-group')) as HTMLElement[];
  const coverageItems = Array.from(document.querySelectorAll('.coverage-item')) as HTMLElement[];
  const inputs = new Map<string, { input: FormInput; group: HTMLElement }>();

  // First, reset any existing filled states
  document.querySelectorAll('.fill-indicator').forEach(el => el.remove());
  groups.forEach(group => {
    group.classList.remove('field-filled', 'field-empty');
  });

  // Process standard form groups
  for (const group of groups) {
    const labelText = group.querySelector('label')?.textContent;
    const input = group.querySelector('input, select, textarea') as FormInput | null;

    if (!labelText || !input) continue;
    inputs.set(normalizeLabel(labelText), { input, group });
  }

  // Process coverage grid items (Coverage by Category section)
  for (const item of coverageItems) {
    const labelText = item.querySelector('label')?.textContent;
    const input = item.querySelector('input, select') as FormInput | null;

    if (!labelText || !input) continue;
    inputs.set(normalizeLabel(labelText), { input, group: item });
  }

  // Process procedure tables for history data
  processProcedureTables(map);

  // Process Special Notes radio buttons
  processSpecialNotesRadios(map);

  // Process Coverage Questions (special table inputs)
  processCoverageQuestions(map);

  for (const [key, value] of Object.entries(map)) {
    const normalizedKey = normalizeLabel(key as VerificationFieldKey);
    const item = inputs.get(normalizedKey);
    if (!item) continue;

    const { input, group } = item;

    // Check if value exists
    const stringValue = String(value).trim();
    const valueExists = value != null && stringValue !== '';

    // Check if value is meaningful (not default/placeholder values)
    const isMeaningfulValue = valueExists &&
                              stringValue !== '$0.00' &&
                              stringValue !== 'N/A';

    if (valueExists) {
      // Always set the value (even if N/A or $0.00)
      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
        input.value = value;
      } else if (input instanceof HTMLSelectElement) {
        input.value = value;
      }

      // Always trigger events (needed for select to display properly)
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (isMeaningfulValue) {
      // Add visual indicators only for meaningful values
      group.classList.add('field-filled');
      input.classList.add('has-extracted-value');

      const label = group.querySelector('label');
      if (label) {
        attachFillIndicator(label);
      } else {
        attachFillIndicator(group);
      }

      // Trigger animation
      group.style.animation = 'fieldFilledPulse 0.5s ease';
      setTimeout(() => {
        group.style.animation = '';
      }, 500);
    } else {
      group.classList.add('field-empty');
    }
  }
}
