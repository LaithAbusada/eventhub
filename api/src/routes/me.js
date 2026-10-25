import { Router } from 'express';
import { Registration } from '../models/Registration.js';
import { auth } from '../middleware/auth.js';

export const meRoutes = Router();

// My confirmed registrations, newest first, each with its event and the event's venue
meRoutes.get('/registrations', auth, async (req, res) => {
  const registrations = await Registration.find({ user: req.user.sub, status: 'confirmed' })
    .sort({ createdAt: -1 })
    .populate({
      path: 'event',
      select: 'title startsAt price venue',
      populate: { path: 'venue', select: 'name city' },
    });
  res.json(registrations);
});
