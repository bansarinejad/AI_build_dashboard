'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

type Product = { id: string; name: string };
type DayPoint = { day: number; inventory: number; procurementAmount: number; salesAmount: number };

type ProductsResponse = { products: Product[] };
type CompareResponse = { series: Array<{ product: Product; points: DayPoint[] }> };
type NegativeInventoryEntry = { productId: string; name: string; day: number; inventory: number };
type ImportSummary = {
  summary?: { createdProducts?: number; createdTx?: number };
  dataQuality?: { negativeInventory?: NegativeInventoryEntry[] };
};

type SeriesItem = EChartsOption['series'] extends (infer S)[] ? S : never;
type TooltipParams = { axisValueLabel?: string; marker: string; seriesName: string; data?: number | string | null };

function useDebouncedValue<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

function isImportSummary(value: unknown): value is ImportSummary {
  if (!value || typeof value !== 'object') return false;
  const maybe = value as { summary?: unknown; dataQuality?: unknown };
  const summaryOk =
    maybe.summary === undefined || (typeof maybe.summary === 'object' && maybe.summary !== null);
  const dqOk =
    maybe.dataQuality === undefined || (typeof maybe.dataQuality === 'object' && maybe.dataQuality !== null);
  return summaryOk && dqOk;
}

const nf0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const panelStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: '20px 24px',
  boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)',
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  marginBottom: 12,
  color: '#111827',
};

