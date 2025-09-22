import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { buildSeries } from '@/lib/series';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.productIds) ? body.productIds : [];
  if (!ids.length) return NextResponse.json({ error: 'productIds required' }, { status: 400 });

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: { transactions: { orderBy: { dayIndex: 'asc' } } },
  });

  const result = products.map(p => ({
    product: { id: p.id, name: p.name },
    points: buildSeries(
      p.openingStock,
      p.transactions.map(t => ({ dayIndex: t.dayIndex, type: t.type as any, qty: t.qty, unitPrice: t.unitPrice }))
    ),
  }));

  return NextResponse.json({ series: result });
}
