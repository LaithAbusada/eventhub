// Two brand-new people try to register for the same event at the same moment.
// Run it with: node scripts/race.js <eventId>   (the API must be running)
const API = 'http://localhost:4000/api';

// node scripts/race.js 6720f3...  →  process.argv[2] is '6720f3...'
const eventId = process.argv[2];
if (!eventId) {
  console.log('Usage: node scripts/race.js <eventId>');
  process.exit(1);
}

// Sends a POST with a JSON body, and the token if there is one.
// Returns the status code and the parsed response body.
async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(API + path, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body),
  });

  let responseBody = null;
  try {
    responseBody = await response.json();
  } catch {
    // Some responses (like 204) have no JSON body
  }

  return { status: response.status, body: responseBody };
}

// Registers a new attendee with a unique email, so they aren't registered for anything yet
async function newAttendee(name) {
  const email = `${name}-${Date.now()}@race.test`;
  const result = await post('/auth/register', { name: name, email: email, password: 'password123', role: 'attendee' });
  return result.body.token;
}

// The error code from a response, or an empty string if there isn't one
function errorCodeOf(result) {
  if (result.body && result.body.error) {
    return result.body.error.code;
  }
  return '';
}

const [tokenA, tokenB] = await Promise.all([newAttendee('racer-a'), newAttendee('racer-b')]);

// Start both registrations before waiting for either: this is the race
const [a, b] = await Promise.all([
  post(`/events/${eventId}/register`, {}, tokenA),
  post(`/events/${eventId}/register`, {}, tokenB),
]);

console.log('Person A got', a.status, errorCodeOf(a));
console.log('Person B got', b.status, errorCodeOf(b));

const eventResponse = await fetch(`${API}/events/${eventId}`);
const event = await eventResponse.json();
console.log(`Seats taken: ${event.seatsTaken} of ${event.venue.capacity}`);
