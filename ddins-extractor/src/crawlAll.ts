// src/crawlAll.ts
import pLimit from 'p-limit';
import { createDdinsApi, closeApi } from './ddinsApi';
import { getPracticeLocations } from './locations';
import { iterateRoster, getPatientFamily } from './patients';
import { getEligibilityBundle } from './benefits';
import { iterateClaims, getClaimDetail } from './claims';
import { writeFileSync, appendFileSync, mkdirSync, existsSync } from 'fs';
import * as path from 'path';

type Options = {
  storageStatePath: string;
  ptUserId: string;
  practiceLocationId: string; // ou on le découvre via getPracticeLocations
  outDir?: string;
  maxPatients?: number; // pour limiter en dev/test
};

function pickEnrolleeId(row: any): string | undefined {
  return row?.enrolleeId || row?.enrolleeID || row?.enrolleeKey || row?.memberIdHash || row?.e1;
}

export async function crawlAllPatients(opts: Options) {
  const out = opts.outDir ?? 'out';
  
  // Créer le dossier de sortie s'il n'existe pas
  if (!existsSync(out)) {
    mkdirSync(out, { recursive: true });
  }
  
  const api = await createDdinsApi({ 
    storageStatePath: opts.storageStatePath, 
    ptUserId: opts.ptUserId 
  });

  console.log('🔍 Validating practice location...');
  // (facultatif) valider la location choisie
  await getPracticeLocations(api, opts.practiceLocationId);

  const limit = pLimit(4);
  
  // Initialiser les fichiers de sortie
  writeFileSync(path.join(out, 'patients.ndjson'), '');
  writeFileSync(path.join(out, 'claims.ndjson'), '');
  writeFileSync(path.join(out, 'claim_details.ndjson'), '');
  writeFileSync(path.join(out, 'eligibility.ndjson'), '');

  let patientCount = 0;
  const maxPatients = opts.maxPatients ?? Infinity;

  console.log('📋 Fetching patient roster...');
  for await (const page of iterateRoster(api, { 
    mtvPlocId: opts.practiceLocationId, 
    pageSize: 15 
  })) {
    const tasks = page.map((row: any) => limit(async () => {
      if (patientCount >= maxPatients) return;
      patientCount++;
      
      const enrolleeId = pickEnrolleeId(row);
      if (!enrolleeId) {
        console.warn('⚠️ No enrolleeId found for patient:', row);
        return;
      }

      console.log(`👤 Processing patient ${patientCount}: ${enrolleeId}`);

      try {
        // 1) Éligibilité/bénéfices + famille
        const [bundle, family] = await Promise.all([
          getEligibilityBundle(api, enrolleeId).catch(err => {
            console.error(`❌ Benefits failed for ${enrolleeId}:`, err.message);
            return null;
          }),
          getPatientFamily(api, enrolleeId).catch(err => {
            console.error(`❌ Family failed for ${enrolleeId}:`, err.message);
            return null;
          })
        ]);

        appendFileSync(
          path.join(out, 'patients.ndjson'), 
          JSON.stringify({ enrolleeId, roster: row, family }) + '\n'
        );
        
        if (bundle) {
          appendFileSync(
            path.join(out, 'eligibility.ndjson'), 
            JSON.stringify({ enrolleeId, ...bundle }) + '\n'
          );
        }

        // 2) Claims (liste)
        for await (const claims of iterateClaims(api, {
          practiceLocationId: opts.practiceLocationId,
          timePeriod: 12,
          pageSize: 50,
          enrolleeId
        })) {
          for (const c of claims) {
            appendFileSync(
              path.join(out, 'claims.ndjson'), 
              JSON.stringify({ enrolleeId, claim: c }) + '\n'
            );
            
            // 3) Détail du claim
            const claimId = c?.claimId || c?.id || c?.claimNumber;
            if (claimId) {
              try {
                const detail = await getClaimDetail(api, String(claimId), opts.practiceLocationId);
                appendFileSync(
                  path.join(out, 'claim_details.ndjson'), 
                  JSON.stringify({ enrolleeId, claimId, detail }) + '\n'
                );
              } catch (err: any) {
                console.error(`❌ Claim detail failed for ${claimId}:`, err.message);
              }
            }
          }
        }
        
        console.log(`✅ Completed patient ${enrolleeId}`);
      } catch (err: any) {
        console.error(`❌ Failed processing patient ${enrolleeId}:`, err.message);
      }
    }));

    await Promise.all(tasks);
    
    if (patientCount >= maxPatients) {
      console.log(`🛑 Reached max patients limit (${maxPatients})`);
      break;
    }
  }

  await closeApi(api);
  console.log(`✅ Extraction complete! Processed ${patientCount} patients`);
  console.log(`📁 Results saved to: ${path.resolve(out)}`);
}