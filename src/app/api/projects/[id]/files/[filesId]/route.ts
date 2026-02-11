import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/src/lib/mongodb";
import { getUserIdFromRequest } from "@/src/lib/auth";
import Project from "@/src/models/Project";
import ProjectFile from "@/src/models/ProjectFile";

export const runtime = "nodejs";

async function assertProjectAccess(projectId: string, userId: string) {
  return Project.findOne({
    _id: projectId,
    $or: [{ owner: userId }, { members: userId }],
  }).select("_id");
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; filesId: string }> }
) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, filesId } = await params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Invalid project id" },
        { status: 400 }
      );
    }
    if (!mongoose.Types.ObjectId.isValid(filesId)) {
      return NextResponse.json({ error: "Invalid file id" }, { status: 400 });
    }

    const project = await assertProjectAccess(projectId, userId);
    if (!project) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const file = await ProjectFile.findOne({
      _id: filesId,
      project: projectId,
    });
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await ProjectFile.deleteOne({ _id: filesId });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
