import { Router } from 'express';
import { Event } from '../models/Event.js';
import { Venue } from '../models/Venue.js';
import { Registration } from '../models/Registration.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { auth, requireRole } from '../middleware/auth.js';
import { eventInput, eventEdit, listQuery, registrationInput } from '../schemas.js';
import { buildReturnShape, HttpError } from '../errors.js';
import { registerForEvent } from '../services/registrations.js';

export const eventRoutes = Router();

// Returns the event, or throws 404 if it doesn't exist and 403 if it belongs to another organizer
async function loadOwnedEvent(req) {
  const event = await Event.findById(req.params.id);
  if (!event) throw new HttpError(404, "NOT_FOUND", "Event not found");
  if (!event.organizer.equals(req.user.sub)) {
    throw new HttpError(403, "FORBIDDEN", "You can only change your own events");
  }
  return event;
}

// Returns the venue, or throws 422 if the id points at nothing
async function loadVenue(venueId) {
  const venue = await Venue.findById(venueId);
  if (!venue) throw new HttpError(422, "VALIDATION_FAILED", "That venue does not exist");
  return venue;
}


eventRoutes.get('/',validateQuery(listQuery),async (req,res)=> {
    const {page,size} = req.validQuery;
    const filter = { startsAt: { $gte: new Date() } };
   const [items,total] =  await Promise.all([Event.find(filter).sort({startsAt:1}).skip((page - 1) * size).limit(size).populate('venue','name city'),Event.countDocuments(filter)]);

   res.json({items,total,page,size});
})


eventRoutes.get('/:id', async (req, res) => {
  const { id } = req.params;

  const event = await Event.findById(id)
    .populate('venue')
    .populate('organizer', 'name');

  if (!event) {
    res.status(404).json(buildReturnShape("NOT_FOUND", "Event not found"));
    return;
  }

  const venue = /** @type {any} */ (event.venue);
  const seatsLeft = venue.capacity - event.seatsTaken;

  res.json({ ...event.toJSON(), seatsLeft });
});

eventRoutes.post('/', auth, requireRole('organizer'), validateBody(eventInput), async (req, res) => {
  await loadVenue(req.body.venue);

  // The organizer comes from the token, never from the request body
  const event = await Event.create({ ...req.body, organizer: req.user.sub });
  res.status(201).json(event);
});

eventRoutes.put('/:id', auth, validateBody(eventEdit), async (req, res) => {
  const event = await loadOwnedEvent(req);

  if (req.body.venue && !event.venue.equals(req.body.venue)) {
    const venue = await loadVenue(req.body.venue);
    // The new venue must still fit everyone who already has a seat
    if (venue.capacity < event.seatsTaken) {
      throw new HttpError(409, "VENUE_TOO_SMALL", `${event.seatsTaken} seats are already taken, but that venue only has ${venue.capacity}`);
    }
  }

  // Only the fields that were sent are changed
  Object.assign(event, req.body);
  await event.save();
  res.json(event);
});

eventRoutes.delete('/:id', auth, async (req, res) => {
  const event = await loadOwnedEvent(req);

  // Delete its registrations first, so none are left pointing at a missing event
  await Registration.deleteMany({ event: event._id });
  await event.deleteOne();
  res.status(204).end();
});

eventRoutes.post('/:id/register', auth, validateBody(registrationInput), async (req, res) => {
  const registration = await registerForEvent(req.user.sub, req.params.id, req.body.ticketCount);
  res.status(201).json(registration);
});