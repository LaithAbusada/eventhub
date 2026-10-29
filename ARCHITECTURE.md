# Architecture

## Data model

There are four collections in MongoDB.

| Collection | Fields | Links to |
|---|---|---|
| `users` | name, email, passwordHash, role | |
| `venues` | name, city, address, capacity, location | |
| `events` | title, description, startsAt, price, categories, seatsTaken | venue, organizer |
| `registrations` | status, ticketCount, createdAt | user, event |

**Why I used references instead of embedding:**

- **Event to venue.** Many events happen at the same venue, and the venue's capacity is the limit for all of them. Storing only the venue's id means there is one copy of each venue. If I embedded it, every event would have its own copy, and the copies would get out of date.
- **Event to organizer.** The event only needs to know who created it. Users log in and have their own name, so they live in their own collection. The dashboard finds an organizer's events with an index on `organizer`.
- **Registrations have their own collection** instead of a list inside the event. A big event could have thousands of registrations, and the event document would keep growing. As separate documents, a unique index on `user` + `event` stops anyone registering twice, and I can easily get both "my registrations" and "who is coming to this event".
- **Embedded:** `categories` (a list of words) and `location` (`{ lat, lng }`), because they only belong to that one document.

`seatsTaken` on each event counts the tickets sold. The registrations hold the same information, but a counter on the event lets me check for free seats and take them in one step (see the race section). The seed script sets it by counting the registrations.

**Indexes:**

| Index | What it's for |
|---|---|
| `users.email`, unique | logging in, and no two accounts with the same email |
| `registrations (user, event)`, unique | one registration per person per event, and "my registrations" |
| `registrations (event, status)` | the attendee list and the registration counts |
| `events (startsAt)` | the list of upcoming events, soonest first |
| `events (organizer, startsAt)` | the organizer dashboard |
| `events (venue, startsAt)` | checking if a venue has upcoming events before deleting it |

## Keeping MongoDB and Elasticsearch in sync

MongoDB is the main database. Elasticsearch only keeps a copy of each event for search: title, description, venue name, city, categories, date and price. I wrote the mapping by hand, and it refuses any field that isn't in it.

**How it works:** right after an event is saved in MongoDB, the same request updates Elasticsearch.

- Create or edit: the event is loaded from MongoDB with its venue and written to the index.
- Delete: the event is removed from the index.

If the Elasticsearch part fails, the error is only logged. The request still succeeds, because MongoDB already has the change.

When the API starts, it connects to Elasticsearch in the background and tries again every 5 seconds. If the index doesn't exist yet, it builds it from MongoDB. Until then, search returns 503 and everything else works. The search page shows a message and the normal event list instead.

`npm run reindex` deletes the index and builds it again from MongoDB.

**If the Elasticsearch write fails after MongoDB succeeded,** the user still gets a success, and the log shows `Could not index event <id>`. Search is now wrong for that event: a new event is missing, an edited one shows its old version, or a deleted one still shows up. It stays like that until someone runs the reindex. I tested this by stopping Elasticsearch, creating an event and starting Elasticsearch again: the event was missing from search until I ran `npm run reindex`.

**Where this breaks:**

- Nothing fixes a wrong index by itself. Someone has to run the reindex.
- If the API crashes between the two writes, search misses that change and nothing is logged.
- While Elasticsearch is down, creating, editing and deleting take about a second longer, because the API waits for Elasticsearch to time out.
- A new or edited event shows up in search about a second later, because Elasticsearch updates its results once per second.
- While the reindex runs, search doesn't work for a few seconds.

With more traffic, I would use an outbox instead: save "event X changed" in MongoDB together with the event, and let a separate worker update Elasticsearch and keep trying until it works.

## The last-seat race

**The problem.** My first version registered in three steps: read how many seats were taken, check there was room, then save. Two requests can both read before either one saves, so both see one free seat and both take it. `api/scripts/race.js` sends two registrations for the 2-seat event at the same moment. With that version both got 201, and the event ended up with 3 of 2 seats taken, 5 times out of 5.

**The fix.** Checking and taking the seats is now a single MongoDB update: `findOneAndUpdate` with a filter that only matches while `seatsTaken <= capacity - ticketCount`, and `$inc` to add the tickets. MongoDB runs updates on one document one at a time, so only the first of two requests matches. The second gets `null` back and answers 409 `EVENT_FULL`. Now `race.js` gives one 201 and one 409, with 2 of 2 seats taken, 10 times out of 10.

**Why the unique index isn't enough.** The unique index on `user` + `event` stops the same person registering twice. It doesn't stop two different people taking the last seat. The seat counter does that.

**Cancelling.** Cancel changes the registration from `confirmed` to `cancelled` in one update, and only then gives the seats back. If someone double-clicks, the second click finds nothing to cancel, so the seats are only given back once.

**Also:**

- Registering again after cancelling reuses the old registration, because the unique index only allows one per person and event.
- Capacity counts tickets, not registrations. I asked about this in my confirmation email.

## Other choices I made

- The event list and search only show upcoming events. Search counts from the start of today, so events from earlier today still show.
- You can't register for an event that has already started.
- An event can only move to a venue that has room for the seats already taken.
- A venue can't be deleted while it has upcoming events, or while past events still use it, so those events keep their venue.
- Organizers can register for events too.
- Prices are in JOD, and 0 means free.

## What I would change first with real traffic

1. Use an outbox, or MongoDB change streams, with a worker that keeps retrying, so search can't go out of date without anyone noticing.
2. Turn on Elasticsearch security, keep passwords and keys somewhere safer than a `.env` file, use HTTPS, and limit how often someone can try to log in.
3. Collect the logs and send an alert on `Could not index event`, so problems get noticed.
