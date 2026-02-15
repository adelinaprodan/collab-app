import mongoose, { Schema } from "mongoose";

const NoteSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    content: {
      type: String,
      default: "",
    },

    // Backwards compatibility (your old single-link field)
    linkedTask: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },

    // New: proper linking (many-to-many style)
    linkedTasks: [
      {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    ],

    linkedFiles: [
      {
        type: Schema.Types.ObjectId,
        ref: "ProjectFile",
      },
    ],

    linkedNotes: [
      {
        type: Schema.Types.ObjectId,
        ref: "Note",
      },
    ],

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Note || mongoose.model("Note", NoteSchema);
