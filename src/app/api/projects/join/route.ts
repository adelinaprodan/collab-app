import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import Project from "@/src/models/Project";
import { getUserIdFromRequest } from "@/src/lib/auth";
import "@/src/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const joinCode =
      typeof body?.joinCode === "string"
        ? body.joinCode.trim().toUpperCase()
        : "";

    if (!joinCode) {
      return NextResponse.json(
        { error: "Join code is required" },
        { status: 400 }
      );
    }

    const project = await Project.findOne({ joinCode });
    if (!project) {
      return NextResponse.json({ error: "Invalid join code" }, { status: 404 });
    }

    // already owner or member? then no-op
    const ownerId = String(project.owner);
    const isAlready =
      ownerId === String(userId) ||
      (project.members ?? []).some((m: any) => String(m) === String(userId));

    if (!isAlready) {
      project.members = [...(project.members ?? []), userId as any];
      await project.save();
    }

    return NextResponse.json({ project }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
