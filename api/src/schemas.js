import {z} from 'zod';

export const registerInput = z.object({
    name : z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().pipe(z.email()),
    password: z.string().min(8,'Use at least 8 characters').max(100),
    role: z.enum(['organizer','attendee']),
})


export const loginInput = z.object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    password:z.string().nonempty()
})


export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'must be a valid id');

 export const eventInput = z.object({
    title: z.string().min(3).max(120).trim(),
    description: z.string().max(5000).optional(),
    startsAt: z.coerce.date().refine((d) => d > new Date(),"Must be in the future"),
    price: z.number().min(0).max(100000),
    venue: objectId,
    categories: z.array(z.string().trim().toLowerCase().nonempty()).max(5).optional()
 })

 export const eventEdit = eventInput.partial();            // every field optional: for PUT

 // A default is fine here: this schema is never used with .partial()
 export const registrationInput = z.object({
    ticketCount: z.number().int().min(1).max(10).default(1)
 })

 export const listQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    size: z.coerce.number().int().min(1).max(50).default(12)
 })