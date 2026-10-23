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
