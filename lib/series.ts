export type DayPoint = {
  day: number;
  inventory: number;
  procurementAmount: number;
  salesAmount: number;
};

export type SeriesTransaction = {
  dayIndex: number;
  type: 'PROCUREMENT' | 'SALE';
  qty: number;
  unitPrice: number;
};

export function buildSeries(openingStock: number, txs: SeriesTransaction[]): DayPoint[] {
  const dayIndices = Array.from(new Set(txs.map((t) => t.dayIndex))).sort((a, b) => a - b);
  const maxDay = dayIndices.length ? Math.max(...dayIndices) : 0;

  let inv = openingStock;
  const points: DayPoint[] = [];

  for (let d = 1; d <= maxDay; d++) {
    const dayTx = txs.filter((t) => t.dayIndex === d);
    const procurementTx = dayTx.filter((t) => t.type === 'PROCUREMENT');
    const salesTx = dayTx.filter((t) => t.type === 'SALE');

    const procQty = procurementTx.reduce((sum, tx) => sum + tx.qty, 0);
    const salesQty = salesTx.reduce((sum, tx) => sum + tx.qty, 0);
    const procurementAmount = procurementTx.reduce((sum, tx) => sum + tx.qty * tx.unitPrice, 0);
    const salesAmount = salesTx.reduce((sum, tx) => sum + tx.qty * tx.unitPrice, 0);

    inv = inv + procQty - salesQty;
    points.push({ day: d, inventory: inv, procurementAmount, salesAmount });
  }

  return points;
}
