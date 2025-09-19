// lib/server-auth.ts
import { cookies } from 'next/headers';
import { prisma } from './db';
import { verifyJwt } from './auth';
import { redirect } from 'next/navigation';

export async function requireUser() {
  const token = cookies().get('session')?.value;
  if (!token) redirect(`/login?reason=unauthenticated`);

  const payload = await verifyJwt(token);
  if (!payload?.sub || !payload?.jti) redirect(`/login?reason=invalid`);

  // Validate session is still active in DB
  const session = await prisma.session.findUnique({ where: { jwtId: payload.jti } });
  if (!session || session.expiresAt < new Date()) redirect(`/login?reason=expired`);

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) redirect(`/login?reason=unknown`);

  return user;
}
