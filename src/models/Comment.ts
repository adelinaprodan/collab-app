import mongoose, { Schema, models } from "mongoose";

const CommentSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },

    body: { type: String, required: true },
  },
  { timestamps: true }
);

CommentSchema.index({ task: 1, createdAt: -1 });

const Comment = models.Comment || mongoose.model("Comment", CommentSchema);
export default Comment;
