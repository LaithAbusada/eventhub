import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { loginInput, registerInput } from '../schemas.js';
import { validateBody } from '../middleware/validate.js';
import { auth, signToken } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { HttpError } from '../errors.js';

export const authRoutes = Router();

const EMAIL_TAKEN_MESSAGE = 'This email is already taken, please use a different email';

authRoutes.post('/register', validateBody(registerInput), async (req, res) => {
  const { name, email, password, role } = req.body;

  const exists = await User.exists({ email: email });
  if (exists) {
    throw new HttpError(409, 'EMAIL_TAKEN', EMAIL_TAKEN_MESSAGE);
  }

  const hash = await bcrypt.hash(password, 10);

  let user;
  try {
    user = await User.create({ name: name, email: email, passwordHash: hash, role: role });
  } catch (err) {
    // Two sign-ups with the same email at the same moment: the unique index stops the second
    if (err.code === 11000) {
      throw new HttpError(409, 'EMAIL_TAKEN', EMAIL_TAKEN_MESSAGE);
    }
    throw err;
  }

  const token = signToken(user);
  res.status(201).json({ token: token, user: user });
});

authRoutes.post('/login', validateBody(loginInput), async (req, res) => {
  const { email, password } = req.body;

  // passwordHash is hidden by default, so ask for it here
  const user = await User.findOne({ email: email }).select('+passwordHash');

  let correctPassword = false;
  if (user) {
    correctPassword = await bcrypt.compare(password, user.passwordHash);
  }

  // One answer for both cases, so the response doesn't say which part was wrong
  if (!correctPassword) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Wrong email or password');
  }

  const token = signToken(user);
  res.json({ token: token, user: user });
});

authRoutes.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.sub);

  // The token can be valid while the account no longer exists
  if (!user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'This account no longer exists');
  }

  res.json(user);
});
