import { Event } from '../models/Event.js';
import { Registration } from '../models/Registration.js';
import { HttpError } from '../errors.js';

export async function registerForEvent(userId, eventId, ticketCount) {
  const event = await Event.findById(eventId).populate('venue', 'capacity');
  if (!event) {
    throw new HttpError(404, "NOT_FOUND", "Event not found");
  }
  if (event.startsAt < new Date()) {
    throw new HttpError(409, "EVENT_STARTED", "This event has already started");
  }

  // populate() replaced the id with the venue; the cast is for the type checker
  const venue = /** @type {any} */ (event.venue);

  // An early check for a clear message. The unique index still stops a double click.
  const existing = await Registration.findOne({ user: userId, event: eventId });
  if (existing && existing.status === 'confirmed') {
    throw new HttpError(409, "ALREADY_REGISTERED", "You are already registered for this event");
  }

  // Check for room and take the seats in one update. The filter only matches while
  // seatsTaken <= capacity - ticketCount (and the event is still at this venue),
  // so of two people racing for the last seat, only one update matches.
  const claimed = await Event.findOneAndUpdate(
    { _id: eventId, venue: venue._id, seatsTaken: { $lte: venue.capacity - ticketCount } },
    { $inc: { seatsTaken: ticketCount } },
  );
  if (!claimed) {
    throw new HttpError(409, "EVENT_FULL", "Sorry, there are not enough seats left");
  }

  try {
    if (existing) {
      // They cancelled before. The unique index allows one per user and event, so reuse it.
      const reactivated = await Registration.findOneAndUpdate(
        { _id: existing._id, status: 'cancelled' },
        { status: 'confirmed', ticketCount: ticketCount },
        { returnDocument: 'after' },
      );
      if (!reactivated) {
        throw new HttpError(409, "ALREADY_REGISTERED", "You are already registered for this event");
      }
      return reactivated;
    }

    const newRegistration = { user: userId, event: eventId, ticketCount: ticketCount };
    const registration = await Registration.create(newRegistration);
    return registration;
  } catch (err) {
    // Saving failed, so give the seats back
    await Event.updateOne({ _id: eventId }, { $inc: { seatsTaken: -ticketCount } });

    if (err.code === 11000) {
      throw new HttpError(409, "ALREADY_REGISTERED", "You are already registered for this event");
    }
    throw err;
  }
}

export async function cancelRegistration(userId, eventId) {
  // The status is in the filter, so a double click finds nothing the second time
  // and the seats are only given back once.
  const registration = await Registration.findOneAndUpdate(
    { user: userId, event: eventId, status: 'confirmed' },
    { status: 'cancelled' },
  );
  if (!registration) {
    throw new HttpError(404, "NOT_REGISTERED", "You have no active registration for this event");
  }

  await Event.updateOne({ _id: eventId }, { $inc: { seatsTaken: -registration.ticketCount } });
}
