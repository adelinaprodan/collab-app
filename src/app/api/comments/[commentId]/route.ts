import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/src/lib/mongodb";
import { getUserIdFromRequest } from "@/src/lib/auth";
import Comment from "@/src/models/Comment";
import Project from "@/src/models/Project";
import "@/src/models/User";


export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { commentId } = await params;
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return NextResponse.json(
        { error: "Invalid comment id" },
        { status: 400 }
      );
    }

    const comment = await Comment.findById(commentId).select(
      "_id author project"
    );
    if (!comment)
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    const isAuthor = String(comment.author) === String(userId);
    if (!isAuthor) {
      const project = await Project.findById(comment.project).select("owner");
      const isOwner = project && String(project.owner) === String(userId);
      if (!isOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await Comment.deleteOne({ _id: commentId });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
