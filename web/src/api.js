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

    // The token itself was rejected (expired or invalid). Forget it and reload: public pages
    // come back as a guest, and the router guard sends protected pages to the login page.
    if (response.status === 401 && token && code === 'UNAUTHORIZED') {
      localStorage.removeItem(TOKEN_KEY);
      window.location.reload();
    }

    throw new ApiError(response.status, code, message, details);
  }

  return data;
}

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
