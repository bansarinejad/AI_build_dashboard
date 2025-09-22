import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const take = Number(searchParams.get('limit') ?? 50);

  const products = await prisma.product.findMany({
    where: q ? { name: { contains: q, mode: 'insensitive' } } : {},
    orderBy: { name: 'asc' },
    take,
    select: { id: true, name: true, externalId: true },
  });

  return NextResponse.json({ products });
}
