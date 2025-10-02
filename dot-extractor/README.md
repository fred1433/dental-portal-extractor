# DOT Data Extractor

Production-ready extraction system for Dental Office Toolkit (DOT) using Playwright's session persistence.

## Features

✅ **Session-based authentication** - Login once, extract many times  
✅ **Complete data extraction** - Benefits, claims, procedures, prior auth  
✅ **HIPAA compliant logging** - PHI masking in all logs  
✅ **Robust error handling** - Retries, rate limiting, session detection  
✅ **Multiple export formats** - JSON and CSV outputs  
✅ **Pagination support** - Handles large claim datasets  

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Login to DOT (Interactive)

```bash
npm run login
```

This will:
- Open a browser window
- Navigate to DOT login page
- Wait for you to login manually (including MFA if required)
- Save the session to `dot-storage.json`

### 3. Extract Patient Data

By member ID:
```bash
npm run extract -- --memberId 916797559
```

By patient details:
```bash
npm run extract -- --firstName Maurice --lastName Berend --birthDate 12/16/1978
```

With custom date range:
```bash
npm run extract -- --memberId 916797559 --from 2025-06-01T00:00:00Z --to 2025-09-13T00:00:00Z
```

## CLI Options

| Option | Description | Example |
|--------|-------------|---------|
| `--memberId` | Member/Subscriber ID | `916797559` |
| `--firstName` | Patient first name | `Maurice` |
| `--lastName` | Patient last name | `Berend` |
| `--birthDate` | Birth date (MM/DD/YYYY) | `12/16/1978` |
| `--from` | Claims start date (ISO) | `2025-06-01T00:00:00Z` |
| `--to` | Claims end date (ISO) | `2025-09-13T00:00:00Z` |
| `--storage` | Session file path | `dot-storage.json` |
| `--output` | Output directory | `out` |
| `--verbose` | Enable debug logging | |
| `--help` | Show help message | |

## Output Files

The extractor creates two files in the `out/` directory:

1. **JSON Bundle** (`patient-{id}-{timestamp}.json`)
   - Complete patient data structure
   - All API responses preserved
   - Metadata and timestamps

2. **Claims CSV** (`claims-{id}-{timestamp}.csv`)
   - Simplified tabular format
   - Ready for Excel/analysis
   - Key financial fields

## Data Structure

```typescript
{
  input: {            // Original search parameters
    memberId: "...",
    firstName: "...",
    lastName: "...",
    birthDate: "..."
  },
  subscriber: {       // Primary member info
    personId: "...",
    role: "Subscriber",
    firstName: "...",
    lastName: "...",
    birthDate: "...",
    memberId: "..."
  },
  family: [           // Dependents/spouse
    {
      personId: "...",
      role: "Dependent",
      firstName: "...",
      lastName: "...",
      birthDate: "..."
    }
  ],
  benefits: {...},    // Coverage details
  routineProcedures: {...}, // Routine procedure coverage
  claims: [...],      // Claims history
  priorAuth: {...},   // Prior authorization codes
  client: {...},      // Client/employer info
  meta: {            // Extraction metadata
    planAcronym: "...",
    clientSpecifiedId: "...",
    subClientSpecifiedId: "...",
    benefitProgramOid: "...",
    extractedAt: "2025-09-13T..."
  }
}
```

## Security & Compliance

⚠️ **HIPAA Compliance Required**

- PHI is automatically masked in logs
- Never commit `dot-storage.json` (contains session)
- Never commit output files (contain PHI)
- Use encryption for data at rest
- Limit access to authorized personnel only
- Follow minimum necessary principle

## Troubleshooting

### Session Expired
```
❌ Error: session expired
```
**Solution:** Run `npm run login` again

### Patient Not Found
```
❌ Error: HTTP 404
```
**Solution:** Verify member ID and patient details

### Rate Limiting
The extractor automatically handles rate limiting with:
- 500-800ms delays between requests
- Exponential backoff on errors
- Automatic retries (max 3)

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   Browser   │────▶│ Session Save │────▶│  Storage   │
│   (Login)   │     │  (Cookies)   │     │   (.json)  │
└─────────────┘     └──────────────┘     └────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   Patient   │────▶│  API Client  │────▶│    DOT     │
│  Extractor  │◀────│ (Playwright) │◀────│  Gateway   │
└─────────────┘     └──────────────┘     └────────────┘
       │
       ▼
┌─────────────┐
│   Output    │
│ (JSON/CSV)  │
└─────────────┘
```

## Production Deployment (Render)

Since Render has ephemeral file storage, the session needs to be restored on each deployment:

### Option 1: Environment Variable (Recommended)
```bash
# After login locally, encode the session:
base64 dot-storage.json | pbcopy  # macOS
base64 dot-storage.json | xclip   # Linux

# Set in Render dashboard:
DOT_SESSION_B64=<paste-encoded-session>
```

The session will be automatically restored from the environment variable on boot.

### Option 2: Upload Session File
Upload `dot-storage.json` to Render after each deployment.

## Development

### Project Structure
```
dot-extractor/
├── src/
│   ├── auth/          # Login & session management
│   ├── sdk/           # DOT API client
│   ├── extractors/    # Data extraction logic
│   ├── scripts/       # CLI scripts
│   └── util/          # Helpers & logging
├── out/               # Output files (gitignored)
├── dot-storage.json   # Session storage (gitignored)
└── package.json
```

### Adding New Endpoints

1. Add endpoint to `src/sdk/dotClient.ts`
2. Update extraction logic in `src/extractors/patientExtractor.ts`
3. Test with real data

## Support

For issues or questions:
1. Check session is valid (`npm run login`)
2. Verify patient exists in DOT
3. Check network/VPN connectivity
4. Review logs with `--verbose` flag