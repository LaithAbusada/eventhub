import mongoose from 'mongoose';

const CastError = mongoose.Error.CastError;
const ValidationError = mongoose.Error.ValidationError;

// Our own error: routes throw it, and errorHandler turns it into a JSON response
export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Runs when no route matched the URL
export function notFound(req, res, next) {
  const error = new HttpError(404, "NOT_FOUND", `no route for ${req.method} ${req.path}`);
  next(error);
}

// The one error shape the whole API uses: { error: { code, message, details } }
export function buildReturnShape(code, message, details) {
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
  // A unique index refused a duplicate
  if (err.code === 11000) {
    res.status(409).json(buildReturnShape("DUPLICATE", "There is a MongoDB Duplicate KEY", err.details));
    return;
  }

  // An id that isn't a valid ObjectId, like /events/hello
  if (err instanceof CastError) {
    res.status(404).json(buildReturnShape("NOT_FOUND", "ID isnt a valid object"));
    return;
  }

  // A Mongoose schema rule failed
  if (err instanceof ValidationError) {
    res.status(422).json(buildReturnShape("VALIDATION_FAILED", "Validation Failed"));
    return;
  }

  // The request body wasn't valid JSON
  if (err.type === "entity.parse.failed") {
    res.status(400).json(buildReturnShape("BAD_JSON", "Bad JSON Detected", err.details));
    return;
  }

  // One of our own errors: send its status, code and message
  if (err instanceof HttpError) {
    res.status(err.status).json(buildReturnShape(err.code, err.message, err.details));
    return;
  }

  // Anything else is a bug: log the details for us, tell the client nothing internal
  console.error(err);
  res.status(500).json(buildReturnShape("INTERNAL", "Something went Wrong"));
}
