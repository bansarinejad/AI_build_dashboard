import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { verifyJwt } from '@/lib/auth';

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get('session')?.value;

  if (token) {
    const payload = await verifyJwt(token);
    if (payload?.sub) {
      await prisma.session.deleteMany({ where: { userId: payload.sub } });
    }
    if (payload?.jti) {
      await prisma.session.delete({ where: { jwtId: payload.jti } }).catch(() => {});
    }
  }

  const res = NextResponse.redirect(new URL('/login', req.url));
  res.cookies.set('session', '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}
