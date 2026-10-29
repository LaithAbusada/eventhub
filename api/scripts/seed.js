// Wipes the database, then adds sample data
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../src/config.js';
import { User } from '../src/models/User.js';
import { Venue } from '../src/models/Venue.js';
import { Event } from '../src/models/Event.js';
import { Registration } from '../src/models/Registration.js';
import { es } from '../src/db/elastic.js';
import { rebuildIndex } from '../src/services/search.js';

const PASSWORD = 'event123';
const DAY = 24 * 60 * 60 * 1000;

function daysFromNow(days, hour) {
  const date = new Date(Date.now() + days * DAY);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

const VENUES = [
  { name: 'Lweibdeh Loft', city: 'Amman', address: 'Paris Circle, Jabal Lweibdeh', capacity: 60 },
  { name: 'Abdali Hall', city: 'Amman', address: 'Abdali Boulevard', capacity: 400 },
  { name: 'Rainbow Street Rooftop', city: 'Amman', address: 'Rainbow Street, Jabal Amman', capacity: 120 },
  { name: 'Irbid Arts Centre', city: 'Irbid', address: 'University Street', capacity: 200 },
  { name: 'Aqaba Shore Stage', city: 'Aqaba', address: 'South Beach Road', capacity: 800 },
  // Only 2 seats, for testing a full event and the last-seat race
  { name: 'The Tiny Room', city: 'Amman', address: 'Lweibdeh, side street', capacity: 2 },
];

// venue is a position in VENUES above; prices are in JOD
const EVENTS = [
  { title: 'Jazz Night in Lweibdeh', description: 'A late evening of live jazz standards with a local quartet.', categories: ['music'], price: 15, venue: 0 },
  { title: 'Intro to Node.js Workshop', description: 'Build your first Express API in three hours. Bring a laptop.', categories: ['tech', 'workshop'], price: 0, venue: 1 },
  { title: 'Amman Startup Pitch Night', description: 'Ten founders, five minutes each, one investor panel.', categories: ['business', 'tech'], price: 10, venue: 1 },
  { title: 'Rooftop Oud Session', description: 'Traditional oud music at sunset over Jabal Amman.', categories: ['music'], price: 20, venue: 2 },
  { title: 'Vue 3 Meetup', description: 'Talks on the Composition API, Pinia and testing Vue apps.', categories: ['tech'], price: 0, venue: 0 },
  { title: 'Street Food Festival', description: 'Mansaf, knafeh and twenty food stalls from across Jordan.', categories: ['food'], price: 5, venue: 2 },
  { title: 'Photography Walk: Downtown', description: 'A guided photo walk through downtown Amman at golden hour.', categories: ['art', 'outdoors'], price: 12, venue: 0 },
  { title: 'Aqaba Beach Run 10K', description: 'A 10K run along the Red Sea coast. Water stations every 2K.', categories: ['sports', 'outdoors'], price: 25, venue: 4 },
  { title: 'Irbid Book Fair', description: 'Publishers from across the region, readings and signings.', categories: ['art'], price: 0, venue: 3 },
  { title: 'MongoDB for Beginners', description: 'Collections, documents, indexes and your first aggregation.', categories: ['tech', 'workshop'], price: 0, venue: 1 },
  { title: 'Elasticsearch in Practice', description: 'Mappings, analyzers and relevance tuning with real examples.', categories: ['tech'], price: 30, venue: 1 },
  { title: 'Stand-up Comedy Night', description: 'Five comedians, one microphone, two languages.', categories: ['art'], price: 18, venue: 2 },
  { title: 'Coffee Cupping Class', description: 'Taste six single-origin coffees and learn to score them.', categories: ['food', 'workshop'], price: 22, venue: 0 },
  { title: 'Aqaba Sunset Concert', description: 'An open-air concert on the beach as the sun goes down.', categories: ['music', 'outdoors'], price: 35, venue: 4 },
  { title: 'Design Systems Talk', description: 'How a small team built and shipped a design system.', categories: ['tech'], price: 0, venue: 0 },
  { title: 'Calligraphy Workshop', description: 'Learn the basics of Arabic calligraphy with reed pens.', categories: ['art', 'workshop'], price: 28, venue: 3 },
  { title: 'Tiny Room Acoustic Set', description: 'An acoustic set for exactly two people.', categories: ['music'], price: 5, venue: 5 },
  { title: 'Product Management 101', description: 'Roadmaps, discovery and saying no, explained by working PMs.', categories: ['business'], price: 0, venue: 1 },
  { title: 'Wadi Hike Meetup', description: 'A morning group hike. Meet at the Rainbow Street rooftop first.', categories: ['sports', 'outdoors'], price: 8, venue: 2 },
  { title: 'Indie Film Screening', description: 'Three short films by Jordanian directors, then a Q&A.', categories: ['art'], price: 10, venue: 0 },
  { title: 'JavaScript Testing Clinic', description: 'Bring your flaky tests. Vitest, Supertest and mocking done right.', categories: ['tech', 'workshop'], price: 0, venue: 1 },
  { title: 'Irbid Chess Open', description: 'A rapid chess tournament open to all levels.', categories: ['sports'], price: 6, venue: 3 },
  { title: 'Pottery for Beginners', description: 'Throw your first bowl on the wheel. Clay and aprons provided.', categories: ['art', 'workshop'], price: 40, venue: 0 },
  { title: 'Aqaba Diving Day', description: 'Two guided dives at the Japanese Garden reef.', categories: ['sports', 'outdoors'], price: 60, venue: 4 },
  { title: 'Women in Tech Amman', description: 'Lightning talks and mentoring tables.', categories: ['tech', 'business'], price: 0, venue: 1 },
  { title: 'Arabic Poetry Evening', description: 'Readings of classic and modern Arabic poetry.', categories: ['art'], price: 0, venue: 3 },
  { title: 'Board Game Night', description: 'Fifty board games, snacks and new friends.', categories: ['food'], price: 4, venue: 2 },
  { title: 'Salsa Social', description: 'A beginner lesson, then open dancing until late.', categories: ['music'], price: 12, venue: 2 },
  { title: 'Cloud Costs Workshop', description: 'Cut your cloud bill: practical tips from a platform team.', categories: ['tech', 'workshop'], price: 15, venue: 1 },
  { title: 'Charity Football Match', description: 'Local teams play for a good cause. All tickets go to charity.', categories: ['sports'], price: 3, venue: 4 },
];

await mongoose.connect(config.mongoUrl);
console.log('Connected to MongoDB, wiping old data...');
await mongoose.connection.dropDatabase();
// Build every index now, so the unique ones exist before any data goes in
await Promise.all([User.init(), Venue.init(), Event.init(), Registration.init()]);

const passwordHash = await bcrypt.hash(PASSWORD, 10);
const [organizer, organizer2, attendee, attendee2] = await User.create([
  { name: 'Olivia Organizer', email: 'organizer@eventhub.test', role: 'organizer', passwordHash },
  { name: 'Omar Organizer', email: 'organizer2@eventhub.test', role: 'organizer', passwordHash },
  { name: 'Adam Attendee', email: 'attendee@eventhub.test', role: 'attendee', passwordHash },
  { name: 'Aya Attendee', email: 'attendee2@eventhub.test', role: 'attendee', passwordHash },
]);

const venues = await Venue.create(VENUES);

const eventsToCreate = [];
for (let i = 0; i < EVENTS.length; i++) {
  const event = EVENTS[i];

  let eventOrganizer = organizer;
  if (i % 3 === 2) {
    eventOrganizer = organizer2;
  }

  eventsToCreate.push({
    ...event,
    venue: venues[event.venue]._id,
    organizer: eventOrganizer._id,
    startsAt: daysFromNow(2 + i * 2, 17 + (i % 4)),
  });
}
const events = await Event.create(eventsToCreate);

// Adam registers for every third event and Aya for every fourth,
// which leaves the Tiny Room event with one seat
const registrations = [];
for (let i = 0; i < events.length; i++) {
  const event = events[i];

  if (i % 3 === 0) {
    const ticketCount = 1 + (i % 2);
    registrations.push({ user: attendee._id, event: event._id, ticketCount: ticketCount });
  }
  if (i % 4 === 0) {
    registrations.push({ user: attendee2._id, event: event._id, ticketCount: 1 });
  }
}
await Registration.create(registrations);

for (const event of events) {
  let seats = 0;
  for (const registration of registrations) {
    if (registration.event.equals(event._id)) {
      seats = seats + registration.ticketCount;
    }
  }
  await Event.updateOne({ _id: event._id }, { seatsTaken: seats });
}

console.log(`Created 4 users, ${venues.length} venues, ${events.length} events, ${registrations.length} registrations`);
console.log(`Test logins: organizer@eventhub.test and attendee@eventhub.test, password ${PASSWORD}`);

try {
  const indexedCount = await rebuildIndex();
  console.log(`Search index rebuilt with ${indexedCount} events`);
} catch (err) {
  const reason = err.message || err.name;
  console.warn(`Could not rebuild the search index (${reason}). Once Elasticsearch is up, run: npm run reindex`);
}

await mongoose.disconnect();
await es.close();
