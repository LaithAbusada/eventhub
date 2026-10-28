// The auth store saves the token under this key; every request reads it from here
export const TOKEN_KEY = 'token';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Returns null when the body is empty or isn't JSON (like the proxy's 502 when the API is down)
async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  const headers = {};

  let jsonBody;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    jsonBody = JSON.stringify(body);
  }

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`/api${path}`, {
    method: method,
    headers: headers,
    body: jsonBody,
    signal: signal,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await readJson(response);

  if (!response.ok) {
    // Our API answers errors as { error: { code, message, details } }
    let code = 'REQUEST_FAILED';
    let message = `Request failed with status ${response.status}`;
    let details = [];

    if (data && data.error) {
      code = data.error.code;
      message = data.error.message;
      if (data.error.details) {
        details = data.error.details;
      }
    }

    throw new ApiError(response.status, code, message, details);
  }

  return data;
}

// { field: message } from a validation error, to show each message under its input.
// Any other error gives {}.
export function fieldErrors(err) {
  const errors = {};

  if (!(err instanceof ApiError)) {
    return errors;
  }

  for (const detail of err.details) {
    errors[detail.field] = detail.message;
  }

  return errors;
}
