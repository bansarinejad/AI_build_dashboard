import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { buildSeries } from '@/lib/series';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { transactions: { orderBy: { dayIndex: 'asc' } } },
  });
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const points = buildSeries(
    product.openingStock,
    product.transactions.map(t => ({ dayIndex: t.dayIndex, type: t.type as any, qty: t.qty, unitPrice: t.unitPrice }))
  );

  return NextResponse.json({ product: { id: product.id, name: product.name }, points });
}
