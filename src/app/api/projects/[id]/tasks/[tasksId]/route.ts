import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import Task from "@/src/models/Task";
import Project from "@/src/models/Project";
import { getUserIdFromRequest } from "@/src/lib/auth";
import mongoose from "mongoose";
import "@/src/models/User";

const VALID_STATUSES = new Set(["todo", "doing", "done"]);

async function assertTaskAccess(taskId: string, userId: string) {
  const task = await Task.findById(taskId);
  if (!task) return null;

  const project = await Project.findOne({
    _id: task.project,
    $or: [{ owner: userId }, { members: userId }],
  });

  if (!project) return null;
  return task;
}

export async function PATCH(req: Request, ctx: { params: { taskId: string } }) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId } = ctx.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
    }

    const task = await assertTaskAccess(taskId, userId);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));

    if (typeof body?.title === "string") task.title = body.title.trim();
    if (typeof body?.description === "string") task.description = body.description.trim();

    if (typeof body?.status === "string") {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      task.status = body.status;
    }

    await task.save();
    return NextResponse.json({ task }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: { params: { taskId: string } }) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId } = ctx.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
    }

    const task = await assertTaskAccess(taskId, userId);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    await Task.deleteOne({ _id: taskId });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
