import jwt from "jsonwebtoken";

type JwtPayload = {
  id?: string;
  userId?: string;
  _id?: string;
  email?: string;
};

export function getUserIdFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const token = auth.slice("Bearer ".length).trim();
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");

  const decoded = jwt.verify(token, secret) as JwtPayload;
  return decoded.id ?? decoded.userId ?? decoded._id ?? null;
}
