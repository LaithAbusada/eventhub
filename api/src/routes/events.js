import { Router } from 'express';
import { Event } from '../models/Event.js';
import { Venue } from '../models/Venue.js';
import { Registration } from '../models/Registration.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { auth, requireRole } from '../middleware/auth.js';
import { eventInput, eventEdit, listQuery, searchQuery, registrationInput } from '../schemas.js';
import { buildReturnShape, HttpError } from '../errors.js';
import { registerForEvent, cancelRegistration } from '../services/registrations.js';
import { indexEvent, removeEvent, searchEvents } from '../services/search.js';

export const eventRoutes = Router();

// Returns the event, or throws 404 if it doesn't exist and 403 if it belongs to another organizer
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

// Returns the venue, or throws 422 if the id points at nothing
async function loadVenue(venueId) {
  const venue = await Venue.findById(venueId);

  if (!venue) {
    throw new HttpError(422, "VALIDATION_FAILED", "That venue does not exist");
  }

  return venue;
}

// Upcoming events, soonest first, one page at a time
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

  // Run both queries at the same time, and wait for both
  const [items, total] = await Promise.all([findThisPage, countAllUpcoming]);

  res.json({ items, total, page, size });
});


eventRoutes.get('/search', validateQuery(searchQuery), async (req, res) => {
  const searchResults = await searchEvents(req.validQuery);
  res.json(searchResults);
});

// One event, with its full venue and only its organizer's name
eventRoutes.get('/:id', async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('venue')
    .populate('organizer', 'name');

  if (!event) {
    res.status(404).json(buildReturnShape("NOT_FOUND", "Event not found"));
    return;
  }

  // populate() swapped the venue id for the venue document; the type checker can't see that, hence the cast
  const venue = /** @type {any} */ (event.venue);
  const seatsLeft = venue.capacity - event.seatsTaken;

  // The event's own fields at the top level, with seatsLeft added next to them
  const response = { ...event.toJSON(), seatsLeft: seatsLeft };
  res.json(response);
});

eventRoutes.post('/', auth, requireRole('organizer'), validateBody(eventInput), async (req, res) => {
  await loadVenue(req.body.venue);

  // Everything from the body, plus the organizer, which comes from the token, never from the body
  const eventData = { ...req.body, organizer: req.user.sub };
  const event = await Event.create(eventData);

  // Copy it into search. MongoDB is written first, because it's the source of truth;
  // indexEvent never throws, so a search problem can't fail this request.
  await indexEvent(event._id);

  res.status(201).json(event);
});

eventRoutes.put('/:id', auth, validateBody(eventEdit), async (req, res) => {
  const event = await loadOwnedEvent(req);

  const venueIsChanging = req.body.venue && !event.venue.equals(req.body.venue);
  if (venueIsChanging) {
    const newVenue = await loadVenue(req.body.venue);

    // The new venue must still fit everyone who already has a seat
    if (newVenue.capacity < event.seatsTaken) {
      const message = `${event.seatsTaken} seats are already taken, but that venue only has ${newVenue.capacity}`;
      throw new HttpError(409, "VENUE_TOO_SMALL", message);
    }
  }

  // Copy only the fields that were sent onto the event
  Object.assign(event, req.body);
  await event.save();

  // Replace its search document with the edited version
  await indexEvent(event._id);

  res.json(event);
});

eventRoutes.delete('/:id', auth, async (req, res) => {
  const event = await loadOwnedEvent(req);

  // Delete its registrations first, so none are left pointing at a missing event
  await Registration.deleteMany({ event: event._id });
  await event.deleteOne();

  // And from search, so a deleted event never shows up in results
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

// Only the event's owner sees who is coming
eventRoutes.get('/:id/attendees', auth, async (req, res) => {
  const event = await loadOwnedEvent(req);

  const attendees = await Registration.find({ event: event._id, status: 'confirmed' })
    .sort({ createdAt: 1 })
    .populate('user', 'name email');

  res.json(attendees);
});
