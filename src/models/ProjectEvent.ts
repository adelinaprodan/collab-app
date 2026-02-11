import mongoose, { Schema } from "mongoose";

const ProjectEventSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    title: { type: String, required: true },
    description: { type: String, default: "" },

    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true },

    allDay: { type: Boolean, default: false },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ProjectEventSchema.index({ project: 1, start: 1 });

const ProjectEvent =
  mongoose.models.ProjectEvent ||
  mongoose.model("ProjectEvent", ProjectEventSchema);

export default ProjectEvent;
