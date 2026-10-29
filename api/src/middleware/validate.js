import { HttpError } from '../errors.js';

function toFieldErrors(zodError) {
  const details = [];
  for (const issue of zodError.issues) {
    details.push({ field: issue.path.join('.'), message: issue.message });
  }
  return details;
}

// So ?minPrice= means "not set" instead of 0
function dropEmptyValues(query) {
  const cleaned = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== '') {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

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

// Express 5 doesn't allow replacing req.query, so the result goes on req.validQuery
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
