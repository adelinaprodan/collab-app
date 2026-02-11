import mongoose, { Schema, models } from "mongoose";

const EventSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },

    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true, index: true },
    allDay: { type: Boolean, default: true },

    // personal calendar owner
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // optional project/team calendar
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },

    // for now: simple color per event (later: per calendar)
    color: { type: String, default: "#2563eb" }, // blue
  },
  { timestamps: true }
);

EventSchema.index({ owner: 1, start: 1 });
EventSchema.index({ project: 1, start: 1 });

const Event = models.Event || mongoose.model("Event", EventSchema);
export default Event;
