import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/src/lib/mongodb";
import Note from "@/src/models/Note";
import Project from "@/src/models/Project";
import { getUserIdFromRequest } from "@/src/lib/auth";

export async function POST(req: Request) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const projectId = body?.projectId;

    // Hard fail if no/invalid projectId
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Valid projectId required" },
        { status: 400 },
      );
    }

    // Ensure user is member/owner of THIS project
    const project = await Project.findOne({
      _id: projectId,
      $or: [{ owner: userId }, { members: userId }],
    }).select("_id");

    if (!project) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Strict filter by projectId ONLY
    const notes = await Note.find({ projectId })
      .sort({ updatedAt: -1 })
      .select(
        "_id projectId title content linkedTasks linkedFiles linkedNotes createdBy createdAt updatedAt",
      );

    return NextResponse.json({ notes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
