import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { verifyJwt } from '@/lib/auth';

export async function GET() {
  const token = cookies().get('session')?.value;
  if (!token) return NextResponse.json({ user: null }, { status: 200 });

  const payload = await verifyJwt(token);
  if (!payload?.sub || !payload?.jti) return NextResponse.json({ user: null }, { status: 200 });

  const session = await prisma.session.findUnique({ where: { jwtId: payload.jti } });
  if (!session || session.expiresAt < new Date()) return NextResponse.json({ user: null }, { status: 200 });

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, username: true }});
  return NextResponse.json({ user }, { status: 200 });
}
