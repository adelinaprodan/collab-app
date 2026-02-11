import mongoose, { Schema, models } from "mongoose";

const PersonalEventSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: { type: String, required: true },
    description: { type: String, default: "" },

    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true },

    allDay: { type: Boolean, default: false },

    // optional per-event color for personal calendar
    color: { type: String, default: "#2563eb" }, // blue
  },
  { timestamps: true }
);

PersonalEventSchema.index({ owner: 1, start: 1 });

const PersonalEvent =
  models.PersonalEvent || mongoose.model("PersonalEvent", PersonalEventSchema);

export default PersonalEvent;
