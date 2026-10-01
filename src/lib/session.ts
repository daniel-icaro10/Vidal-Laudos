// Funções de sessão sem dependência de Node — usadas também no middleware (edge).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "vidal_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

export type Role = "GERENTE" | "FUNCIONARIO";
export type SessionPayload = { sub: string; role: Role; name: string };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET não configurado");
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload, maxAgeSeconds = SESSION_MAX_AGE) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
