// Rebuilds the Elasticsearch events index from MongoDB, the source of truth.
// Run it with: npm run reindex   (for example after search was down and missed some changes)
import mongoose from 'mongoose';
import { config } from '../src/config.js';
import { es } from '../src/db/elastic.js';
import { rebuildIndex } from '../src/services/search.js';

await mongoose.connect(config.mongoUrl);

try {
  const count = await rebuildIndex();
  console.log(`Reindexed ${count} events`);
} catch (e) {
  console.error(`Could not reindex: ${e.message || e.name}. Is Elasticsearch running?`);
  process.exitCode = 1;
} finally {
  // Both connections stay open otherwise, and the script never exits
  await mongoose.disconnect();
  await es.close();
}
