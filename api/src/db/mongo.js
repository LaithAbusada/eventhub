import { setTimeout as sleep } from 'node:timers/promises';
import mongoose from 'mongoose';

const MAX_TRIES = 30;

export async function connectMongo(url) {
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    try {
      // Give up each attempt after 3 s, so the loop moves on to the next one
      await mongoose.connect(url, { serverSelectionTimeoutMS: 3000 });
      console.log('MongoDB connected');
      return;
    } catch (err) {
      console.log(`MongoDB not ready (attempt ${attempt} of ${MAX_TRIES}): ${err.message}`);
      await sleep(2000);
    }
  }

  throw new Error(`MongoDB never came up after ${MAX_TRIES} attempts`);
}
