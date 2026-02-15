import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import Note from "@/src/models/Note";
import Project from "@/src/models/Project";
import { getUserIdFromRequest } from "@/src/lib/auth";

async function handleUpdate(req: Request) {
  await connectDB();

  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    noteId,
    title,
    content,
    linkedTask, // legacy
    linkedTasks,
    linkedFiles,
    linkedNotes,
  } = await req.json();

  if (!noteId)
    return NextResponse.json({ error: "noteId required" }, { status: 400 });

  const note = await Note.findById(noteId);
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  const project = await Project.findOne({
    _id: note.projectId,
    $or: [{ owner: userId }, { members: userId }],
  }).select("_id");

  if (!project) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (typeof title === "string") note.title = title;
  if (typeof content === "string") note.content = content;

  // Backwards compatibility:
  // - if linkedTasks provided -> use it
  // - else if linkedTask provided -> set single + also ensure it's included in linkedTasks
  if (Array.isArray(linkedTasks)) {
    note.linkedTasks = linkedTasks;
  } else if (linkedTask !== undefined) {
    note.linkedTask = linkedTask || null;
    const current = Array.isArray(note.linkedTasks) ? note.linkedTasks.map(String) : [];
    if (linkedTask) {
      if (!current.includes(String(linkedTask))) {
        note.linkedTasks = [...(note.linkedTasks || []), linkedTask];
      }
    }
  }

  if (Array.isArray(linkedFiles)) note.linkedFiles = linkedFiles;
  if (Array.isArray(linkedNotes)) note.linkedNotes = linkedNotes;

  await note.save();

  return NextResponse.json({ message: "Note updated", note });
}

export async function PATCH(req: Request) {
  try {
    return await handleUpdate(req);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Keep PUT so anything old still works
export async function PUT(req: Request) {
  try {
    return await handleUpdate(req);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
