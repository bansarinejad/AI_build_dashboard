// lib/auth.ts
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';

const encoder = new TextEncoder();
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export type AppJwt = JWTPayload & { sub: string; jti: string };

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function signJwt(payload: Omit<AppJwt, 'iat' | 'exp'>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(encoder.encode(JWT_SECRET));
}

export async function verifyJwt(token: string): Promise<AppJwt | null> {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(JWT_SECRET));
    return payload as AppJwt;
  } catch {
    return null;
  }
}
