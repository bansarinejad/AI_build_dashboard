import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { buildSeries, type DayPoint, type SeriesTransaction } from '@/lib/series';

type CompareResponseItem = {
  product: { id: string; name: string };
  points: DayPoint[];
};

function toSeriesTransactions(
  transactions: Array<{ dayIndex: number; type: string; qty: number; unitPrice: number }>
): SeriesTransaction[] {
  return transactions.map((t) => ({
    dayIndex: t.dayIndex,
    type: t.type === 'PROCUREMENT' ? 'PROCUREMENT' : 'SALE',
    qty: t.qty,
    unitPrice: t.unitPrice,
  }));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.productIds) ? body.productIds : [];
  if (!ids.length) return NextResponse.json({ error: 'productIds required' }, { status: 400 });

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: { transactions: { orderBy: { dayIndex: 'asc' } } },
  });

  const result: CompareResponseItem[] = products.map((p) => ({
    product: { id: p.id, name: p.name },
    points: buildSeries(p.openingStock, toSeriesTransactions(p.transactions)),
  }));

  return NextResponse.json({ series: result });
}
