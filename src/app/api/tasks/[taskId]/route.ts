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
  }).select("_id owner members");

  if (!project) return null;

  return { task, project };
}

function isObjectIdString(v: unknown): v is string {
  return typeof v === "string" && mongoose.Types.ObjectId.isValid(v);
}

function parseDeadline(input: any): Date | null {
  if (input === null || input === "" || typeof input === "undefined")
    return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function PATCH(
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

    const result = await assertTaskAccess(taskId, userId);
    if (!result)
      return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const { task, project } = result;
    const body = await req.json().catch(() => ({}));

    if (typeof body?.title === "string") task.title = body.title.trim();
    if (typeof body?.description === "string")
      task.description = body.description.trim();

    if (typeof body?.status === "string") {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      task.status = body.status;
    }

    if ("deadline" in (body ?? {})) {
      const rawDeadline = body.deadline;

      if (
        rawDeadline === null ||
        rawDeadline === "" ||
        rawDeadline === undefined
      ) {
        task.deadline = null;
      } else if (typeof rawDeadline === "string") {
        const d = new Date(rawDeadline);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json(
            { error: "Invalid deadline" },
            { status: 400 }
          );
        }
        task.deadline = d;
      } else {
        return NextResponse.json(
          { error: "Invalid deadline" },
          { status: 400 }
        );
      }
    }

    // ✅ assignedTo
    if ("assignedTo" in (body ?? {})) {
      const next = body.assignedTo;

      if (next === null || next === "") {
        task.assignedTo = null;
      } else {
        if (!isObjectIdString(next)) {
          return NextResponse.json(
            { error: "Invalid assignedTo" },
            { status: 400 }
          );
        }

        const ownerId = String(project.owner);
        const memberIds = (project.members ?? []).map((m: any) => String(m));
        const allowed = new Set([ownerId, ...memberIds]);

        if (!allowed.has(next)) {
          return NextResponse.json(
            { error: "Assignee must be a project member" },
            { status: 400 }
          );
        }

        task.assignedTo = next as any;
      }
    }

    // ✅ deadline
    if ("deadline" in (body ?? {})) {
      const rawDeadline = body.deadline;

      if (
        rawDeadline === null ||
        rawDeadline === "" ||
        rawDeadline === undefined
      ) {
        task.deadline = null;
      } else if (typeof rawDeadline === "string") {
        const d = new Date(rawDeadline);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json(
            { error: "Invalid deadline" },
            { status: 400 }
          );
        }
        task.deadline = d;
      } else {
        return NextResponse.json(
          { error: "Invalid deadline" },
          { status: 400 }
        );
      }
    }

    await task.save();

    const populated = await Task.findById(task._id).populate(
      "assignedTo",
      "name email"
    );
    return NextResponse.json({ task: populated ?? task }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const result = await assertTaskAccess(taskId, userId);
    if (!result)
      return NextResponse.json({ error: "Task not found" }, { status: 404 });

    await Task.deleteOne({ _id: taskId });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
