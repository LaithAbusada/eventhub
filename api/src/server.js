import { app } from './app.js';
import { connectMongo } from './db/mongo.js';
import { config } from './config.js';
import { startSearch } from './services/search.js';

await connectMongo(config.mongoUrl);

// No await: search connects in the background. Searches answer 503 until it's ready.
startSearch();

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
