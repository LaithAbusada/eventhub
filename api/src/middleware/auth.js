import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../errors.js';

export function signToken(user) {
  const payload = { sub: user.id, role: user.role };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  return token;
}

// On success, req.user is the token's payload: { sub, role, iat, exp }
export function auth(req, res, next) {
  const authorization = req.headers.authorization || '';

  let token = '';
  if (authorization.startsWith('Bearer ')) {
    token = authorization.slice('Bearer '.length);
  }

  if (!token) {
    next(new HttpError(401, 'UNAUTHORIZED', 'Log in first'));
    return;
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    next(new HttpError(401, 'UNAUTHORIZED', 'Please log in again'));
    return;
  }

  next();
}

// Use after auth, which sets req.user
export function requireOrganizer(req, res, next) {
  if (req.user.role !== 'organizer') {
    next(new HttpError(403, 'FORBIDDEN', 'Only organizers can do this'));
    return;
  }

  next();
}
