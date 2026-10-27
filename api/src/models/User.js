import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    // select: false leaves the hash out of every query unless you ask for it with .select('+passwordHash')
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['organizer', 'attendee'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

// Never put the hash in JSON responses, even when it was loaded
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