export default function DashboardClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 250);

  const [selected, setSelected] = useState<string[]>([]);
  const [seriesData, setSeriesData] = useState<Record<string, { name: string; points: DayPoint[] }>>({});
  const [mode, setMode] = useState<'all' | 'inventory' | 'amounts'>('all');
  const [importBanner, setImportBanner] = useState<ImportSummary | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('lastImport');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isImportSummary(parsed)) {
        setImportBanner(parsed);
      }
    } catch {
      // ignore malformed session data
    } finally {
      sessionStorage.removeItem('lastImport');
    }
  }, []);

  useEffect(() => {
    const url = dq ? `/api/products?q=${encodeURIComponent(dq)}` : '/api/products';
    fetch(url)
      .then((res) => res.json() as Promise<ProductsResponse>)
      .then((payload) => setProducts(payload.products))
      .catch(() => setProducts([]));
  }, [dq]);

  useEffect(() => {
    const load = async () => {
      if (!selected.length) {
        setSeriesData({});
        return;
      }
      const res = await fetch('/api/series/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selected }),
      });
      const data: CompareResponse = await res.json();
      const map: Record<string, { name: string; points: DayPoint[] }> = {};
      data.series.forEach((item) => {
        map[item.product.id] = { name: item.product.name, points: item.points };
      });
      setSeriesData(map);
    };
    load().catch(() => setSeriesData({}));
  }, [selected]);

  const days = useMemo(() => {
    const first = Object.values(seriesData)[0]?.points ?? [];
    return first.map((p) => p.day);
  }, [seriesData]);

  const echartsOption = useMemo(() => {
    const series: SeriesItem[] = [];

    for (const id of selected) {
      const s = seriesData[id];
      if (!s) continue;

      if (mode === 'all' || mode === 'amounts') {
        series.push({
          name: `${s.name} - Procurement Amount`,
          type: 'line',
          yAxisIndex: 0,
          data: s.points.map((p) => p.procurementAmount),
          smooth: true,
        });
        series.push({
          name: `${s.name} - Sales Amount`,
          type: 'line',
          yAxisIndex: 0,
          data: s.points.map((p) => p.salesAmount),
          smooth: true,
        });
      }
      if (mode === 'all' || mode === 'inventory') {
        series.push({
          name: `${s.name} - Inventory`,
          type: 'line',
          yAxisIndex: 1,
          data: s.points.map((p) => p.inventory),
          smooth: true,
        });
      }
    }

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: TooltipParams[]) => {
          if (!params.length) return '';
          const lines = [`<b>${params[0]?.axisValueLabel ?? ''}</b>`];
          for (const p of params) {
            const numeric = typeof p.data === 'number' ? p.data : Number(p.data ?? 0);
            lines.push(`${p.marker} ${p.seriesName}: ${nf2.format(numeric)}`);
          }
          return lines.join('<br/>');
        },
      },
      legend: { type: 'scroll' },
      xAxis: { type: 'category', boundaryGap: false, data: days.map((d) => `Day ${d}`) },
      yAxis: [
        { type: 'value', name: 'Amount', axisLabel: { formatter: (v: number) => nf2.format(v) } },
        { type: 'value', name: 'Inventory', axisLabel: { formatter: (v: number) => nf0.format(v) } },
      ],
      series,
    };

    return option;
  }, [days, selected, seriesData, mode]);

  const renderModeButton = (label: string, value: typeof mode) => {
    const active = mode === value;
    return (
      <button
        key={value}
        onClick={() => setMode(value)}
        disabled={active}
        style={{
          borderRadius: 999,
          padding: '8px 18px',
          border: '1px solid ' + (active ? '#2563eb' : '#d1d5db'),
          background: active ? '#2563eb' : '#f9fafb',
          color: active ? '#ffffff' : '#111827',
          cursor: active ? 'default' : 'pointer',
          fontSize: 14,
          fontWeight: 600,
          transition: 'all 0.2s ease',
        }}
      >
        {label}
      </button>
    );
  };

  function exportCsv() {
    if (!selected.length) return;
    const rows = [['Day', 'Product', 'Inventory', 'ProcurementAmount', 'SalesAmount']];
    for (const id of selected) {
      const s = seriesData[id];
      if (!s) continue;
      for (const point of s.points) {
        rows.push([
          String(point.day),
          s.name,
          String(point.inventory),
          String(point.procurementAmount),
          String(point.salesAmount),
        ]);
      }
    }

    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value).replace(/"/g, '""');
            return `"${text}"`;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'series.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <main style={{ maxWidth: 1160, margin: '0 auto', padding: '2rem 2.5rem 3rem', color: '#111827' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>Dashboard</h1>

      {importBanner && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            padding: '14px 18px',
            borderRadius: 10,
            marginBottom: 20,
            color: '#065f46',
            fontSize: 15,
          }}
        >
          <strong style={{ fontWeight: 700 }}>Import successful.</strong>{' '}
          Products: <strong>{importBanner.summary?.createdProducts ?? 0}</strong>, tx:{' '}
          <strong>{importBanner.summary?.createdTx ?? 0}</strong>.
          {importBanner.dataQuality?.negativeInventory?.length ? (
            <span style={{ marginLeft: 12, color: '#b45309' }}>
              Warning: {importBanner.dataQuality.negativeInventory.length} product(s) had negative inventory at some day.
            </span>
          ) : null}
        </div>
      )}

      <section style={{ ...panelStyle, marginBottom: 24 }}>
        <div style={sectionTitleStyle}>Find and compare products</div>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Search products</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type to search..."
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Select products (Ctrl/Cmd+Click for multi)</span>
            <select
              multiple
              size={8}
              value={selected}
              onChange={(e) => setSelected(Array.from(e.target.selectedOptions).map((option) => option.value))}
              style={{
                minHeight: 220,
                borderRadius: 8,
                border: '1px solid #d1d5db',
                padding: 10,
                fontSize: 14,
                background: '#f9fafb',
              }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id} style={{ padding: '2px 0' }}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
          {renderModeButton('All series', 'all')}
          {renderModeButton('Inventory only', 'inventory')}
          {renderModeButton('Amounts only', 'amounts')}
          <button
            onClick={exportCsv}
            disabled={!selected.length}
            style={{
              borderRadius: 999,
              padding: '8px 18px',
              border: '1px solid #d1d5db',
              background: selected.length ? '#111827' : '#e5e7eb',
              color: selected.length ? '#ffffff' : '#9ca3af',
              cursor: selected.length ? 'pointer' : 'not-allowed',
              fontSize: 14,
              fontWeight: 600,
              marginLeft: 'auto',
            }}
          >
            Export CSV
          </button>
        </div>
      </section>

      <section style={{ ...panelStyle, padding: '18px 24px' }}>
        <div style={sectionTitleStyle}>Trend chart</div>
        {selected.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: 15 }}>Select one or more products to see their inventory and amount trends.</p>
        ) : (
          <div style={{ width: '100%', minHeight: 380 }}>
            <ReactECharts option={echartsOption} notMerge={true} style={{ width: '100%', height: 520 }} />
          </div>
        )}
      </section>
    </main>
  );
}







