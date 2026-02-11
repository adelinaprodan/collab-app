import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/src/lib/mongodb";
import { getUserIdFromRequest } from "@/src/lib/auth";
import { getGridFSBucket } from "@/src/lib/gridfs";

import Project from "@/src/models/Project";
import ProjectFile from "@/src/models/ProjectFile";
import "@/src/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function assertProjectAccess(projectId: string, userId: string) {
  return Project.findOne({
    _id: projectId,
    $or: [{ owner: userId }, { members: userId }],
  }).select("_id");
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filesId: string }> }
) {
  try {
    await connectDB();

    const userId = getUserIdFromRequest(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { filesId } = await params;
    if (!mongoose.Types.ObjectId.isValid(filesId)) {
      return new NextResponse("Invalid file id", { status: 400 });
    }

    const meta = await ProjectFile.findById(filesId);
    if (!meta) return new NextResponse("File not found", { status: 404 });

    const hasAccess = await assertProjectAccess(String(meta.project), userId);
    if (!hasAccess) return new NextResponse("Forbidden", { status: 403 });

    const bucket = getGridFSBucket();
    const dl = bucket.openDownloadStream(meta.gridfsId);

    return new NextResponse(dl as any, {
      headers: {
        "Content-Type": meta.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          meta.originalName
        )}"`,
      },
    });
  } catch (err: any) {
    return new NextResponse(err?.message ?? "Server error", { status: 500 });
  }
}
