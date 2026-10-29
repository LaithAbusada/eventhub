import mongoose from 'mongoose';
import { config } from '../src/config.js';
import { es } from '../src/db/elastic.js';
import { rebuildIndex } from '../src/services/search.js';

await mongoose.connect(config.mongoUrl);

try {
  const count = await rebuildIndex();
  console.log(`Reindexed ${count} events`);
} catch (err) {
  console.error(`Could not reindex: ${err.message || err.name}. Is Elasticsearch running?`);
  process.exitCode = 1;
} finally {
  // Open connections would keep the script running
  await mongoose.disconnect();
  await es.close();
}
