#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const sessionPath = path.join(__dirname, '.ddins-session', 'storageState.json');

if (!fs.existsSync(sessionPath)) {
    console.error('❌ Session file not found at:', sessionPath);
    process.exit(1);
}

const ptUserId = process.env.DDINS_PT_USERID || process.env.DDINS_USERNAME;
const plocId = process.env.DDINS_PLOC;

if (!ptUserId) {
    console.error('❌ No DDINS_PT_USERID or DDINS_USERNAME found in .env');
    process.exit(1);
}

console.log('🔧 Fixing DDINS session...');
console.log('   PT User ID:', ptUserId);
console.log('   PLOC ID:', plocId || 'not set');

// Read the existing session
const storageState = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));

// Ensure origins array exists
if (!storageState.origins) {
    storageState.origins = [];
}

// Find or create DDINS origin
let ddinsOrigin = storageState.origins.find(o => o.origin === 'https://www.deltadentalins.com');
if (!ddinsOrigin) {
    ddinsOrigin = {
        origin: 'https://www.deltadentalins.com',
        localStorage: []
    };
    storageState.origins.push(ddinsOrigin);
}

// Ensure localStorage array exists
if (!ddinsOrigin.localStorage) {
    ddinsOrigin.localStorage = [];
}

// Update or add pt-userid
let ptUserIdItem = ddinsOrigin.localStorage.find(item => item.name === 'pt-userid');
if (ptUserIdItem) {
    console.log('   ✓ Updating existing pt-userid');
    ptUserIdItem.value = ptUserId;
} else {
    console.log('   ✓ Adding pt-userid to localStorage');
    ddinsOrigin.localStorage.push({
        name: 'pt-userid',
        value: ptUserId
    });
}

// Update or add PLOC if available
if (plocId) {
    let plocItem = ddinsOrigin.localStorage.find(item => item.name === 'mtvPlocId');
    if (plocItem) {
        console.log('   ✓ Updating existing mtvPlocId');
        plocItem.value = plocId;
    } else {
        console.log('   ✓ Adding mtvPlocId to localStorage');
        ddinsOrigin.localStorage.push({
            name: 'mtvPlocId',
            value: plocId
        });
    }
}

// Write the updated session back
fs.writeFileSync(sessionPath, JSON.stringify(storageState, null, 2));
console.log('✅ Session fixed and saved!');
console.log('');
console.log('You can now test extraction through the web interface.');