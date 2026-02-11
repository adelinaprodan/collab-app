import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { getUserIdFromRequest } from "@/src/lib/auth";
import Project from "@/src/models/Project";
import Task from "@/src/models/Task";

export async function GET(req: Request) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const fromD = from ? new Date(from) : new Date();
    const toD = to
      ? new Date(to)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const projects = await Project.find({
      $or: [{ owner: userId }, { members: userId }],
    }).select("_id name");

    const projectIds = projects.map((p) => p._id);

    const tasks = await Task.find({
      project: { $in: projectIds },
      deadline: { $ne: null, $gte: fromD, $lte: toD },
    })
      .sort({ deadline: 1 })
      .populate("project", "name")
      .populate("assignedTo", "name email");

    return NextResponse.json({ tasks }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
