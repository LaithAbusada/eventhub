import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { buildReturnShape } from '../errors.js';

// Creates a signed token that says who the user is and what role they have
export function signToken(user) {
  const payload = { sub: user.id, role: user.role };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  return token;
}

// 401 unless the request carries a valid token ("Authorization: Bearer <token>").
// On success, req.user is the token's payload: { sub, role, iat, exp }.
export function auth(req, res, next) {
  const authorization = req.headers.authorization || '';

  let token = '';
  if (authorization.startsWith('Bearer ')) {
    token = authorization.slice('Bearer '.length);
  }

  if (!token) {
    res.status(401).json(buildReturnShape("UNAUTHORIZED", "Log in first"));
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    req.user = payload;
  } catch {
    // Fake, edited or expired
    res.status(401).json(buildReturnShape("UNAUTHORIZED", "Please log in again"));
    return;
  }

  next();
}

// Takes a role and returns a middleware that answers 403 for anyone without it.
// Use it after auth, which sets req.user.
export function requireRole(role) {
  return function (req, res, next) {
    const user = req.user;

    if (!user || user.role !== role) {
      res.status(403).json(buildReturnShape("FORBIDDEN", "Only organizers can do this"));
      return;
    }

    next();
  };
}
