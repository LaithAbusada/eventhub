import express from 'express';

import { errorHandler, notFound } from './errors.js';
import { authRoutes } from './routes/auth.js';
import { eventRoutes } from './routes/events.js';
import { venueRoutes } from './routes/venues.js';
import { meRoutes } from './routes/me.js';
import { statsRoutes } from './routes/stats.js';

export const app = express();

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/me', meRoutes);
app.use('/api/stats', statsRoutes);

app.use(notFound);

// Must be last
app.use(errorHandler);
