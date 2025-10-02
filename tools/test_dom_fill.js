#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const Module = require('module');

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request && request.endsWith('.js') && request.startsWith('.') && parent && parent.filename && parent.filename.endsWith('.ts')) {
    const candidate = request.slice(0, -3) + '.ts';
    try {
      return originalResolveFilename.call(this, candidate, parent, isMain, options);
    } catch (err) {
      const candidateIndex = path.join(candidate, 'index.ts');
      try {
        return originalResolveFilename.call(this, candidateIndex, parent, isMain, options);
      } catch (_) {
        // fall-through
      }
    }
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    esModuleInterop: true
  }
});

const htmlPath = path.join(__dirname, '..', 'public', 'verification-form.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const dom = new JSDOM(htmlContent, { url: 'http://localhost/verification-form.html' });

// Expose DOM globals
const { window } = dom;
const expose = [
  'window', 'document', 'Node', 'Element', 'HTMLElement', 'HTMLInputElement',
  'HTMLSelectElement', 'HTMLTextAreaElement', 'HTMLTableElement', 'HTMLTableRowElement',
  'HTMLTableCellElement', 'HTMLSpanElement', 'navigator', 'Event', 'CustomEvent'
];
for (const key of expose) {
  if (window[key]) {
    global[key] = window[key];
  }
}
if (!global.navigator) {
  global.navigator = { userAgent: 'node.js' };
}

document.queryCommandSupported = () => false;

document.execCommand = () => false;

const { fillVerificationFormFromExtraction } = require('../src/public/mapping/index.ts');

const jsonPath = process.argv[2] || '/tmp/ddins_data.json';
if (!fs.existsSync(jsonPath)) {
  console.error(`JSON file not found: ${jsonPath}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
fillVerificationFormFromExtraction(data);

// Collect stats
const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
const radioGroups = new Map();
inputs
  .filter(el => el instanceof HTMLInputElement && el.type === 'radio')
  .forEach(el => {
    const name = el.name || 'radio';
    if (!radioGroups.has(name)) radioGroups.set(name, []);
    radioGroups.get(name).push(el);
  });
const radiosWithSelection = new Set(
  Array.from(radioGroups.entries())
    .filter(([, group]) => group.some(r => r.checked))
    .map(([name]) => name)
);

let filled = 0;
let total = 0;
const details = [];
const unfilled = [];
for (const el of inputs) {
  const labelEl = el.closest('.form-group, .coverage-item, .note-item');
  const labelText = labelEl ? (labelEl.querySelector('label, .note-question')?.textContent || '').trim() : el.name || el.id || el.className;
  const isRadio = el instanceof HTMLInputElement && el.type === 'radio';
  const value = el.type === 'checkbox' || isRadio ? el.checked : el.value;
  const hasExtractedClass = el.classList && el.classList.contains('has-extracted-value');
  if (labelEl) {
    total += 1;
    const groupSelected = isRadio && radiosWithSelection.has(el.name || 'radio');
    if ((typeof value === 'string' && value.trim()) || (typeof value === 'boolean' && value) || hasExtractedClass || groupSelected) {
      filled += 1;
      details.push({ label: labelText, value: isRadio ? groupSelected : value, type: el.type });
    }
    else {
      unfilled.push({ label: labelText, type: el.type, value });
    }
  }
}

console.log(`Filled ${filled} inputs/selects out of ${total}`);
console.log('Examples of filled fields:');
for (const entry of details.slice(0, 30)) {
  console.log(`  ${entry.label}: ${entry.value}`);
}

if (unfilled.length) {
  console.log('\nFirst missing fields:');
  for (const entry of unfilled.slice(0, 30)) {
    console.log(`  ${entry.label} (type=${entry.type})`);
  }
}

let radioFilled = 0;
for (const [name, group] of radioGroups.entries()) {
  if (group.some(r => r.checked)) radioFilled += 1;
}
console.log(`Radio groups with a selection: ${radioFilled} / ${radioGroups.size}`);
