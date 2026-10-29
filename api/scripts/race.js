// Usage: node scripts/race.js <eventId>   (with the API running)
const API = 'http://localhost:4000/api';

const eventId = process.argv[2];
if (!eventId) {
  console.log('Usage: node scripts/race.js <eventId>');
  process.exit(1);
}

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

  const responseBody = await response.json();
  return { status: response.status, body: responseBody };
}

async function newAttendee(name) {
  const email = `${name}-${Date.now()}@race.test`;
  const account = { name: name, email: email, password: 'event123', role: 'attendee' };
  const result = await post('/auth/register', account);
  return result.body.token;
}

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
