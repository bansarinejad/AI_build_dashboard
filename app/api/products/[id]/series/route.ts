import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { buildSeries } from '@/lib/series';
import type { SeriesTransaction } from '@/lib/series';

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

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { transactions: { orderBy: { dayIndex: 'asc' } } },
  });
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const points = buildSeries(product.openingStock, toSeriesTransactions(product.transactions));

  return NextResponse.json({ product: { id: product.id, name: product.name }, points });
}

