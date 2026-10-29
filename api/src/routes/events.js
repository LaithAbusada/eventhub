import { Router } from 'express';
import { Event } from '../models/Event.js';
import { Venue } from '../models/Venue.js';
import { Registration } from '../models/Registration.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { auth, requireOrganizer } from '../middleware/auth.js';
import { eventInput, eventEdit, listQuery, searchQuery, registrationInput } from '../schemas.js';
import { HttpError } from '../errors.js';
import { registerForEvent, cancelRegistration } from '../services/registrations.js';
import { indexEvent, removeEvent, searchEvents } from '../services/search.js';

export const eventRoutes = Router();

async function loadOwnedEvent(req) {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new HttpError(404, "NOT_FOUND", "Event not found");
  }
  if (!event.organizer.equals(req.user.sub)) {
    throw new HttpError(403, "FORBIDDEN", "You can only change your own events");
  }

  return event;
}

async function loadVenue(venueId) {
  const venue = await Venue.findById(venueId);

  if (!venue) {
    const details = [{ field: 'venue', message: 'That venue does not exist' }];
    throw new HttpError(422, 'VALIDATION_FAILED', 'Some fields are invalid', details);
  }

  return venue;
}

eventRoutes.get('/', validateQuery(listQuery), async (req, res) => {
  const { page, size } = req.validQuery;
  const upcoming = { startsAt: { $gte: new Date() } };
  const skip = (page - 1) * size;

  const findThisPage = Event.find(upcoming)
    .sort({ startsAt: 1 })
    .skip(skip)
    .limit(size)
    .populate('venue', 'name city');
  const countAllUpcoming = Event.countDocuments(upcoming);

  const [items, total] = await Promise.all([findThisPage, countAllUpcoming]);

  res.json({ items, total, page, size });
});

eventRoutes.get('/search', validateQuery(searchQuery), async (req, res) => {
  const searchResults = await searchEvents(req.validQuery);
  res.json(searchResults);
});

eventRoutes.get('/:id', async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('venue')
    .populate('organizer', 'name');

  if (!event) {
    throw new HttpError(404, 'NOT_FOUND', 'Event not found');
  }

  // populate() replaced the id with the venue; the cast is for the type checker
  const venue = /** @type {any} */ (event.venue);
  const seatsLeft = venue.capacity - event.seatsTaken;

  const response = { ...event.toJSON(), seatsLeft: seatsLeft };
  res.json(response);
});

eventRoutes.post('/', auth, requireOrganizer, validateBody(eventInput), async (req, res) => {
  await loadVenue(req.body.venue);

  // The organizer comes from the token, never from the body
  const eventData = { ...req.body, organizer: req.user.sub };
  const event = await Event.create(eventData);

  // indexEvent never throws, so a search problem can't fail the request
  await indexEvent(event._id);

  res.status(201).json(event);
});

eventRoutes.put('/:id', auth, validateBody(eventEdit), async (req, res) => {
  const event = await loadOwnedEvent(req);

  const venueIsChanging = req.body.venue && !event.venue.equals(req.body.venue);
  if (venueIsChanging) {
    const newVenue = await loadVenue(req.body.venue);

    if (newVenue.capacity < event.seatsTaken) {
      const seatsTaken = event.seatsTaken;
      const message = `${seatsTaken} seats are already taken, but that venue only has ${newVenue.capacity}`;
      throw new HttpError(409, "VENUE_TOO_SMALL", message);
    }
  }

  Object.assign(event, req.body);
  await event.save();

  await indexEvent(event._id);

  res.json(event);
});

eventRoutes.delete('/:id', auth, async (req, res) => {
  const event = await loadOwnedEvent(req);

  // Delete its registrations first, so none are left pointing at a missing event
  await Registration.deleteMany({ event: event._id });
  await event.deleteOne();

  await removeEvent(event._id);

  res.status(204).end();
});

eventRoutes.post('/:id/register', auth, validateBody(registrationInput), async (req, res) => {
  const registration = await registerForEvent(req.user.sub, req.params.id, req.body.ticketCount);
  res.status(201).json(registration);
});

eventRoutes.delete('/:id/register', auth, async (req, res) => {
  await cancelRegistration(req.user.sub, req.params.id);
  res.status(204).end();
});

eventRoutes.get('/:id/attendees', auth, async (req, res) => {
  const event = await loadOwnedEvent(req);

  const attendees = await Registration.find({ event: event._id, status: 'confirmed' })
    .sort({ createdAt: 1 })
    .populate('user', 'name email');

  res.json(attendees);
});
