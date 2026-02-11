import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/src/lib/mongodb";
import { getUserIdFromRequest } from "@/src/lib/auth";
import Task from "@/src/models/Task";
import Project from "@/src/models/Project";
import Comment from "@/src/models/Comment";
import "@/src/models/User";

async function assertTaskAccess(taskId: string, userId: string) {
  const task = await Task.findById(taskId).select("_id project");
  if (!task) return null;

  const project = await Project.findOne({
    _id: task.project,
    $or: [{ owner: userId }, { members: userId }],
  }).select("_id");

  if (!project) return null;

  return { task };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId } = await params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
    }

    const access = await assertTaskAccess(taskId, userId);
    if (!access)
      return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const comments = await Comment.find({ task: taskId })
      .populate("author", "name email")
      .sort({ createdAt: 1 });

    return NextResponse.json({ comments }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId } = await params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
    }

    const access = await assertTaskAccess(taskId, userId);
    if (!access)
      return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const text = typeof body?.body === "string" ? body.body.trim() : "";
    if (!text)
      return NextResponse.json(
        { error: "Comment text is required" },
        { status: 400 }
      );

    const task = await Task.findById(taskId).select("_id project");
    if (!task)
      return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const comment = await Comment.create({
      task: taskId,
      project: task.project,
      author: userId,
      body: text,
    });

    const populated = await Comment.findById(comment._id).populate(
      "author",
      "name email"
    );
    return NextResponse.json(
      { comment: populated ?? comment },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
