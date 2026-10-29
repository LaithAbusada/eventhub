# EventHub

EventHub is a small events app. Organizers create events at venues. Attendees search for events, register and cancel. An event has as many seats as its venue, and two people can never take the last seat at the same time.

The API is Node.js with Express, MongoDB and Elasticsearch. The frontend is Vue 3 with Vue Router and Pinia. Everything runs with Docker Compose.

## What you need

- Docker Desktop, or Docker Engine with Compose v2
- About 2 GB of free memory, mostly for Elasticsearch

That's all. Node.js 24 is only needed to run the API or the frontend outside Docker (see the end of this file).

## Environment variables

Copy `.env.example` to `.env`.

| Variable | What it is | Value in `.env.example` |
|---|---|---|
| `PORT` | The port the API listens on | `4000` |
| `MONGO_URL` | MongoDB connection string | `mongodb://localhost:27017/eventhub` |
| `ELASTIC_URL` | Elasticsearch address | `http://localhost:9200` |
| `JWT_SECRET` | The secret that signs login tokens. Use your own long random value anywhere other than your laptop. | an example value |
| `JWT_EXPIRES_IN` | How long a login lasts | `1d` |

## Start everything

```bash
git clone https://github.com/LaithAbusada/eventhub.git
cd eventhub
cp .env.example .env
docker compose up --build -d
```

| What | Address |
|---|---|
| The app | http://localhost:8080 |
| The API | http://localhost:4000/api (health check: http://localhost:4000/api/health) |
| MongoDB | `localhost:27017` |
| Elasticsearch | http://localhost:9200 |

## Sample data and the search index

```bash
docker compose exec api npm run seed
```

This empties the database, adds 4 users, 6 venues, 30 events and 18 registrations, and rebuilds the search index.

To rebuild only the search index from MongoDB:

```bash
docker compose exec api npm run reindex
```

On startup the API also creates the index by itself if it doesn't exist yet.

## Test accounts

The password for all of them is `event123`.

| Email | Role |
|---|---|
| `organizer@eventhub.test` | organizer |
| `attendee@eventhub.test` | attendee |
| `organizer2@eventhub.test` | organizer |
| `attendee2@eventhub.test` | attendee |

## API

Every route starts with `/api`. After logging in, send the token as `Authorization: Bearer <token>`.

| Method | Route | Who can call it | What it does |
|---|---|---|---|
| POST | `/api/auth/register` | anyone | Create an account (`name`, `email`, `password`, `role`) |
| POST | `/api/auth/login` | anyone | Log in. Returns a token and the user |
| GET | `/api/auth/me` | logged in | The current user |
| GET | `/api/events` | anyone | Upcoming events, soonest first (`page`, `size`) |
| GET | `/api/events/search` | anyone | Search, see below |
| GET | `/api/events/:id` | anyone | One event with its venue, organizer and seats left |
| POST | `/api/events` | organizers | Create an event |
| PUT | `/api/events/:id` | the event's organizer | Edit an event |
| DELETE | `/api/events/:id` | the event's organizer | Delete an event and its registrations |
| POST | `/api/events/:id/register` | logged in | Register (`ticketCount` from 1 to 10, default 1) |
| DELETE | `/api/events/:id/register` | logged in | Cancel my registration |
| GET | `/api/events/:id/attendees` | the event's organizer | Who is coming |
| GET | `/api/venues` | anyone | All venues |
| DELETE | `/api/venues/:id` | organizers | Delete a venue. Refused while any event uses it |
| GET | `/api/me/registrations` | logged in | My confirmed registrations |
| GET | `/api/me/events` | organizers | My events with registration counts and seats left |
| GET | `/api/stats/top-venues` | anyone | The 5 venues with the most confirmed registrations |
| GET | `/api/health` | anyone | Returns `{ "ok": true }` |

**Search parameters:** `q` (words to search for), `city`, `category`, `from` and `to` (dates as `YYYY-MM-DD`), `minPrice`, `maxPrice`, `sort` (`relevance`, `soonest` or `cheapest`), `page`, `size` (up to 50).

**Errors** always have the same shape:

```json
{ "error": { "code": "EVENT_FULL", "message": "Sorry, there are not enough seats left" } }
```

Invalid input also has `details`, a list of `{ field, message }`.

| Status | When |
|---|---|
| 400 | a bad query string |
| 401 | no token, or an invalid one |
| 403 | logged in, but not allowed (for example, editing someone else's event) |
| 404 | not found |
| 409 | already registered, event full, event already started, email taken, venue still in use |
| 422 | an invalid request body |
| 503 | search is unavailable |

`requests.http` has ready-made requests for all of these routes except the health check, for the VS Code REST Client extension.

## Checking the last-seat race

There are no automated tests. `api/scripts/race.js` checks the race by hand: it creates two new attendees and registers both at the same moment for one event. With the app running and Node.js installed:

```bash
cd api
node scripts/race.js <id of an event with one seat left>
```

One request gets 201 and the other 409 `EVENT_FULL`. After a fresh seed, "Tiny Room Acoustic Set" has one seat left.

## What's done, what's skipped, what's known

**Done:** all the required parts.

- The data model with its indexes.
- Every API route, with JWT login, owner checks and one error shape.
- Both aggregation endpoints.
- Search on Elasticsearch with an explicit mapping, kept in sync with MongoDB, plus a reindex script.
- The Vue app with all five pages and route guards.
- Docker Compose for the whole stack.

**Skipped:** all the extra credit (waitlist, autocomplete, geo search, an outbox, automated tests and CI, rate limiting). I chose to finish the required parts properly first.

**Known issues:**

- Editing an event whose date has passed fails, because the form always sends the date and the API only accepts future dates.
- While a new search runs, the search page shows "Loading…" in place of the old results.
- The category filter on the search page is a text box, because there is no list of categories to choose from.
- Date filters use UTC days, so an event between midnight and 3 am Amman time counts as the day before.
- The web container looks up the API container's address once, when it starts. If you rebuild only the API container, run `docker compose restart web` afterwards.

## Running locally for development

With Node.js 24, from the repo root:

```bash
npm run dev
```

This starts MongoDB and Elasticsearch in Docker, installs the packages the first time, and runs the API on http://localhost:4000 and the app on http://localhost:5173, both reloading when a file changes. Ctrl+C stops them.

For the sample data, in a second terminal:

```bash
npm run seed
```
