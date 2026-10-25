import 'express';

// Our middleware adds these at runtime (auth sets user, validateQuery sets validQuery);
// this tells the type checker they exist
declare module 'express-serve-static-core' {
  interface Request {
    user?: any;
    validQuery?: any;
  }
}
