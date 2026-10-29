import mongoose from "mongoose";

// Waits the given number of milliseconds
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Calls fn until it works, waiting between attempts. Gives up after `tries` attempts.
export async function withRetry(name, fn, options = {}) {
  const tries = options.tries || 30;
  const delayMs = options.delayMs || 2000;

  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      console.log(`${name} not ready, (attempt ${attempt}/${tries}):reason ${e.message}`);
      await sleep(delayMs);
    }
  }

  throw new Error(`${name} never came up`);
}

export async function connectMongo(url) {
  // One connection attempt. It gives up after 3 seconds, so the retry loop moves on quickly.
  async function connectOnce() {
    await mongoose.connect(url, { serverSelectionTimeoutMS: 3000 });
  }

  await withRetry("MongoDB", connectOnce);
  console.log("MongoDB connected");
}
