import mongoose, { Schema, models } from "mongoose";

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },

    color: { type: String, default: "#ef4444" }, // red

    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    joinCode: {
      type: String,
      unique: true,
      default: () => Math.random().toString(36).substring(2, 8).toUpperCase(),
    },
  },
  { timestamps: true }
);

const Project = models.Project || mongoose.model("Project", ProjectSchema);
export default Project;
