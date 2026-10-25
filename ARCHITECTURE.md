# Initial MD Document

## The last-seat race

**The bug.** A first version registered in three steps: read the event's `seatsTaken`, check there was room, then save the registration and add the tickets. Two requests can both read before either one writes, so both see the last seat free and both take it. `api/scripts/race.js` registers two new attendees for the 2-seat event at the same moment. With that version both got 201 and the event ended at 3 of 2 seats, in 5 out of 5 runs (see the commit "naive registration and a race script").

**The fix.** The check and the claim are now one atomic MongoDB update: `findOneAndUpdate` with a filter that only matches while `seatsTaken <= capacity - ticketCount`, and `$inc` on `seatsTaken`. MongoDB applies updates to a single document one at a time, so of two racing requests only the first matches. The second gets `null` back and answers 409 `EVENT_FULL`. `race.js` now gives one 201 and one 409, with 2 of 2 seats taken, in 10 out of 10 runs. No transaction or replica set is needed for this.

**Why the unique index isn't enough on its own.** The unique index on `(user, event)` stops the same person registering twice, even when two of their requests arrive together. It does nothing about two different people taking the last seat; the seat counter handles that.

**Cancelling.** Cancel switches the registration from confirmed to cancelled in one atomic update, with the status in the filter, and then gives the seats back. A double click finds nothing the second time, so the seats are returned only once.

**What's left, and the choices made:**

- If the server crashes between claiming the seats and saving the registration, those seats stay claimed. A MongoDB transaction would close that gap, but it needs a replica set.
- `seatsTaken` is a copy of information that also lives in the registrations. If it ever drifts, it can be recounted from the confirmed registrations; the seed script does exactly that.
- Re-registering after a cancel reuses the cancelled registration, because the unique index allows only one per user and event.
- Capacity counts tickets, not registrations. This is my assumption, which I asked about in my confirmation email.
