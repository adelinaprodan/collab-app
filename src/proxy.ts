import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export function proxy(req: NextRequest) {
  const protectedPaths = ["/api/projects", "/api/tasks"];

  const isProtected = protectedPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );

  if (!isProtected) return NextResponse.next();

  const token = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET as string);
    return NextResponse.next();
  } catch {
    return new NextResponse("Invalid token", { status: 401 });
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
