import { z } from 'zod';

// --- Accounts ---

// Trim and lowercase first, then check it looks like an email
const email = z.string().trim().toLowerCase().pipe(z.email());

export const registerInput = z.object({
  name: z.string().trim().min(2).max(80),
  email: email,
  password: z.string().min(8, 'Use at least 8 characters').max(100),
  role: z.enum(['organizer', 'attendee']),
});

export const loginInput = z.object({
  email: email,
  password: z.string().nonempty(),
});

// --- Events ---

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'must be a valid id');

function isInTheFuture(date) {
  return date > new Date();
}

const category = z.string().trim().toLowerCase().nonempty();

// No .default() here: eventEdit is eventInput.partial(), and a default would overwrite
// fields the organizer didn't send. Mongoose sets the defaults for new events.
export const eventInput = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().max(5000).optional(),
  startsAt: z.coerce.date().refine(isInTheFuture, "Must be in the future"),
  price: z.number().min(0).max(100000),
  venue: objectId,
  categories: z.array(category).max(5).optional(),
});

export const eventEdit = eventInput.partial();

// --- Registrations ---

// A default is fine here: this schema is never used with .partial()
export const registrationInput = z.object({
  ticketCount: z.number().int().min(1).max(10).default(1),
});

// --- Query strings (URL values are text, so numbers use coerce) ---

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(50).default(12),
});

// Kept as text, not a Date: Elasticsearch reads YYYY-MM-DD directly
const day = z.iso.date('Use the format YYYY-MM-DD');

export const searchQuery = listQuery.extend({
  q: z.string().trim().max(200).optional(),
  city: z.string().trim().optional(),
  category: category.optional(),
  from: day.optional(),
  to: day.optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['relevance', 'soonest', 'cheapest']).default('relevance'),
});