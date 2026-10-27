import { Client } from '@elastic/elasticsearch';

import { config } from '../config.js';

// One client for the whole API. The two options make it fail fast when Elasticsearch is down,
// instead of waiting 30 seconds and retrying 3 times on every request.
export const es = new Client({ node: config.elasticUrl, requestTimeout: 5000, maxRetries: 1 });

// The name of the search index, in one place
export const EVENTS_INDEX = 'events';

// Becomes true once Elasticsearch has answered and the events index exists.
// An object, not a plain boolean, so every file that imports it sees the change.
export const searchStatus = { ready: false };

// The type comment lets the checker confirm every option name and value is one Elasticsearch accepts.
/** @type {Omit<import('@elastic/elasticsearch').estypes.IndicesCreateRequest, 'index'>} */
export const eventsIndexDefinition = {
  settings: {
    analysis: {
      // Lowercases keyword values, so a city filter of "amman" matches "Amman"
      normalizer: {
        lowercase_norm: { type: 'custom', filter: ['lowercase'] },
      },
    },
  },
  mappings: {
    dynamic: 'strict', // refuse any field that isn't listed below
    properties: {
      // text: split into words, for full-text search
      title: { type: 'text' },
      description: { type: 'text' },
      venueName: { type: 'text' },
      // keyword: kept whole, for exact filters; the normalizer makes them ignore case
      city: { type: 'keyword', normalizer: 'lowercase_norm' },
      categories: { type: 'keyword', normalizer: 'lowercase_norm' },
      // date: for "upcoming only", date ranges and sorting by soonest
      startsAt: { type: 'date' },
      // stored as whole cents (price × 100), so prices compare exactly with no floating-point surprises
      price: { type: 'scaled_float', scaling_factor: 100 },
    },
  },
};
