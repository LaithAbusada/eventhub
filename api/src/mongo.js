import mongoose from "mongoose";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

 export async function withRetry(name,fn, {tries = 30 , delayMs = 2000} = {}){

    for (let attempt = 0; attempt <tries; attempt++) {
        try {
            return await fn()
        } catch (e) {
            console.log(`${name} not ready, (attempt ${attempt+1}/${tries}):reason ${e.message}`);
            await sleep(delayMs)
        }
    }
      throw new Error(`${name} never came up`);

}

export async function connectMongo(url) {
  await withRetry("MongoDB",()=>mongoose.connect(url, { serverSelectionTimeoutMS: 3000 }))

    console.log("MongoDB connected");

}