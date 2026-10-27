import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    startsAt: { type: Date, required: true },
    price: { type: Number, required: true, min: 0 },
    // References: these store the other document's _id, not a copy of it
    venue: { type: mongoose.Schema.ObjectId, ref: "Venue", required: true },
    organizer: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    categories: { type: [String], default: [] },
    // Seats claimed so far. Kept on the event so one atomic update can check and claim seats.
    seatsTaken: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
);

eventSchema.index({ startsAt: 1 }); // upcoming events, soonest first
eventSchema.index({ organizer: 1, startsAt: 1 }); // an organizer's events, by date
eventSchema.index({ venue: 1, startsAt: 1 }); // "does this venue have upcoming events?"

export const Event = mongoose.model("Event", eventSchema);
