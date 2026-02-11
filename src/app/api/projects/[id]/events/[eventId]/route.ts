import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { getUserIdFromRequest } from "@/src/lib/auth";
import mongoose from "mongoose";

import Project from "@/src/models/Project";
import ProjectEvent from "@/src/models/ProjectEvent";

// IMPORTANT: avoid MissingSchemaError when populate uses "User"
import "@/src/models/User";

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

function parseDateOrNull(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function assertProjectMember(projectId: string, userId: string) {
  return Project.findOne({
    _id: projectId,
    $or: [{ owner: userId }, { members: userId }],
  }).select("_id owner members");
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, eventId } = await params;

    if (!isValidId(projectId)) {
      return NextResponse.json(
        { error: "Invalid project id" },
        { status: 400 }
      );
    }
    if (!isValidId(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const project = await assertProjectMember(projectId, userId);
    if (!project)
      return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const ev = await ProjectEvent.findOne({ _id: eventId, project: projectId });
    if (!ev)
      return NextResponse.json({ error: "Event not found" }, { status: 404 });

    // Permissions: project owner OR event creator can edit
    const isOwner = String(project.owner) === String(userId);
    const isCreator = String(ev.createdBy) === String(userId);
    if (!isOwner && !isCreator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    if (typeof body?.title === "string") ev.title = body.title.trim();
    if (typeof body?.description === "string")
      ev.description = body.description.trim();
    if (typeof body?.allDay === "boolean") ev.allDay = body.allDay;

    const nextStart =
      "start" in (body ?? {}) ? parseDateOrNull(body.start) : null;
    const nextEnd = "end" in (body ?? {}) ? parseDateOrNull(body.end) : null;

    if ("start" in (body ?? {}) && !nextStart) {
      return NextResponse.json({ error: "Invalid start" }, { status: 400 });
    }
    if ("end" in (body ?? {}) && !nextEnd) {
      return NextResponse.json({ error: "Invalid end" }, { status: 400 });
    }

    if (nextStart && nextEnd) {
      if (nextEnd.getTime() <= nextStart.getTime()) {
        return NextResponse.json(
          { error: "End must be after start" },
          { status: 400 }
        );
      }
      ev.start = nextStart;
      ev.end = nextEnd;
    } else if (nextStart && !nextEnd) {
      const duration =
        new Date(ev.end).getTime() - new Date(ev.start).getTime();
      const newEnd = new Date(
        nextStart.getTime() + Math.max(duration, 60 * 60 * 1000)
      );
      ev.start = nextStart;
      ev.end = newEnd;
    } else if (!nextStart && nextEnd) {
      if (nextEnd.getTime() <= new Date(ev.start).getTime()) {
        return NextResponse.json(
          { error: "End must be after start" },
          { status: 400 }
        );
      }
      ev.end = nextEnd;
    }

    await ev.save();

    return NextResponse.json(
      {
        event: {
          _id: String(ev._id),
          kind: "event",
          title: ev.title,
          description: ev.description,
          start: new Date(ev.start).toISOString(),
          end: new Date(ev.end).toISOString(),
          allDay: !!ev.allDay,
          project: { _id: String(project._id) },
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, eventId } = await params;

    if (!isValidId(projectId)) {
      return NextResponse.json(
        { error: "Invalid project id" },
        { status: 400 }
      );
    }
    if (!isValidId(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const project = await assertProjectMember(projectId, userId);
    if (!project)
      return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const ev = await ProjectEvent.findOne({
      _id: eventId,
      project: projectId,
    }).select("_id createdBy project");
    if (!ev)
      return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const isOwner = String(project.owner) === String(userId);
    const isCreator = String(ev.createdBy) === String(userId);
    if (!isOwner && !isCreator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ProjectEvent.deleteOne({ _id: eventId });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
