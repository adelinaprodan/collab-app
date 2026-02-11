import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import Project from "@/src/models/Project";
import Task from "@/src/models/Task";
import { getUserIdFromRequest } from "@/src/lib/auth";
import mongoose from "mongoose";
import "@/src/models/User";

const VALID_STATUSES = new Set(["todo", "doing", "done"]);

async function assertProjectAccess(projectId: string, userId: string) {
  return Project.findOne({
    _id: projectId,
    $or: [{ owner: userId }, { members: userId }],
  }).select("_id owner members");
}

function parseDeadline(input: any): Date | null {
  if (input === null || input === "" || typeof input === "undefined")
    return null;
  // accept ISO string or yyyy-mm-dd
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Invalid project id" },
        { status: 400 }
      );
    }

    const project = await assertProjectAccess(projectId, userId);
    if (!project)
      return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const tasks = await Task.find({ project: projectId })
      .populate("assignedTo", "name email")
      .sort({ updatedAt: -1 });

    return NextResponse.json({ tasks }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Invalid project id" },
        { status: 400 }
      );
    }

    const project = await assertProjectAccess(projectId, userId);
    if (!project)
      return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description =
      typeof body?.description === "string" ? body.description.trim() : "";
    const status = typeof body?.status === "string" ? body.status : "todo";
    const deadline = parseDeadline(body?.deadline);

    if (!title)
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!VALID_STATUSES.has(status))
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });

    const task = await Task.create({
      project: projectId,
      title,
      description,
      status,
      deadline,
      createdBy: userId,
    });

    const populated = await Task.findById(task._id).populate(
      "assignedTo",
      "name email"
    );
    return NextResponse.json({ task: populated ?? task }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
