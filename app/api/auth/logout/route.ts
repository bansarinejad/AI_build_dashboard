import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { verifyJwt } from '@/lib/auth';

function resolveOrigin(req: Request) {
  const url = new URL(req.url);
  const originHeader = req.headers.get('origin');
  if (originHeader) return originHeader;
  const proto = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? url.host;
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get('session')?.value;

  if (token) {
    const payload = await verifyJwt(token);
    const conditions: Array<Record<string, string>> = [];
    if (payload?.sub) {
      conditions.push({ userId: payload.sub });
    }
    if (payload?.jti) {
      conditions.push({ jwtId: payload.jti });
    }
    if (conditions.length) {
      await prisma.session.deleteMany({ where: { OR: conditions } });
    }
  }

  const origin = resolveOrigin(req);
  const res = NextResponse.redirect(new URL('/login', origin));
  res.cookies.set('session', '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}
