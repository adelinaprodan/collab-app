import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import Note from "@/src/models/Note";
import Project from "@/src/models/Project";
import { getUserIdFromRequest } from "@/src/lib/auth";

export async function POST(req: Request) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
      projectId,
      title,
      content,
      linkedTask, // legacy
      linkedTasks,
      linkedFiles,
      linkedNotes,
    } = await req.json();

    if (!projectId || !title) {
      return NextResponse.json(
        { error: "projectId and title are required" },
        { status: 400 },
      );
    }

    const project = await Project.findOne({
      _id: projectId,
      $or: [{ owner: userId }, { members: userId }],
    }).select("_id");

    if (!project)
      return NextResponse.json(
        { error: "Not found or no access" },
        { status: 404 },
      );

    // Backwards compatibility: if someone sends linkedTask only, convert it into linkedTasks
    const normalizedLinkedTasks: string[] = Array.isArray(linkedTasks)
      ? linkedTasks
      : linkedTask
        ? [linkedTask]
        : [];

    const note = await Note.create({
      projectId,
      title,
      content: content ?? "",
      linkedTask: linkedTask || null,
      linkedTasks: normalizedLinkedTasks,
      linkedFiles: Array.isArray(linkedFiles) ? linkedFiles : [],
      linkedNotes: Array.isArray(linkedNotes) ? linkedNotes : [],
      createdBy: userId,
    });

    return NextResponse.json({ message: "Note created", note });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
