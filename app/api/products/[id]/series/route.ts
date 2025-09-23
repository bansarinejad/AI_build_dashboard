import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { buildSeries, type DayPoint, type SeriesTransaction } from '@/lib/series';

type RouteParams = { id: string };

type ProductResponse = {
  product: { id: string; name: string };
  points: DayPoint[];
};

type TransactionsRow = {
  dayIndex: number;
  type: string;
  qty: number;
  unitPrice: number;
};

function toSeriesTransactions(transactions: TransactionsRow[]): SeriesTransaction[] {
  return transactions.map((t) => ({
    dayIndex: t.dayIndex,
    type: t.type === 'PROCUREMENT' ? 'PROCUREMENT' : 'SALE',
    qty: t.qty,
    unitPrice: t.unitPrice,
  }));
}

export async function GET(_req: NextRequest, context: { params: Promise<RouteParams> }) {
  const { id } = await context.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { transactions: { orderBy: { dayIndex: 'asc' } } },
  });

  if (!product) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const points = buildSeries(product.openingStock, toSeriesTransactions(product.transactions));

  const payload: ProductResponse = {
    product: { id: product.id, name: product.name },
    points,
  };

  return NextResponse.json(payload);
}
