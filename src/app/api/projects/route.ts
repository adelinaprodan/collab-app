import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import Project from "@/src/models/Project";
import { getUserIdFromRequest } from "@/src/lib/auth";
import "@/src/models/User";

export async function GET(req: Request) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const projects = await Project.find({
      $or: [{ owner: userId }, { members: userId }],
    }).sort({ updatedAt: -1 });

    return NextResponse.json({ projects }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const description =
      typeof body?.description === "string" ? body.description.trim() : "";

    if (!name)
      return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const project = await Project.create({
      name,
      description,
      owner: userId,
      members: [userId], // ✅ ensures list works even if you query members
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
