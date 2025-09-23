import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function parseLimit(value: string | null): number {
  const fallback = 50;
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 200);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const qRaw = searchParams.get('q')?.trim() ?? '';
  const limit = parseLimit(searchParams.get('limit'));

  const products = await prisma.product.findMany({
    where: qRaw ? { name: { contains: qRaw, mode: 'insensitive' } } : undefined,
    orderBy: { name: 'asc' },
    take: limit,
    select: { id: true, name: true, externalId: true },
  });

  return NextResponse.json({ products });
}
