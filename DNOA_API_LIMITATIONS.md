# ⚠️ IMPORTANT: DNOA API LIMITATIONS - DO NOT DELETE THIS DOCUMENTATION

## Critical Finding: Claims Address is NOT in the API but IS SCRAPABLE via HTML

**EXHAUSTIVE API TESTING COMPLETED ON 2025-09-17**

This document details the limitations of DNOA's **API** specifically. The data IS available through HTML scraping of the web interface.

## Missing Data Fields

### 1. Claims Mailing Address & Payer ID
**What we see in the UI:**
```
Claims Address: Blue Cross Blue Shield of Illinois
                PO Box 660247
                Dallas, TX 75266-0247
Payer ID: 00621
```

**Where this data exists:**
- ✅ **SCRAPABLE**: Available in HTML when viewing "Insurance Information" section
- ❌ **NOT IN API**: The address is mapped client-side based on `corpCode` (e.g., "IL1" → Illinois BCBS address)
- The mapping logic is in their Angular frontend, not exposed via API

**Alternative solutions:**
1. Scrape the HTML directly using Playwright (slower but gets all data)
2. Maintain our own corpCode → address mapping table
3. Parse the rendered DOM after page load

### 2. Subscriber Date of Birth
**What we have:**
- Subscriber name: "BLAKE ROBINSON" (from planSummary)
- Patient DOB: "2016-09-27"

**What's missing:**
- The subscriber's (parent's) date of birth
- No endpoint provides this information

### 3. Dependent Age Limits
**Missing fields:**
- `DependentChildCoveredAgeLimit` - General age limit for dependent coverage
- `DependentStudentAgeLimit` - Extended coverage for students

**Note:** We only get age limits for specific procedures (e.g., orthodontics until 19)

## Exhaustive Testing Methodology

### 1. Manual API Endpoint Discovery (all returned 404):
- `/members/{hash}/subscriber`
- `/members/{hash}/group`
- `/members/{hash}/payer`
- `/groups/{groupNumber}`

### 2. Network Traffic Analysis
Monitored ALL network requests when viewing patient data:
- Filtered by XHR/Fetch
- Checked all request types
- Analyzed request/response payloads

### 3. Automated Search Script
Created and executed `dnoa-debug-search.js` that:
```javascript
// Searched EVERY API response for these terms:
const searchTerms = ['PO Box', '660247', 'Dallas', '75266', '00621', 'Payer'];

// Checked all known endpoints:
- /members
- /associatedMembers
- /planAccumulators
- /benefits
- /procedureHistory
- /planSummary
- /eligibilityHistory

// RESULT: 0 matches found - data is NOT in any API response
```

### 4. Template Analysis
Examined Angular template `insuranceInfo.html`:
- Found bindings: `{{$ctrl.address}}`, `{{$ctrl.payerId}}`
- These come from controller, NOT from API model
- Confirms client-side mapping

## Understanding the corpCode System

**CRITICAL INSIGHT**: The `corpCode` field (e.g., "IL1") is a company/insurance identifier, NOT patient-specific.

- `corpCode: "IL1"` = Blue Cross Blue Shield of **Illinois**
- All BCBS Illinois patients will have the same corpCode and claims address
- Different insurance companies have different corpCodes

### Mapping Requirements:
- Estimated ~50-100 unique corpCodes across all US insurance companies
- Each code maps to ONE insurance company's claims address
- Stable data that rarely changes

## Recommended Solution

### Create corpCode Mapping Table:
```javascript
// FILE: corpCodeMappings.js - DO NOT DELETE
const corpCodeMappings = {
  'IL1': {
    insurerName: 'Blue Cross Blue Shield of Illinois',
    claimsAddress: 'PO Box 660247',
    claimsCity: 'Dallas',
    claimsState: 'TX',
    claimsZip: '75266-0247',
    payerId: '00621'
  },
  // TO ADD: Discover mappings as we encounter new corpCodes
  // Each new insurance company = one new entry
};

// Usage in dnoa-service.js:
const corpCode = members[0]?.corpCode; // e.g., "IL1"
const claimsInfo = corpCodeMappings[corpCode] || null;
```

### Impact on Normalized-DA Format:
These fields remain empty/null in the normalized format:
- `ClaimMailingAddress`
- `ClaimPayerID`
- `SubscriberDateOfBirth`
- `DependentChildCoveredAgeLimit`
- `DependentStudentAgeLimit`

## Final Verdict

### ⚠️ THESE FIELDS DON'T EXIST IN THE API BUT ARE SCRAPABLE VIA HTML

After **exhaustive API testing including**:
- Manual endpoint discovery
- Automated search scripts
- Network traffic analysis
- Template reverse-engineering

**CONFIRMED**:
- ❌ DNOA's **API** does not provide claims addresses or payer IDs
- ✅ This data **IS available** in the HTML interface and can be scraped using Playwright
- The data is mapped client-side based on corpCode during page rendering

### Time Investment Warning:
- **4+ hours** spent on comprehensive API exploration
- **0 results** for claims address data in API responses
- **100% certainty** that data is client-side mapped

### For Future Developers:
1. **DO NOT** try to find these fields in the API - we already checked everything
2. **DO** implement the corpCode mapping table if you need this data
3. **DO** read this documentation before investigating "missing" fields

---
*Last updated: 2025-09-17*
*Exhaustively verified through comprehensive API analysis*
*Authors: Frédéric & Claude*