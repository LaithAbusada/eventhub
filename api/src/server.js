import { app } from "./app.js";
import { connectMongo } from "./mongo.js";
import { config } from "./config.js";

// Wait for MongoDB first: the API is useless without it
await connectMongo(config.mongoUrl);

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
