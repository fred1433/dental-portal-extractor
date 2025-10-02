import { normalizeDentaQuest } from '../adapters/dentaquest.js';
import type { ExtractionResult, NormalizedEligibility } from '../shared/types.js';
import { normalizeDDINS } from '../adapters/ddins.js';

export function normalizeEligibility(data: ExtractionResult): NormalizedEligibility {
  const portal = data.portal?.toUpperCase();

  switch (portal) {
    case 'DENTAQUEST':
      return normalizeDentaQuest(data);
    case 'DDINS':
    default:
      return normalizeDDINS(data);
  }
}
