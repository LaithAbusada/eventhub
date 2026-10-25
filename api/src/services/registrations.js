import { Event } from '../models/Event.js';
import { Registration } from '../models/Registration.js';
import { HttpError } from '../errors.js';

export async function registerForEvent(userId, eventId, ticketCount) {
  const event = await Event.findById(eventId).populate('venue', 'capacity');
  if (!event) throw new HttpError(404, "NOT_FOUND", "Event not found");
  if (event.startsAt < new Date()) {
    throw new HttpError(409, "EVENT_STARTED", "This event has already started");
  }
  const venue = /** @type {any} */ (event.venue);

  // A friendly early answer for the common case. The unique index still guards the rare race
  // where the same person double-clicks.
  const existing = await Registration.findOne({ user: userId, event: eventId });
  if (existing?.status === 'confirmed') {
    throw new HttpError(409, "ALREADY_REGISTERED", "You are already registered for this event");
  }

  // 1. Claim the seats in ONE atomic step. The filter only matches while there is room for
  //    ticketCount more, so of two people racing for the last seat, only one update matches.
  const claimed = await Event.findOneAndUpdate(
    { _id: eventId, seatsTaken: { $lte: venue.capacity - ticketCount } },
    { $inc: { seatsTaken: ticketCount } },
  );
  if (!claimed) throw new HttpError(409, "EVENT_FULL", "Sorry, there are not enough seats left");

  // 2. Save the registration
  try {
    if (existing) {
      // They cancelled before. The unique index allows one row per user and event, so reuse it.
      const reactivated = await Registration.findOneAndUpdate(
        { _id: existing._id, status: 'cancelled' },
        { status: 'confirmed', ticketCount },
        { returnDocument: 'after' },
      );
      if (!reactivated) {
        throw new HttpError(409, "ALREADY_REGISTERED", "You are already registered for this event");
      }
      return reactivated;
    }
    return await Registration.create({ user: userId, event: eventId, ticketCount });
  } catch (err) {
    // 3. Saving failed, so give the seats back
    await Event.updateOne({ _id: eventId }, { $inc: { seatsTaken: -ticketCount } });
    if (err.code === 11000) {
      throw new HttpError(409, "ALREADY_REGISTERED", "You are already registered for this event");
    }
    throw err;
  }
}

export async function cancelRegistration(userId, eventId) {
  // Flip confirmed to cancelled in ONE step, with the status in the filter. A double click finds
  // nothing the second time, so the seats are only given back once.
  const registration = await Registration.findOneAndUpdate(
    { user: userId, event: eventId, status: 'confirmed' },
    { status: 'cancelled' },
  );
  if (!registration) {
    throw new HttpError(404, "NOT_REGISTERED", "You have no active registration for this event");
  }
  await Event.updateOne({ _id: eventId }, { $inc: { seatsTaken: -registration.ticketCount } });
}
