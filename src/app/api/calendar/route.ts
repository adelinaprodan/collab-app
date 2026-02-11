import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { getUserIdFromRequest } from "@/src/lib/auth";
import Project from "@/src/models/Project";
import ProjectEvent from "@/src/models/ProjectEvent";
import PersonalEvent from "@/src/models/PersonalEvent";
import Task from "@/src/models/Task";
import mongoose from "mongoose";

// IMPORTANT to avoid MissingSchemaError when populate uses "User"
import "@/src/models/User";

type CalendarItem = {
  _id: string;
  kind: "event" | "task";
  title: string;
  start: string; // ISO
  end: string; // ISO
  allDay: boolean;
  project?: { _id: string; name: string };
  status?: "todo" | "doing" | "done";
  color?: string;
};

function parseDateParam(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const from = parseDateParam(url.searchParams.get("from"));
    const to = parseDateParam(url.searchParams.get("to"));

    const projectIdRaw = url.searchParams.get("projectId");
    const projectId =
      projectIdRaw && mongoose.Types.ObjectId.isValid(projectIdRaw)
        ? projectIdRaw
        : null;

    // accessible projects
    let projectIds: string[] = [];
    if (projectId) {
      const p = await Project.findOne({
        _id: projectId,
        $or: [{ owner: userId }, { members: userId }],
      }).select("_id");
      if (!p) return NextResponse.json({ items: [] }, { status: 200 });
      projectIds = [projectId];
    } else {
      const projects = await Project.find({
        $or: [{ owner: userId }, { members: userId }],
      }).select("_id");
      projectIds = projects.map((p: any) => String(p._id));
    }

    // overlap window for events
    const eventQuery: any = { project: { $in: projectIds } };
    if (from || to) {
      eventQuery.start = {};
      eventQuery.end = {};
      if (to) eventQuery.start.$lt = to;
      if (from) eventQuery.end.$gt = from;
      if (!to) delete eventQuery.start;
      if (!from) delete eventQuery.end;
    }

    const taskQuery: any = {
      project: { $in: projectIds },
      deadline: { $ne: null },
    };
    if (from || to) {
      taskQuery.deadline = { $ne: null };
      if (from) taskQuery.deadline.$gte = from;
      if (to) taskQuery.deadline.$lte = to;
    }

    // personal events ONLY on dashboard (no projectId filter)
    const personalQuery: any = { owner: userId };
    if (!projectId && (from || to)) {
      personalQuery.start = {};
      personalQuery.end = {};
      if (to) personalQuery.start.$lt = to;
      if (from) personalQuery.end.$gt = from;
      if (!to) delete personalQuery.start;
      if (!from) delete personalQuery.end;
    }

    const [events, tasks, personal] = await Promise.all([
      ProjectEvent.find(eventQuery)
        .populate("project", "name")
        .sort({ start: 1 })
        .lean(),
      Task.find(taskQuery)
        .populate("project", "name")
        .sort({ deadline: 1 })
        .lean(),
      projectId
        ? Promise.resolve([])
        : PersonalEvent.find(personalQuery).sort({ start: 1 }).lean(),
    ]);

    const items: CalendarItem[] = [];

    // personal events
    for (const e of personal as any[]) {
      items.push({
        _id: String(e._id),
        kind: "event",
        title: e.title,
        start: new Date(e.start).toISOString(),
        end: new Date(e.end).toISOString(),
        allDay: !!e.allDay,
        color: e.color || "#2563eb",
      });
    }

    // project events
    for (const e of events as any[]) {
      items.push({
        _id: String(e._id),
        kind: "event",
        title: e.title,
        start: new Date(e.start).toISOString(),
        end: new Date(e.end).toISOString(),
        allDay: !!e.allDay,
        project: e.project
          ? { _id: String(e.project._id), name: e.project.name }
          : undefined,
        color: "#ef4444",
      });
    }

    // task deadlines
    for (const t of tasks as any[]) {
      const d = new Date(t.deadline);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);

      items.push({
        _id: String(t._id),
        kind: "task",
        title: t.title,
        start: start.toISOString(),
        end: end.toISOString(),
        allDay: true,
        status: t.status,
        project: t.project
          ? { _id: String(t.project._id), name: t.project.name }
          : undefined,
      });
    }

    return NextResponse.json({ items }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
