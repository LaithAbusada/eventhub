import 'express';

// Our auth middleware adds req.user at runtime; this tells the type checker it exists
declare module 'express-serve-static-core' {
  interface Request {
    user?: any;
  }
}
