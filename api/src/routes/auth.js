import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { loginInput, registerInput } from '../schemas.js';
import { validateBody } from '../middleware/validate.js';
import { auth, signToken } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { buildReturnShape } from '../errors.js';

export const authRoutes = Router();

authRoutes.post('/register', validateBody(registerInput), async (req, res) => {
  const { name, email, password, role } = req.body;

  const exists = await User.exists({ email: email });
  if (exists) {
    res.status(409).json(buildReturnShape("EMAIL_TAKEN", "This email is already taken, please use a different email"));
    return;
  }

  // Never store the password itself, only a slow, salted hash of it
  const hash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name: name,
    email: email,
    passwordHash: hash,
    role: role,
  });

  const token = signToken(user);
  res.status(201).json({ token: token, user: user });
});

authRoutes.post('/login', validateBody(loginInput), async (req, res) => {
  const { email, password } = req.body;

  // passwordHash is hidden by default, so ask for it here
  const user = await User.findOne({ email: email }).select("+passwordHash");

  // Same answer for "no such email" and "wrong password", so nobody can probe which emails exist
  if (!user) {
    res.status(401).json(buildReturnShape("INVALID_CREDENTIALS", "Wrong email or password"));
    return;
  }

  const correctPassword = await bcrypt.compare(password, user.passwordHash);
  if (!correctPassword) {
    res.status(401).json(buildReturnShape("INVALID_CREDENTIALS", "Wrong email or password"));
    return;
  }

  const token = signToken(user);
  res.status(200).json({ token: token, user: user });
});

authRoutes.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.sub);

  // The token can be valid while the account no longer exists
  if (!user) {
    res.status(401).json(buildReturnShape("UNAUTHORIZED", "This account no longer exists"));
    return;
  }

  res.json(user);
});
