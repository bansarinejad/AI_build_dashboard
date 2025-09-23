import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type ProductRow = { id: string; name: string; externalId: number | null };

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

  let products: ProductRow[];

  if (qRaw) {
    const searchValue = `%${qRaw.toLowerCase()}%`;
    products = await prisma.$queryRaw<ProductRow[]>`
      SELECT id, name, externalId
      FROM Product
      WHERE lower(name) LIKE ${searchValue}
      ORDER BY name ASC
      LIMIT ${limit}
    `;
  } else {
    products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
      take: limit,
      select: { id: true, name: true, externalId: true },
    });
  }

  return NextResponse.json({ products });
}
