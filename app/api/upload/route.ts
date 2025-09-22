import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { verifyJwt } from '@/lib/auth';
import { parseWorkbook } from '@/lib/parser';

export const runtime = 'nodejs';

async function requireAuth() {
  const token = cookies().get('session')?.value;
  if (!token) return null;
  const payload = await verifyJwt(token);
  if (!payload?.sub || !payload?.jti) return null;
  const session = await prisma.session.findUnique({ where: { jwtId: payload.jti } });
  if (!session || session.expiresAt < new Date()) return null;
  return { userId: payload.sub };
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 });

  const filename = file.name || 'upload.xlsx';
  const buf = Buffer.from(await file.arrayBuffer());

  const { rows, days, warnings, errors } = parseWorkbook(buf);
  if (errors.length) {
    return NextResponse.json({ error: 'Validation failed', errors, warnings }, { status: 400 });
  }
  if (!rows.length) {
    return NextResponse.json({ error: 'No valid rows found', warnings }, { status: 400 });
  }

  const batch = await prisma.uploadBatch.create({
    data: { filename, uploadedBy: auth.userId },
  });

  let createdProducts = 0, createdTx = 0;
  const negativeInventory: Array<{ productId: string; name: string; day: number; inventory: number }> = [];

  await prisma.$transaction(async (tx) => {
    for (const r of rows) {
      // Find or create product
      let product = null as any;
      if (r.externalId != null) {
        product = await tx.product.findFirst({ where: { externalId: r.externalId, name: r.name } });
      }
      if (!product) {
        product = await tx.product.findFirst({ where: { name: r.name } });
      }

      if (!product) {
        product = await tx.product.create({
          data: {
            externalId: r.externalId ?? undefined,
            name: r.name,
            openingStock: r.openingStock,
            batchId: batch.id,
          },
        });
        createdProducts++;
      } else {
        await tx.product.update({
          where: { id: product.id },
          data: { openingStock: r.openingStock, batchId: batch.id },
        });
      }

      // Replace transactions for a fresh import
      await tx.transaction.deleteMany({ where: { productId: product.id } });

      // Insert day transactions
      for (const d of r.days) {
        const m = r.metricsByDay[d];
        if (m.pq > 0 || m.pp > 0) {
          await tx.transaction.create({
            data: { productId: product.id, dayIndex: d, type: 'PROCUREMENT', qty: m.pq, unitPrice: m.pp },
          });
          createdTx++;
        }
        if (m.sq > 0 || m.sp > 0) {
          await tx.transaction.create({
            data: { productId: product.id, dayIndex: d, type: 'SALE', qty: m.sq, unitPrice: m.sp },
          });
          createdTx++;
        }
      }

      // Negative inventory scan with details
      let inv = r.openingStock;
      for (const d of r.days) {
        const m = r.metricsByDay[d];
        inv = inv + (m.pq || 0) - (m.sq || 0);
        if (inv < 0) {
          negativeInventory.push({ productId: product.id, name: product.name, day: d, inventory: inv });
          break;
        }
      }
    }
  });

  return NextResponse.json({
    ok: true,
    batchId: batch.id,
    days,
    warnings,
    dataQuality: { negativeInventory },
    summary: { createdProducts, createdTx, negativeInventoryCount: negativeInventory.length },
  });
}
