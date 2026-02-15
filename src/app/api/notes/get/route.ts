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

    const { noteId } = await req.json();
    if (!noteId)
      return NextResponse.json({ error: "noteId required" }, { status: 400 });

    const note = await Note.findById(noteId);
    if (!note)
      return NextResponse.json({ error: "Note not found" }, { status: 404 });

    const project = await Project.findOne({
      _id: note.projectId,
      $or: [{ owner: userId }, { members: userId }],
    }).select("_id");

    if (!project)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({ note });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
