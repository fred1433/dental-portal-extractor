# UHC Claims Data - Limitations Documentation

## Summary
The UHC portal provides claims data at two different levels, with significant limitations on detailed claim access.

## What Works ✅
### `/apps/dental/claimsummary` Endpoint
- **Returns**: Summary table of all claims
- **Format**: JSON with basic claim information
- **Data includes**:
  - Claim ID
  - Service date
  - Provider name
  - Total billed amount
  - Amount paid
  - Patient responsibility
  - Claim status
- **Status**: FULLY FUNCTIONAL

Example response structure:
```json
{
  "claims": [
    {
      "claimId": "123456",
      "serviceDate": "2025-03-15",
      "provider": "Dr. Smith",
      "billedAmount": "$250.00",
      "paidAmount": "$200.00",
      "patientAmount": "$50.00",
      "status": "PROCESSED"
    }
  ]
}
```

## What Doesn't Work ❌
### Individual Claim Details
- **Problem**: Cannot retrieve detailed line-item information for each claim
- **Missing data**:
  - Individual procedure codes with their specific payments
  - Detailed EOB (Explanation of Benefits) information
  - Adjustment reasons and codes
  - Detailed breakdown of denials or partial payments
  - PDF versions of EOBs

### Attempted Solutions That Failed
1. **Direct EOB PDF Download**
   - No endpoint found for downloading EOB PDFs
   - The portal likely generates these server-side with additional authentication

2. **Individual Claim Detail Endpoint**
   - Attempted: `/apps/dental/claimdetail?claimId=XXX`
   - Result: 404 or requires different authentication context

3. **GraphQL Claims Query**
   - The GraphQL endpoint doesn't expose detailed claim data
   - Limited to provider preferences and user info

## Current Solution
The `uhc-extractor.js` script successfully extracts:
- ✅ Patient eligibility and benefits
- ✅ Annual maximums and deductibles
- ✅ 74+ procedures with coverage details (via `/utilizationHistory`)
- ✅ Claims summary table (high-level overview)
- ❌ Detailed claim line items
- ❌ EOB PDFs

## Technical Notes
The limitation appears to be intentional:
- Summary data is readily available via REST API
- Detailed claim data likely requires:
  - Additional authentication context
  - Different user role/permissions
  - Or may be restricted to patient portal only

## Recommendation
For practices needing detailed claim information:
1. Use the claims summary for overview and reconciliation
2. Manual review in portal for specific claim details when needed
3. Consider requesting API access upgrade from UHC if available

---
*Last updated: September 2025*
*Script: uhc-extractor.js remains the primary extraction tool*