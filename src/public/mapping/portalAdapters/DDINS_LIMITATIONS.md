# DDINS Data Extraction Limitations

This document lists the **27 fields** from the Master Verification Form that **cannot be auto-filled** from DDINS (Delta Dental Insurance) extraction data.

## Why These Fields Cannot Be Auto-Filled

These are **insurance policy rules** that are not exposed in DDINS's eligibility API responses. They require manual verification by calling the insurance company or checking policy documents.

---

## 📋 Policy Rules (18 fields)

### General Policy Questions
1. **Work in Progress Covered**
   - Whether treatments started before coverage are reimbursed
   - Not available in DDINS extraction

2. **Waiting Period Basic Details**
   - Specific details about basic services waiting period
   - `eligibility.wait` is often `null` or incomplete

3. **Waiting Period Major Details**
   - Specific details about major services waiting period
   - `eligibility.wait` is often `null` or incomplete

### Procedure-Specific Rules

4. **D9232 Coverage** (Sedation)
   - Code not typically listed in procedure coverage
   - D9222/D9223 may be available but not D9232

5. **Teeth Covered** (for sealants D1351)
   - Which teeth are eligible (e.g., only molars)
   - Not specified in procedure limitations

6. **Quads Per Day** (for SRP)
   - Maximum quadrants allowed per visit
   - Complex billing rule not in extraction

7. **Arestin D4381**
   - Local antimicrobial agent coverage
   - Code not typically listed

8. **SRP Same Day** (with Prophy/Perio Maintenance)
   - Same-day billing restrictions
   - Policy rule not in data structure

9. **D0140 Same Day**
   - Limited exam same-day restrictions
   - Frequency limits exist but not combination rules

10. **Core Buildup Day** (Prep vs. Seat)
    - When D2950 is paid (prep day or seat day)
    - Payment timing rule not exposed

11. **Crown Payment Day** (Prep vs. Seat)
    - When crown is paid (prep day or seat day)
    - Payment timing rule not exposed

12. **Crown Age Limit**
    - Age restrictions for crown coverage
    - Codes may not be listed with age limits

13. **Crown Downgrade**
    - Whether PFM crowns downgraded to metal for molars
    - Downgrade rules not in extraction

14. **Downgrade Which Teeth**
    - Specific teeth subject to downgrade
    - Not specified in procedure data

15. **Implants D6010**
    - Endosteal implant coverage
    - Code typically not covered/listed

16. **Pano Same Day as FMX**
    - Whether D0330 + D0210 allowed same day
    - Combination rule not exposed

17. **D7210/D7953 Billed To Medical First**
    - Whether extractions billed to medical insurance first
    - Cross-insurance rule not in dental extraction

18. **Limited Share Frequency**
    - Whether D0140 shares frequency with other exams
    - May be derivable but often unclear

---

## 📊 Procedure History (9 fields)

DDINS's `eligibility.hist.procedures[]` **only contains basic evaluation codes** (D0120, D0140, D0150). The following procedure histories are **not available**:

19. **Sealant History** (D1351)
20. **Filling History** (D2391/D2330)
21. **SRP History** (D4341)
22. **EXT History** (D7140/D7240)
23. **Crown History** (D2740)
24. **Bridge History** (D6xxx codes)
25. **Build Up History** (D2950)
26. **Post & Core History** (D2954)
27. **Denture History** (D5110/D5221)

### Why History Is Limited

From Gemini's analysis of Karen.json:
> "L'historique fourni (`eligibility.hist`) est très limité et ne contient que quelques évaluations orales (D0120, D0140, D0150). Pour tous les autres codes demandés, la réponse est qu'il n'y a **aucun historique de service trouvé** dans cette extraction de données."

---

## ✅ What IS Available (8 fields)

For completeness, here are the fields that **can** be auto-filled from DDINS:

1. ✅ **Maximum Used** → `eligibility.maxDed.maximumsInfo[].amountInfo.totalUsedAmount`
2. ✅ **Deductible Remaining** → `eligibility.maxDed.deductiblesInfo[].amountInfo.remainingAmount`
3. ✅ **Lifetime Deductible** → `eligibility.maxDed.deductiblesInfo[type=Lifetime].amountInfo.remainingAmount`
4. ✅ **Previous Extractions Covered** → `eligibility.pkg.missingToothIndicator` (inverse logic: false = covered)
5. ✅ **OCC Coverage %** → `eligibility.pkg.treatment[].procedure[code=D9944].network.coverageDetail.benefitCoverageLevel`
6. ✅ **OCC Frequency** → `eligibility.pkg.treatment[].procedure[code=D9944].limitation.frequencyLimitationText`
7. ✅ **OCC Limitations** → Same as above
8. ✅ **Co-Pay** → `network.coverageDetail.copayAmount` (often $0.00 for percentage-based plans)

---

## 💡 Recommendations

### For Users
- These 27 fields must be filled **manually** after calling the insurance company
- Use this form as a checklist during verification calls

### For Developers
- Consider adding a "Manual Verification Required" indicator for these fields
- Could implement a "call script" helper to guide users through questions

---

## 📚 References

- Analysis based on patient **Karen.json** (2835 unique paths)
- Gemini AI analysis performed: 2025-10-08
- DDINS portal adapter: `src/public/mapping/portalAdapters/ddins.ts`
