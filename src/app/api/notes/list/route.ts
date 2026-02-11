import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import Note from "@/src/models/Note";
import Project from "@/src/models/Project";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { projectId } = await req.json();

    const auth = req.headers.get("authorization");
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = auth.replace("Bearer ", "");
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const project = await Project.findById(projectId);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    if (!project.members.includes(decoded.id)) {
      return NextResponse.json({ error: "Not part of project" }, { status: 403 });
    }

    const notes = await Note.find({ projectId }).sort({ createdAt: -1 });

    return NextResponse.json({ notes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
