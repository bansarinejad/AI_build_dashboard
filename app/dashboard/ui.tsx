'use client';

import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';

type Product = { id: string; name: string };
type DayPoint = { day: number; inventory: number; procurementAmount: number; salesAmount: number };

function useDebouncedValue<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

const nf0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DashboardClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 250);

  const [selected, setSelected] = useState<string[]>([]);
  const [seriesData, setSeriesData] = useState<Record<string, { name: string; points: DayPoint[] }>>({});
  const [mode, setMode] = useState<'all' | 'inventory' | 'amounts'>('all');
  const [importBanner, setImportBanner] = useState<any | null>(null);

  // Load import summary once (if we just uploaded)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('lastImport');
      if (raw) {
        const data = JSON.parse(raw);
        setImportBanner(data);
        sessionStorage.removeItem('lastImport');
      }
    } catch {}
  }, []);

  // Products list (searchable)
  useEffect(() => {
    const url = dq ? `/api/products?q=${encodeURIComponent(dq)}` : '/api/products';
    fetch(url).then(r => r.json()).then(d => setProducts(d.products));
  }, [dq]);

  // Load series for selected products
  useEffect(() => {
    const load = async () => {
      if (!selected.length) return setSeriesData({});
      const res = await fetch('/api/series/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selected }),
      });
      const data = await res.json();
      const map: Record<string, { name: string; points: DayPoint[] }> = {};
      for (const s of data.series as any[]) {
        map[s.product.id] = { name: s.product.name, points: s.points };
      }
      setSeriesData(map);
    };
    load();
  }, [selected]);

  const days = useMemo(() => {
    const first = Object.values(seriesData)[0]?.points ?? [];
    return first.map(p => p.day);
  }, [seriesData]);

  const echartsOption = useMemo(() => {
    const option: any = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any[]) => {
          const lines = [`<b>${params[0]?.axisValueLabel || ''}</b>`];
          for (const p of params) {
            lines.push(`${p.marker} ${p.seriesName}: ${nf2.format(p.data)}`);
          }
          return lines.join('<br/>');
        }
      },
      legend: { type: 'scroll' },
      xAxis: { type: 'category', boundaryGap: false, data: days.map(d => `Day ${d}`) },
      yAxis: [
        { type: 'value', name: 'Amount', axisLabel: { formatter: (v: number) => nf2.format(v) } },
        { type: 'value', name: 'Inventory', axisLabel: { formatter: (v: number) => nf0.format(v) } },
      ],
      series: [] as any[],
    };

    for (const id of selected) {
      const s = seriesData[id];
      if (!s) continue;

      if (mode === 'all' || mode === 'amounts') {
        option.series.push({
          name: `${s.name} · Procurement Amount`,
          type: 'line',
          yAxisIndex: 0,
          data: s.points.map(p => p.procurementAmount),
          smooth: true,
        });
        option.series.push({
          name: `${s.name} · Sales Amount`,
          type: 'line',
          yAxisIndex: 0,
          data: s.points.map(p => p.salesAmount),
          smooth: true,
        });
      }
      if (mode === 'all' || mode === 'inventory') {
        option.series.push({
          name: `${s.name} · Inventory`,
          type: 'line',
          yAxisIndex: 1,
          data: s.points.map(p => p.inventory),
          smooth: true,
        });
      }
    }
    return option;
  }, [days, selected, seriesData, mode]);

  function exportCsv() {
    if (!selected.length) return;
    const rows = [['Day','Product','Inventory','ProcurementAmount','SalesAmount']];
    for (const id of selected) {
      const s = seriesData[id]; if (!s) continue;
      for (const p of s.points) {
        rows.push([String(p.day), s.name, String(p.inventory), String(p.procurementAmount), String(p.salesAmount)]);
      }
    }
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'series.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <main style={{ maxWidth: 1100, margin: '2rem auto' }}>
      <h1>Dashboard</h1>

      {importBanner && (
        <div style={{ background:'#ecfdf5', border:'1px solid #a7f3d0', padding:12, borderRadius:8, margin:'8px 0' }}>
          <strong>Import successful.</strong>{' '}
          Products: <b>{importBanner.summary?.createdProducts ?? 0}</b>, tx: <b>{importBanner.summary?.createdTx ?? 0}</b>.
          {importBanner.dataQuality?.negativeInventory?.length
            ? <span style={{ marginLeft: 8, color:'#92400e' }}>
                ⚠ {importBanner.dataQuality.negativeInventory.length} product(s) had negative inventory at some day.
              </span>
            : null}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', margin: '12px 0' }}>
        <div style={{ minWidth: 340 }}>
          <label>Search products
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Type to search…" />
          </label>

          <label style={{ marginTop: 12 }}>Select products (Ctrl/Cmd+Click for multi)
            <select multiple size={8} value={selected}
                    onChange={(e) => setSelected(Array.from(e.target.selectedOptions).map(o => o.value))}
                    style={{ width:'100%' }}>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>

          <div style={{ display:'flex', gap:8, marginTop: 8 }}>
            <button onClick={() => setMode('all')} disabled={mode==='all'}>All series</button>
            <button onClick={() => setMode('inventory')} disabled={mode==='inventory'}>Inventory only</button>
            <button onClick={() => setMode('amounts')} disabled={mode==='amounts'}>Amounts only</button>
          </div>

          <div style={{ marginTop: 8 }}>
            <button onClick={exportCsv} disabled={!selected.length}>Export CSV</button>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {selected.length === 0 ? (
            <p>Select one or more products to see the chart.</p>
          ) : (
            <ReactECharts option={echartsOption} style={{ height: 520 }} />
          )}
        </div>
      </div>
    </main>
  );
}
