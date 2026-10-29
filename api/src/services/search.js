import { setTimeout as sleep } from 'node:timers/promises';
import { es, EVENTS_INDEX, eventsIndexDefinition } from '../db/elastic.js';
import { HttpError } from '../errors.js';
import { Event } from '../models/Event.js';
// Not used by name, but populate('venue') needs the Venue model registered
import '../models/Venue.js';

let searchReady = false;

// Needs the event loaded with populate('venue', 'name city')
function toSearchDoc(event) {
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
  while (!searchReady) {
    try {
      const exists = await es.indices.exists({ index: EVENTS_INDEX });
      if (!exists) {
        const count = await rebuildIndex();
        console.log(`Created the events index with ${count} events`);
      }

      searchReady = true;
      console.log('Elasticsearch connected');
    } catch (err) {
      console.log(`Elasticsearch not ready: ${err.message || err.name}. Trying again in 5s`);
      await sleep(5000);
    }
  }
}

// Never throws: MongoDB already has the change. If this fails, search is out of date
// for this event until the reindex script runs.
export async function indexEvent(eventId) {
  if (!searchReady) {
    console.warn(`Search isn't ready: event ${eventId} was not indexed. Run the reindex script later.`);
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
  } catch (err) {
    console.error(`Could not index event ${eventId}: ${err.message || err.name}`);
  }
}

export async function removeEvent(eventId) {
  if (!searchReady) {
    console.warn(`Search isn't ready: event ${eventId} stays in search until the next reindex.`);
    return;
  }

  try {
    // ignore 404: nothing to delete if it was never indexed
    await es.delete({ index: EVENTS_INDEX, id: String(eventId) }, { ignore: [404] });
  } catch (err) {
    console.error(`Could not remove event ${eventId} from search: ${err.message || err.name}`);
  }
}

const SEARCH_UNAVAILABLE_MESSAGE = "Search is unavailable right now. Try again in a minute.";

function buildTextQuery(q) {
  if (!q) {
    return { match_all: {} };
  }

  return {
    multi_match: {
      query: q,
      fields: ["title^3", "description"],
      fuzziness: "AUTO",
    },
  };
}

function buildFilters(params) {
  const filters = [];

  // "now/d" is the start of today, so events from earlier today still show
  filters.push({ range: { startsAt: { gte: "now/d" } } });

  if (params.city) {
    filters.push({ term: { city: params.city } });
  }

  if (params.category) {
    filters.push({ term: { categories: params.category } });
  }

  if (params.from) {
    filters.push({ range: { startsAt: { gte: params.from } } });
  }

  if (params.to) {
    // "||/d" rounds up to the end of that day, so the whole "to" day is included
    filters.push({ range: { startsAt: { lte: `${params.to}||/d` } } });
  }

  // !== undefined because 0 is a real price (maxPrice=0 means free events only)
  if (params.minPrice !== undefined) {
    filters.push({ range: { price: { gte: params.minPrice } } });
  }

  if (params.maxPrice !== undefined) {
    filters.push({ range: { price: { lte: params.maxPrice } } });
  }

  return filters;
}

/** @returns {import('@elastic/elasticsearch').estypes.Sort} */
function buildSortOrder(sort) {
  if (sort === "soonest") {
    return [{ startsAt: "asc" }];
  }

  if (sort === "cheapest") {
    return [{ price: "asc" }, { startsAt: "asc" }];
  }

  // relevance. The client's types want the long { order } form for _score.
  return [{ _score: { order: "desc" } }, { startsAt: "asc" }];
}

// Elasticsearch refuses to page past its first 10,000 results
const MAX_SEARCH_RESULTS = 10000;

export async function searchEvents(params) {
  const skip = (params.page - 1) * params.size;
  if (skip + params.size > MAX_SEARCH_RESULTS) {
    throw new HttpError(400, "BAD_QUERY", "Search can only page through the first 10,000 results");
  }

  if (!searchReady) {
    throw new HttpError(503, "SEARCH_UNAVAILABLE", SEARCH_UNAVAILABLE_MESSAGE);
  }

  const textQuery = buildTextQuery(params.q);
  const filters = buildFilters(params);
  const sortOrder = buildSortOrder(params.sort);

  let response;
  try {
    response = await es.search({
      index: EVENTS_INDEX,
      from: skip,
      size: params.size,
      track_total_hits: true,
      query: {
        bool: {
          must: [textQuery],
          filter: filters,
        },
      },
      sort: sortOrder,
      highlight: {
        // Escapes the organizer's own text, so only our <mark> tags are real HTML
        encoder: "html",
        pre_tags: ["<mark>"],
        post_tags: ["</mark>"],
        fields: {
          title: { number_of_fragments: 0 },
          description: { fragment_size: 160, number_of_fragments: 1 },
        },
      },
    });
  } catch (err) {
    console.error(`Search failed: ${err.message || err.name}`);
    throw new HttpError(503, "SEARCH_UNAVAILABLE", SEARCH_UNAVAILABLE_MESSAGE);
  }

  const results = [];
  for (const hit of response.hits.hits) {
    const document = /** @type {object} */ (hit._source);

    let highlight = {};
    if (hit.highlight) {
      highlight = hit.highlight;
    }

    results.push({ _id: hit._id, ...document, highlight: highlight });
  }

  // Elasticsearch 8 always sends total as { value, relation }; the client's types also allow a number
  const totalHits = /** @type {import('@elastic/elasticsearch').estypes.SearchTotalHits} */ (
    response.hits.total
  );

  return {
    total: totalHits.value,
    page: params.page,
    size: params.size,
    results: results,
  };
}