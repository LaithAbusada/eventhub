import { Client } from '@elastic/elasticsearch';
import { config } from '../config.js';

// The client's defaults are a 10-minute timeout and 3 retries; fail fast instead
export const es = new Client({ node: config.elasticUrl, requestTimeout: 5000, maxRetries: 1 });

export const EVENTS_INDEX = 'events';

/** @type {Omit<import('@elastic/elasticsearch').estypes.IndicesCreateRequest, 'index'>} */
export const eventsIndexDefinition = {
  settings: {
    analysis: {
      normalizer: {
        lowercase_norm: { type: 'custom', filter: ['lowercase'] },
      },
    },
  },
  mappings: {
    dynamic: 'strict',
    properties: {
      title: { type: 'text' },
      description: { type: 'text' },
      venueName: { type: 'text' },
      city: { type: 'keyword', normalizer: 'lowercase_norm' },
      categories: { type: 'keyword', normalizer: 'lowercase_norm' },
      startsAt: { type: 'date' },
      // Stored as whole fils (1 JOD = 1000 fils), so prices compare exactly
      price: { type: 'scaled_float', scaling_factor: 1000 },
    },
  },
};
