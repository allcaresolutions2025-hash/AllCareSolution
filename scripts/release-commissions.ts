// Run via: npm run db:release-commissions
// Releases commissions whose buyback window has passed. Recommended to run as a daily cron.

import { releaseMaturedCommissions } from "../src/lib/commission";

(async () => {
  const count = await releaseMaturedCommissions();
  console.log(`Released ${count} commission(s)`);
})();
