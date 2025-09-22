export type DayPoint = {
  day: number;
  inventory: number;
  procurementAmount: number;
  salesAmount: number;
};

type Tx = { dayIndex: number; type: 'PROCUREMENT' | 'SALE'; qty: number; unitPrice: number };

export function buildSeries(openingStock: number, txs: Tx[]): DayPoint[] {
  const days = Array.from(new Set(txs.map(t => t.dayIndex))).sort((a,b)=>a-b);
  const maxDay = days.length ? Math.max(...days) : 0;

  let inv = openingStock;
  const points: DayPoint[] = [];

  for (let d = 1; d <= maxDay; d++) {
    const dayTx = txs.filter(t => t.dayIndex === d);
    const procQty = dayTx.filter(t => t.type === 'PROCUREMENT').reduce((s, t) => s + t.qty, 0);
    const salesQty = dayTx.filter(t => t.type === 'SALE').reduce((s, t) => s + t.qty, 0);

    const procurementAmount = dayTx.filter(t => t.type === 'PROCUREMENT')
      .reduce((s, t) => s + t.qty * t.unitPrice, 0);
    const salesAmount = dayTx.filter(t => t.type === 'SALE')
      .reduce((s, t) => s + t.qty * t.unitPrice, 0);

    inv = inv + procQty - salesQty; // end-of-day
    points.push({ day: d, inventory: inv, procurementAmount, salesAmount });
  }
  return points;
}
