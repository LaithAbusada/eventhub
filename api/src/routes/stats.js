import { Router } from 'express';
import { Registration } from '../models/Registration.js';

export const statsRoutes = Router();

// The top 5 venues by number of confirmed registrations
statsRoutes.get('/top-venues', async (req, res) => {
  const venues = await Registration.aggregate([
    // 1. Only confirmed registrations
    { $match: { status: 'confirmed' } },
    // 2. Attach each registration's event (an array of one), then make it a plain object
    { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'event' } },
    { $unwind: '$event' },
    // 3. One group per venue: count registrations and add up tickets
    { $group: { _id: '$event.venue', registrations: { $sum: 1 }, tickets: { $sum: '$ticketCount' } } },
    // 4. Biggest first (the _id breaks ties, so the order never changes between calls), keep 5
    { $sort: { registrations: -1, _id: 1 } },
    { $limit: 5 },
    // 5. Attach the venue's name and city
    { $lookup: { from: 'venues', localField: '_id', foreignField: '_id', as: 'venue' } },
    { $unwind: '$venue' },
    { $project: { _id: 0, venueId: '$_id', name: '$venue.name', city: '$venue.city', registrations: 1, tickets: 1 } },
  ]);
  res.json(venues);
});
