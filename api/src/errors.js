import mongoose from 'mongoose';

const CastError = mongoose.Error.CastError;
const ValidationError = mongoose.Error.ValidationError;

export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFound(req, res, next) {
  next(new HttpError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`));
}

function errorBody(code, message, details) {
  return {
    error: {
      code: code,
      message: message,
      details: details,
    },
  };
}

// Express knows this is the error handler because it takes 4 arguments
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    res.status(err.status).json(errorBody(err.code, err.message, err.details));
    return;
  }

  // A unique index refused a duplicate
  if (err.code === 11000) {
    res.status(409).json(errorBody('DUPLICATE', 'That already exists'));
    return;
  }

  if (err instanceof CastError) {
    res.status(404).json(errorBody('NOT_FOUND', 'Not found'));
    return;
  }

  if (err instanceof ValidationError) {
    res.status(422).json(errorBody('VALIDATION_FAILED', 'Some fields are invalid'));
    return;
  }

  if (err.type === 'entity.parse.failed') {
    res.status(400).json(errorBody('BAD_JSON', 'The request body is not valid JSON'));
    return;
  }

  if (err.type === 'entity.too.large') {
    res.status(413).json(errorBody('TOO_LARGE', 'The request body is too large'));
    return;
  }

  // Anything else is a bug: log it, and don't send internal details
  console.error(err);
  res.status(500).json(errorBody('INTERNAL', 'Something went wrong'));
}
