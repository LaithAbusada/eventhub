import { Event } from '../models/Event.js';
import { Registration } from '../models/Registration.js';
import { HttpError } from '../errors.js';

// THE BROKEN VERSION, on purpose: read, check, then write are three separate steps
export async function registerForEvent(userId, eventId, ticketCount) {
  const event = await Event.findById(eventId).populate('venue', 'capacity');
  if (!event) throw new HttpError(404, "NOT_FOUND", "Event not found");
  const venue = /** @type {any} */ (event.venue);

  // Steps 1 and 2: read how many seats are taken, and check there's room
  if (event.seatsTaken + ticketCount > venue.capacity) {
    throw new HttpError(409, "EVENT_FULL", "Sorry, there are not enough seats left");
  }

  // Step 3: write. Another request can do steps 1 and 2 before this line runs.
  const registration = await Registration.create({ user: userId, event: eventId, ticketCount });
  await Event.updateOne({ _id: eventId }, { $inc: { seatsTaken: ticketCount } });
  return registration;
}
