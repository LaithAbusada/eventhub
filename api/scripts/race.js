// Two brand-new people try to register for the same event at the same moment.
// Run it with: node scripts/race.js <eventId>   (the API must be running)
const API = 'http://localhost:4000/api';

const eventId = process.argv[2]; // node scripts/race.js 6720f3... → '6720f3...'
if (!eventId) {
  console.log('Usage: node scripts/race.js <eventId>');
  process.exit(1);
}

// POST some JSON, optionally with a token; returns the status and the parsed body
async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API + path, { method: 'POST', headers, body: JSON.stringify(body ?? {}) });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// A new attendee each run, with a unique email, so neither is registered yet
async function newAttendee(name) {
  const email = `${name}-${Date.now()}@race.test`;
  const res = await post('/auth/register', { name, email, password: 'password123', role: 'attendee' });
  return res.body.token;
}

const [tokenA, tokenB] = await Promise.all([newAttendee('racer-a'), newAttendee('racer-b')]);

// Start both registrations before waiting for either: this is the race
const [a, b] = await Promise.all([
  post(`/events/${eventId}/register`, {}, tokenA),
  post(`/events/${eventId}/register`, {}, tokenB),
]);

console.log('Person A got', a.status, a.body?.error?.code ?? '');
console.log('Person B got', b.status, b.body?.error?.code ?? '');

const event = await (await fetch(`${API}/events/${eventId}`)).json();
console.log(`Seats taken: ${event.seatsTaken} of ${event.venue.capacity}`);
