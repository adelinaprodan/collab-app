import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/src/lib/mongodb";
import Project from "@/src/models/Project";
import { getUserIdFromRequest } from "@/src/lib/auth";
import "@/src/models/User";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    await connectDB();
    const me = getUserIdFromRequest(req);
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, userId } = await params;

    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const project = await Project.findById(projectId).select("_id owner members");
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    if (String(project.owner) !== String(me)) {
      return NextResponse.json({ error: "Only owner can remove members" }, { status: 403 });
    }

    if (String(project.owner) === String(userId)) {
      return NextResponse.json({ error: "Cannot remove owner" }, { status: 400 });
    }

    project.members = (project.members ?? []).filter((m: any) => String(m) !== String(userId));
    await project.save();

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
