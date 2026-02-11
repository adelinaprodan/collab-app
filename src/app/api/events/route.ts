import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { getUserIdFromRequest } from "@/src/lib/auth";
import PersonalEvent from "@/src/models/PersonalEvent";

// IMPORTANT to avoid MissingSchemaError when populate uses "User"
import "@/src/models/User";

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

    const query: any = { owner: userId };

    // overlap range (events that touch the window)
    if (from || to) {
      query.start = {};
      query.end = {};
      if (to) query.start.$lt = to;
      if (from) query.end.$gt = from;
      // if only one bound, still ok
      if (!to) delete query.start;
      if (!from) delete query.end;
    }

    const personal = await PersonalEvent.find(query).sort({ start: 1 }).lean();

    const events = (personal as any[]).map((e) => ({
      _id: String(e._id),
      kind: "event" as const,
      title: e.title,
      start: new Date(e.start).toISOString(),
      end: new Date(e.end).toISOString(),
      allDay: !!e.allDay,
      color: e.color || "#2563eb",
    }));

    return NextResponse.json({ events }, { status: 200 });
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

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description =
      typeof body?.description === "string" ? body.description.trim() : "";

    const startRaw = body?.start;
    const endRaw = body?.end;

    const start = typeof startRaw === "string" ? new Date(startRaw) : null;
    const end = typeof endRaw === "string" ? new Date(endRaw) : null;

    const allDay = typeof body?.allDay === "boolean" ? body.allDay : false;
    const color = typeof body?.color === "string" ? body.color : "#2563eb";

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

    const ev = await PersonalEvent.create({
      owner: userId,
      title,
      description,
      start,
      end: finalEnd,
      allDay,
      color,
    });

    return NextResponse.json(
      {
        event: {
          _id: String(ev._id),
          kind: "event",
          title: ev.title,
          start: ev.start.toISOString(),
          end: ev.end.toISOString(),
          allDay: ev.allDay,
          color: ev.color,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
