import { Router } from 'express';
import { Venue } from '../models/Venue.js';
import { Event } from '../models/Event.js';
import { auth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../errors.js';

export const venueRoutes = Router();

venueRoutes.get('/', async (req, res) => {
  const venues = await Venue.find().sort({ city: 1, name: 1 });
  res.json(venues);
});

venueRoutes.delete('/:id', auth, requireRole('organizer'), async (req, res) => {
  const venue = await Venue.findById(req.params.id);
  if (!venue) throw new HttpError(404, "NOT_FOUND", "Venue not found");

  // Both checks below use the { venue: 1, startsAt: 1 } index on events
  const hasUpcoming = await Event.exists({ venue: venue._id, startsAt: { $gte: new Date() } });
  if (hasUpcoming) {
    throw new HttpError(409, "VENUE_HAS_UPCOMING_EVENTS", "This venue still has upcoming events. Move or delete them first.");
  }

  // Our decision: past events still point at this venue, so it is kept for their history
  const hasPast = await Event.exists({ venue: venue._id });
  if (hasPast) {
    throw new HttpError(409, "VENUE_HAS_PAST_EVENTS", "Past events still point at this venue, so it is kept for their history.");
  }

  await venue.deleteOne();
  res.status(204).end();
});
