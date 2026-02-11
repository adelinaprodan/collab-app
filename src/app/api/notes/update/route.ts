import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import Note from "@/src/models/Note";
import Project from "@/src/models/Project";
import jwt from "jsonwebtoken";

export async function PUT(req: Request) {
  try {
    await connectDB();
    const { noteId, title, content, linkedTask } = await req.json();

    const auth = req.headers.get("authorization");
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = auth.replace("Bearer ", "");
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const note = await Note.findById(noteId);
    if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    const project = await Project.findById(note.projectId);
    if (!project.members.includes(decoded.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    note.title = title ?? note.title;
    note.content = content ?? note.content;
    note.linkedTask = linkedTask ?? note.linkedTask;

    await note.save();

    return NextResponse.json({ message: "Note updated", note });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
