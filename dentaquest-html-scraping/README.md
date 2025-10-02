# DentaQuest Service - Enhanced Edition

## Features

### Core Features
- Automatic login with session persistence
- Patient search and data extraction
- Service history extraction
- Claims data extraction
- Eligibility verification

### Enhanced Features (New)

#### 1. Intelligent HTML Extraction
```javascript
const options = {
  intelligentExtraction: true  // Enable intelligent element detection
};
```

Uses multiple strategies to find data:
- CSS selector matching
- Data attribute detection
- Pattern matching for text content
- Lightning component (Salesforce) detection

#### 2. HTML Structure Capture
```javascript
const options = {
  captureHTML: true,          // Capture raw HTML
  captureStructure: true      // Analyze page structure
};
```

Saves HTML samples and structure analysis for debugging and pattern learning.

#### 3. Element Mappings
Predefined mappings for common elements:
- Patient information
- Eligibility details
- Service history tables
- Coverage information

## Usage

```javascript
const DentaQuestService = require('./dentaquest-service');

const service = new DentaQuestService({
  username: 'your_username',
  password: 'your_password',
  locationId: 'location_id',
  providerId: 'provider_id'
});

// Initialize
await service.initialize(false); // headless = false for debugging

// Extract with enhanced options
const data = await service.extractPatientData(patient, console.log, {
  captureHTML: true,
  captureStructure: true,
  intelligentExtraction: true
});

// Close
await service.close();
```

## Environment Variables
```
DENTAQUEST_USERNAME=your_username
DENTAQUEST_PASSWORD=your_password
DENTAQUEST_LOCATION_ID=your_location_id
DENTAQUEST_PROVIDER_ID=your_provider_id
CAPTURE_HTML=true
CAPTURE_STRUCTURE=true
INTELLIGENT_EXTRACTION=true
```

## Testing
```bash
node test-intelligent-extraction.js
```

## Output Structure
```javascript
{
  patient: {},
  serviceHistory: [],
  claims: [],
  eligibilityHistory: [],
  overview: {
    raw: "...",
    structured: {},
    extractionMethod: "hybrid"
  },
  htmlSamples: {},           // If captureHTML enabled
  pageStructures: {},        // If captureStructure enabled
  extractionMethods: {},     // Methods used for each section
  intelligentExtraction: {}  // Results from intelligent extraction
}
```