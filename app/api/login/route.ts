import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyPassword, signJwt } from '@/lib/auth';

const LoginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const { identifier, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.transaction.deleteMany(),
    prisma.product.deleteMany(),
    prisma.uploadBatch.deleteMany(),
  ]);

  const session = await prisma.session.create({
    data: { userId: user.id, jwtId: crypto.randomUUID(), expiresAt },
  });

  const token = await signJwt({ sub: user.id, jti: session.jwtId });

  const jar = await cookies();
  jar.set('session', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });

  return NextResponse.json({ user: { id: user.id, email: user.email, username: user.username } });
}
