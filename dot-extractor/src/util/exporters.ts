import * as fs from 'fs';
import { flattenClaimDetail } from './buildPayloads';

/**
 * Export extraction data to JSON
 */
export function exportToJSON(data: any, filename: string) {
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`💾 JSON saved to ${filename}`);
}

/**
 * Export claims to CSV format
 */
export function exportToCSV(data: any, filename: string) {
  const rows: any[] = [];
  
  // Process subscriber claims
  const subscriber = data.subscriber;
  if (subscriber && subscriber.claims) {
    for (const claim of subscriber.claims) {
      const patient = {
        subscriberName: `${subscriber.info.subscriberFirstName} ${subscriber.info.subscriberLastName}`,
        name: `${subscriber.info.subscriberFirstName} ${subscriber.info.subscriberLastName}`,
        relationship: 'Subscriber',
        groupId: subscriber.info.clientInformation?.groupId,
        subGroupId: subscriber.info.clientInformation?.subGroupId
      };
      
      const flatRows = flattenClaimDetail(claim, claim.detail, patient);
      rows.push(...flatRows);
    }
  }
  
  // Process dependent claims
  if (data.dependents) {
    for (const dependent of data.dependents) {
      if (dependent.claims) {
        for (const claim of dependent.claims) {
          const patient = {
            subscriberName: `${subscriber.info.subscriberFirstName} ${subscriber.info.subscriberLastName}`,
            name: `${dependent.info.firstName} ${dependent.info.lastName}`,
            relationship: dependent.info.relationshipToSubscriber || 'Dependent',
            groupId: subscriber.info.clientInformation?.groupId,
            subGroupId: subscriber.info.clientInformation?.subGroupId
          };
          
          const flatRows = flattenClaimDetail(claim, claim.detail, patient);
          rows.push(...flatRows);
        }
      }
    }
  }
  
  if (rows.length === 0) {
    console.log('⚠️  No claims to export to CSV');
    return;
  }
  
  // Build CSV
  const headers = [
    'subscriberName',
    'patientName',
    'relationship',
    'claimNumber',
    'serviceDate',
    'procedureCode',
    'tooth',
    'surfaces',
    'billedAmount',
    'allowedAmount',
    'paidAmount',
    'patientPayment',
    'status',
    'providerName',
    'providerNPI',
    'planAcronym'
  ];
  
  const csvLines = [headers.join(',')];
  
  for (const row of rows) {
    const values = headers.map(h => {
      const val = row[h] || '';
      // Quote if contains comma or quotes
      if (val.toString().includes(',') || val.toString().includes('"')) {
        return `"${val.toString().replace(/"/g, '""')}"`;
      }
      return val;
    });
    csvLines.push(values.join(','));
  }
  
  fs.writeFileSync(filename, csvLines.join('\n'));
  console.log(`💾 CSV saved to ${filename} (${rows.length} rows)`);
}

/**
 * Generate summary statistics
 */
export function generateSummary(data: any) {
  let totalClaims = 0;
  let totalWithDetails = 0;
  let totalLineItems = 0;
  let uniqueProcedures = new Set<string>();
  
  // Count subscriber claims
  if (data.subscriber?.claims) {
    totalClaims += data.subscriber.claims.length;
    for (const claim of data.subscriber.claims) {
      if (claim.detail) {
        totalWithDetails++;
        if (claim.detail.lineItems) {
          totalLineItems += claim.detail.lineItems.length;
          claim.detail.lineItems.forEach((li: any) => {
            if (li.procedureCode) uniqueProcedures.add(li.procedureCode);
          });
        }
      }
    }
  }
  
  // Count dependent claims  
  if (data.dependents) {
    for (const dep of data.dependents) {
      if (dep.claims) {
        totalClaims += dep.claims.length;
        for (const claim of dep.claims) {
          if (claim.detail) {
            totalWithDetails++;
            if (claim.detail.lineItems) {
              totalLineItems += claim.detail.lineItems.length;
              claim.detail.lineItems.forEach((li: any) => {
                if (li.procedureCode) uniqueProcedures.add(li.procedureCode);
              });
            }
          }
        }
      }
    }
  }
  
  return {
    totalClaims,
    totalWithDetails,
    totalLineItems,
    uniqueProcedures: Array.from(uniqueProcedures).sort(),
    detailCoverage: totalClaims > 0 ? `${Math.round(totalWithDetails/totalClaims*100)}%` : '0%'
  };
}