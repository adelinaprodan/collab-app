import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import User from "@/src/models/User";
import "@/src/models/User";

export async function GET() {
  try {
    await connectDB();

    const users = await User.find();

    return NextResponse.json({ success: true, users });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Error connecting", error },
      { status: 500 }
    );
  }
}
