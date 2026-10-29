import { Router } from 'express';
import { Registration } from '../models/Registration.js';

export const statsRoutes = Router();

statsRoutes.get('/top-venues', async (req, res) => {
  const venues = await Registration.aggregate([
    { $match: { status: 'confirmed' } },

    // The event, as one object instead of an array of one
    { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'event' } },
    { $unwind: '$event' },

    {
      $group: {
        _id: '$event.venue',
        registrations: { $sum: 1 },
        tickets: { $sum: '$ticketCount' },
      },
    },

    // _id breaks ties, so the order is always the same
    { $sort: { registrations: -1, _id: 1 } },
    { $limit: 5 },

    { $lookup: { from: 'venues', localField: '_id', foreignField: '_id', as: 'venue' } },
    { $unwind: '$venue' },

    {
      $project: {
        _id: 0,
        venueId: '$_id',
        name: '$venue.name',
        city: '$venue.city',
        registrations: 1,
        tickets: 1,
      },
    },
  ]);

  res.json(venues);
});
