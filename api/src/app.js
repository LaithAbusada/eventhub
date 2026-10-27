import express from 'express';

import { errorHandler, notFound } from './errors.js';
import { authRoutes } from './routes/auth.js';
import { eventRoutes } from './routes/events.js';
import { venueRoutes } from './routes/venues.js';
import { meRoutes } from './routes/me.js';
import { statsRoutes } from './routes/stats.js';

export const app = express();

// Turns a JSON request body into req.body
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/me', meRoutes);
app.use('/api/stats', statsRoutes);

// After every route: nothing matched, so make a 404
app.use(notFound);

// Always last: turns every error into our JSON error shape
app.use(errorHandler);
