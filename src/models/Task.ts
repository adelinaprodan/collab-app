import mongoose, { Schema, models } from "mongoose";

const TaskSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },

    title: { type: String, required: true },
    description: { type: String, default: "" },

    status: {
      type: String,
      enum: ["todo", "doing", "done"],
      default: "todo",
      index: true,
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },

    // ✅ ADD THIS
    deadline: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

TaskSchema.index({ project: 1, status: 1, updatedAt: -1 });

const Task = models.Task || mongoose.model("Task", TaskSchema);
export default Task;
