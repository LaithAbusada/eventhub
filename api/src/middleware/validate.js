import { HttpError } from '../errors.js';

// Turns Zod's issues into a list of { field, message } for the error response
function toFieldErrors(zodError) {
  const details = [];
  for (const issue of zodError.issues) {
    details.push({ field: issue.path.join('.'), message: issue.message });
  }
  return details;
}

// Removes query values that are empty strings, so ?minPrice= counts as "not set"
function dropEmptyValues(query) {
  const cleaned = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== '') {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// Takes a Zod schema and returns a middleware that checks req.body against it.
// On success, req.body is replaced with the cleaned data (trimmed, lowercased...).
export function validateBody(schema) {
  return function (req, res, next) {
    // Express 5 leaves req.body undefined when a request has no body
    const body = req.body || {};
    const result = schema.safeParse(body);

    if (!result.success) {
      next(new HttpError(422, "VALIDATION_FAILED", "Some fields are invalid", toFieldErrors(result.error)));
      return;
    }

    req.body = result.data;
    next();
  };
}

// Same for the query string. Express 5 won't let you replace req.query,
// so the cleaned result goes on req.validQuery instead.
export function validateQuery(schema) {
  return function (req, res, next) {
    const query = dropEmptyValues(req.query);
    const result = schema.safeParse(query);

    if (!result.success) {
      next(new HttpError(400, "BAD_QUERY", "Some query parameters are invalid", toFieldErrors(result.error)));
      return;
    }

    req.validQuery = result.data;
    next();
  };
}
