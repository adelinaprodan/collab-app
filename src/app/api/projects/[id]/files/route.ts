import { NextResponse } from "next/server";
import mongoose from "mongoose";
import streamifier from "streamifier";

import { connectDB } from "@/src/lib/mongodb";
import { getUserIdFromRequest } from "@/src/lib/auth";
import { getGridFSBucket } from "@/src/lib/gridfs";

import Project from "@/src/models/Project";
import ProjectFile from "@/src/models/ProjectFile";
import User from "@/src/models/User"; // IMPORTANT so populate(User) works
import "@/src/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function assertProjectAccess(projectId: string, userId: string) {
  return Project.findOne({
    _id: projectId,
    $or: [{ owner: userId }, { members: userId }],
  }).select("_id owner members");
}

// ✅ GET = list files for a project
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

    const files = await ProjectFile.find({ project: projectId })
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json({ files }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

// ✅ POST = upload ONE file to this project (multipart/form-data)
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

    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // limit example: 20MB (adjust later)
    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: "File too large (max 20MB)" },
        { status: 400 }
      );
    }

    const mimeType = file.type || "application/octet-stream";
    const originalName = file.name || "file";

    const buffer = Buffer.from(await file.arrayBuffer());

    const bucket = getGridFSBucket();

    // upload to GridFS
    const uploadStream = bucket.openUploadStream(originalName, {
      contentType: mimeType,
      metadata: { projectId, uploadedBy: userId },
    });

    await new Promise<void>((resolve, reject) => {
      streamifier
        .createReadStream(buffer)
        .pipe(uploadStream)
        .on("error", reject)
        .on("finish", () => resolve());
    });

    // save metadata in normal collection
    const doc = await ProjectFile.create({
      project: projectId,
      uploadedBy: userId,
      originalName,
      mimeType,
      size: file.size,
      gridfsId: uploadStream.id,
    });

    const populated = await ProjectFile.findById(doc._id).populate(
      "uploadedBy",
      "name email"
    );

    return NextResponse.json({ file: populated ?? doc }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
