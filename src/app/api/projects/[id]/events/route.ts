import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { getUserIdFromRequest } from "@/src/lib/auth";
import mongoose from "mongoose";

import Project from "@/src/models/Project";
import ProjectEvent from "@/src/models/ProjectEvent";
import "@/src/models/User";

async function assertProjectAccess(projectId: string, userId: string) {
  return Project.findOne({
    _id: projectId,
    $or: [{ owner: userId }, { members: userId }],
  }).select("_id name color owner members");
}

function parseRange(url: string) {
  const u = new URL(url);
  const fromRaw = u.searchParams.get("from");
  const toRaw = u.searchParams.get("to");

  const now = new Date();
  const fallbackFrom = new Date(now);
  fallbackFrom.setDate(fallbackFrom.getDate() - 30);
  const fallbackTo = new Date(now);
  fallbackTo.setDate(fallbackTo.getDate() + 60);

  const from = fromRaw ? new Date(fromRaw) : fallbackFrom;
  const to = toRaw ? new Date(toRaw) : fallbackTo;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return { from, to };
}

export async function GET(
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

    const project = await assertProjectAccess(projectId, userId);
    if (!project)
      return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const range = parseRange(req.url);
    if (!range)
      return NextResponse.json(
        { error: "Invalid date range" },
        { status: 400 }
      );

    const { from, to } = range;

    const events = await ProjectEvent.find({
      project: projectId,
      start: { $lt: to },
      end: { $gt: from },
    })
      .populate("createdBy", "name email")
      .sort({ start: 1 });

    return NextResponse.json({ events, project }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

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

    const project = await assertProjectAccess(projectId, userId);
    if (!project)
      return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description =
      typeof body?.description === "string" ? body.description.trim() : "";

    const startRaw = body?.start;
    const endRaw = body?.end;
    const start = typeof startRaw === "string" ? new Date(startRaw) : null;
    const end = typeof endRaw === "string" ? new Date(endRaw) : null;
    const allDay = typeof body?.allDay === "boolean" ? body.allDay : false;

    if (!title)
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!start || Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: "Invalid start" }, { status: 400 });
    }

    let finalEnd = end;
    if (!finalEnd || Number.isNaN(finalEnd.getTime())) {
      finalEnd = new Date(start);
      finalEnd.setHours(finalEnd.getHours() + 1);
    }

    const ev = await ProjectEvent.create({
      project: projectId,
      title,
      description,
      start,
      end: finalEnd,
      allDay,
      createdBy: userId,
    });

    return NextResponse.json({ event: ev }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
