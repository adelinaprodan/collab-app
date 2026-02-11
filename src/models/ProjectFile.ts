import mongoose, { Schema, models } from "mongoose";

const ProjectFileSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },

    // This points to the GridFS file _id
    gridfsId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

ProjectFileSchema.index({ project: 1, createdAt: -1 });

const ProjectFile =
  models.ProjectFile || mongoose.model("ProjectFile", ProjectFileSchema);

export default ProjectFile;
