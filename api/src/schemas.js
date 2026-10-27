import { z } from 'zod';

// --- Accounts ---

export const registerInput = z.object({
  name: z.string().trim().min(2).max(80),
  // Trim and lowercase first, then check it looks like an email
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8, 'Use at least 8 characters').max(100),
  role: z.enum(['organizer', 'attendee']),
});

export const loginInput = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().nonempty(),
});

// --- Events ---

// A MongoDB id: exactly 24 hex characters
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'must be a valid id');

function isInTheFuture(date) {
  return date > new Date();
}

// One category: trimmed, lowercased, not empty
const category = z.string().trim().toLowerCase().nonempty();

// No .default() in here on purpose: eventEdit is eventInput.partial(), and a default would
// overwrite fields the organizer didn't send. Mongoose fills defaults for new events instead.
export const eventInput = z.object({
  title: z.string().min(3).max(120).trim(),
  description: z.string().max(5000).optional(),
  startsAt: z.coerce.date().refine(isInTheFuture, "Must be in the future"),
  price: z.number().min(0).max(100000),
  venue: objectId,
  categories: z.array(category).max(5).optional(),
});

// Every field optional: for PUT, where the organizer sends only what changes
export const eventEdit = eventInput.partial();

// --- Registrations ---

// A default is fine here: this schema is never used with .partial()
export const registrationInput = z.object({
  ticketCount: z.number().int().min(1).max(10).default(1),
});

// --- Query strings (everything in a URL is text, so numbers are coerced) ---

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(50).default(12),
});
