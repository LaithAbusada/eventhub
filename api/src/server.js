import { app } from "./app.js";
import { connectMongo } from "./mongo.js";
import { config } from "./config.js";
import { startSearch } from "./services/search.js";

// Wait for MongoDB first: the API is useless without it
await connectMongo(config.mongoUrl);

// No await: search connects in the background, so the API serves requests even while
// Elasticsearch is starting or down (searches answer 503 until it's ready)
startSearch();

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
