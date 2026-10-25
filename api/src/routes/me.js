import { Router } from 'express';
import mongoose from 'mongoose';
import { Registration } from '../models/Registration.js';
import { Event } from '../models/Event.js';
import { auth, requireRole } from '../middleware/auth.js';

export const meRoutes = Router();

// My confirmed registrations, newest first, each with its event and the event's venue
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

// The organizer dashboard: each of my events with its registration count and remaining seats
meRoutes.get('/events', auth, requireRole('organizer'), async (req, res) => {
  // aggregate() does NOT turn id strings into ObjectIds the way find() does, so convert it here
  const organizerId = new mongoose.Types.ObjectId(req.user.sub);

  const events = await Event.aggregate([
    // 1. Only my events
    { $match: { organizer: organizerId } },
    // 2. Attach each event's confirmed registrations as an array (empty when there are none)
    {
      $lookup: {
        from: 'registrations',
        localField: '_id',
        foreignField: 'event',
        pipeline: [{ $match: { status: 'confirmed' } }],
        as: 'registrations',
      },
    },
    // 3. Attach the venue (an array of one), then make it a plain object
    { $lookup: { from: 'venues', localField: 'venue', foreignField: '_id', as: 'venue' } },
    { $unwind: '$venue' },
    // 4. Count people and tickets. $size of an empty array is 0, so events nobody registered for stay in.
    {
      $addFields: {
        registrationCount: { $size: '$registrations' },
        ticketsSold: { $sum: '$registrations.ticketCount' },
      },
    },
    // 5. Seats left = capacity minus tickets sold
    { $addFields: { remainingSeats: { $subtract: ['$venue.capacity', '$ticketsSold'] } } },
    // 6. Keep only what the dashboard shows, soonest first
    {
      $project: {
        title: 1, startsAt: 1, price: 1, categories: 1,
        venue: { _id: 1, name: 1, city: 1, capacity: 1 },
        registrationCount: 1, ticketsSold: 1, remainingSeats: 1,
      },
    },
    { $sort: { startsAt: 1 } },
  ]);
  res.json(events);
});
