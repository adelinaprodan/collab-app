import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/src/lib/mongodb";
import Project from "@/src/models/Project";
import { getUserIdFromRequest } from "@/src/lib/auth";
import "@/src/models/User";

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

    const project = await Project.findById(projectId).select(
      "_id owner members"
    );
    if (!project)
      return NextResponse.json({ error: "Project not found" }, { status: 404 });

    if (String(project.owner) === String(userId)) {
      return NextResponse.json(
        { error: "Owner cannot leave. Transfer ownership or delete project." },
        { status: 400 }
      );
    }

    project.members = (project.members ?? []).filter(
      (m: any) => String(m) !== String(userId)
    );
    await project.save();

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
