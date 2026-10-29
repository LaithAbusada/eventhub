import { Router } from 'express';
import mongoose from 'mongoose';
import { Registration } from '../models/Registration.js';
import { Event } from '../models/Event.js';
import { auth, requireOrganizer } from '../middleware/auth.js';

export const meRoutes = Router();

meRoutes.get('/registrations', auth, async (req, res) => {
  const registrations = await Registration.find({ user: req.user.sub, status: 'confirmed' })
    .sort({ createdAt: -1 })
    .populate({
      path: 'event',
      select: 'title startsAt price venue',
      populate: { path: 'venue', select: 'name city' },
    });
  res.json(registrations);
});

meRoutes.get('/events', auth, requireOrganizer, async (req, res) => {
  // aggregate() doesn't convert id strings to ObjectIds the way find() does
  const organizerId = new mongoose.Types.ObjectId(req.user.sub);

  const events = await Event.aggregate([
    { $match: { organizer: organizerId } },
    { $sort: { startsAt: 1 } },
    {
      $lookup: {
        from: 'registrations',
        localField: '_id',
        foreignField: 'event',
        pipeline: [{ $match: { status: 'confirmed' } }],
        as: 'registrations',
      },
    },
    // The venue, as one object instead of an array of one
    { $lookup: { from: 'venues', localField: 'venue', foreignField: '_id', as: 'venue' } },
    { $unwind: '$venue' },
    {
      $addFields: {
        registrationCount: { $size: '$registrations' },
        seatsLeft: { $subtract: ['$venue.capacity', '$seatsTaken'] },
      },
    },
    {
      $project: {
        title: 1,
        startsAt: 1,
        price: 1,
        categories: 1,
        venue: { _id: 1, name: 1, city: 1, capacity: 1 },
        registrationCount: 1,
        seatsLeft: 1,
      },
    },
  ]);
  res.json(events);
});
