import { normalizeDentaQuest } from '../adapters/dentaquest.js';
import { normalizeDDINS } from '../adapters/ddins.js';
export function normalizeEligibility(data) {
    const portal = data.portal?.toUpperCase();
    switch (portal) {
        case 'DENTAQUEST':
            return normalizeDentaQuest(data);
        case 'DDINS':
        default:
            return normalizeDDINS(data);
    }
}
//# sourceMappingURL=normalizer.js.map