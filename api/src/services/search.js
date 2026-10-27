import { es, EVENTS_INDEX, eventsIndexDefinition, searchStatus } from "../db/elastic.js";
import { Event } from "../models/Event.js";
// Not used by name, but populate('venue') needs Mongoose to know the Venue model.
// Without this import, any script that calls rebuildIndex on its own crashes with MissingSchemaError.
import "../models/Venue.js";

// Waits the given number of milliseconds
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// What one event looks like inside Elasticsearch.
// Expects an event loaded with .populate('venue', 'name city'): venue name and city come from the venue.
export function toSearchDoc(event) {
  return {
    title: event.title,
    description: event.description,
    venueName: event.venue.name,
    city: event.venue.city,
    categories: event.categories,
    startsAt: event.startsAt,
    price: event.price,
  };
}

// Deletes the events index and builds it again from MongoDB, the source of truth.
// Returns how many events it indexed.
export async function rebuildIndex() {
  // ignore 404: on the very first run there's no index to delete yet
  await es.indices.delete({ index: EVENTS_INDEX }, { ignore: [404] });
  await es.indices.create({ index: EVENTS_INDEX, ...eventsIndexDefinition });

  const events = await Event.find().populate('venue', 'name city');

  if (events.length > 0) {
    const operations = events.flatMap((event) => {
      const action = { index: { _index: EVENTS_INDEX, _id: String(event._id) } };
      const document = toSearchDoc(event);
      return [action, document];
    });

    const result = await es.bulk({ operations, refresh: true });

    if (result.errors) {
      throw new Error('Some events could not be indexed');
    }
  }

  return events.length;
}



export async function startSearch() {
  while (!searchStatus.ready) {
    try {
      const exists = await es.indices.exists({ index: EVENTS_INDEX });
      if (!exists) {
        const count = await rebuildIndex();
        console.log(`Created the events index with ${count} events`);
      }


      searchStatus.ready = true;
      console.log("Elasticsearch connected");
    } catch (e) {
      console.log(`Elasticsearch not ready: ${e.message || e.name}. Trying again in 5s`);
      await sleep(5000);
    }
  }
}

// Copies one event into the search index, after it was created or edited.
// Never throws: MongoDB already has the change, so a search problem must not fail the request.
// If this fails, search is stale for that event until the reindex script runs.
export async function indexEvent(eventId) {
  if (!searchStatus.ready) {
    console.warn(`Warning, Elasticsearch is not ready yet, so event ${eventId} was not indexed. Run the reindex script later.`);
    return;
  }

  try {
    const event = await Event.findById(eventId).populate('venue', 'name city');
    if (!event) {
      console.warn(`Event ${eventId} no longer exists, so there is nothing to index`);
      return;
    }

    const document = toSearchDoc(event);

    await es.index({ index: EVENTS_INDEX, id: String(event._id), document: document });
  } catch (e) {
    console.error(`Could not index event ${eventId}: ${e.message || e.name}`);
  }
}


export async function removeEvent(eventId) {
  if (!searchStatus.ready) {
    console.warn(`Warning, Elasticsearch is not ready yet, so event ${eventId} stays in search until the next reindex.`);
    return;
  }

  try {
    // ignore 404: if the event was never indexed, there's nothing to delete, and that's fine
    await es.delete({ index: EVENTS_INDEX, id: String(eventId) }, { ignore: [404] });
  } catch (e) {
    console.error(`Could not remove event ${eventId} from search: ${e.message || e.name}`);
  }
}