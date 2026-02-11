import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import Project from "@/src/models/Project";
import User from "@/src/models/User";
import { getUserIdFromRequest } from "@/src/lib/auth";
import mongoose from "mongoose";
import "@/src/models/User";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project id" },
        { status: 400 }
      );
    }

    const project = await Project.findOne({
      _id: id,
      $or: [{ owner: userId }, { members: userId }],
    })
      .populate("owner", "name email")
      .populate("members", "name email");

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project }, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/projects/[id] error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
