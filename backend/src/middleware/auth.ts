import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";
import { prisma } from "../database/prisma.js";

export interface SessionPayload {
  merchantId: string;
  exp: number;
}

function sign(payload: string): string {
  return createHmac("sha256", config.sessionSecret).update(payload).digest("base64url");
}

export function createSessionToken(merchantId: string): string {
  const payload: SessionPayload = { merchantId, exp: Date.now() + 7 * 24 * 3600 * 1000 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (payload.exp < Date.now()) return null;
  return payload;
}

export async function resolveMerchant(request: any): Promise<string | null> {
  const cookie = request.cookies?.dia_session;
  const header = request.headers?.authorization;
  const token = cookie || (typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : null);
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const m = await prisma.merchant.findUnique({ where: { id: payload.merchantId } });
  return m ? m.id : null;
}

export async function requireMerchant(request: any, reply: any): Promise<string | null> {
  const id = await resolveMerchant(request);
  if (!id) {
    reply.code(401).send({ error: "unauthorized" });
    return null;
  }
  return id;
}
