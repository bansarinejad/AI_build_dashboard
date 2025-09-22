import * as XLSX from 'xlsx';

export type ParsedRow = {
  externalId?: number | null;
  name: string;
  openingStock: number;
  days: number[];
  // day -> {pq, pp, sq, sp}
  metricsByDay: Record<number, { pq: number; pp: number; sq: number; sp: number }>;
};

export type ParseResult = {
  rows: ParsedRow[];
  days: number[];
  warnings: string[];
  errors: string[];
};

const rePQ = /^Procurement Qty \(Day (\d+)\)$/i;
const rePP = /^Procurement Price \(Day (\d+)\)$/i;
const reSQ = /^Sales Qty \(Day (\d+)\)$/i;
const reSP = /^Sales Price \(Day (\d+)\)$/i;

export function parseWorkbook(buf: Buffer): ParseResult {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null });

  const warnings: string[] = [];
  const errors: string[] = [];

  if (!json.length) {
    return { rows: [], days: [], warnings: [], errors: ['Empty sheet'] };
  }

  const headers = Object.keys(json[0] ?? {});
  const required = ['ID', 'Product Name', 'Opening Inventory'];
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length) {
    errors.push(`Missing required columns: ${missing.join(', ')}`);
  }

  // Detect all day indices from headers
  const daySet = new Set<number>();
  headers.forEach((h) => {
    let m = h.match(rePQ) || h.match(rePP) || h.match(reSQ) || h.match(reSP);
    if (m) daySet.add(Number(m[1]));
  });
  const days = Array.from(daySet).sort((a, b) => a - b);

  // Validate paired headers per day
  for (const d of days) {
    const hasPQ = headers.includes(`Procurement Qty (Day ${d})`);
    const hasPP = headers.includes(`Procurement Price (Day ${d})`);
    const hasSQ = headers.includes(`Sales Qty (Day ${d})`);
    const hasSP = headers.includes(`Sales Price (Day ${d})`);
    if (hasPQ && !hasPP) warnings.push(`Day ${d}: found Procurement Qty but missing Procurement Price`);
    if (!hasPQ && hasPP) warnings.push(`Day ${d}: found Procurement Price but missing Procurement Qty`);
    if (hasSQ && !hasSP) warnings.push(`Day ${d}: found Sales Qty but missing Sales Price`);
    if (!hasSQ && hasSP) warnings.push(`Day ${d}: found Sales Price but missing Sales Qty`);
  }

  if (!days.length) {
    warnings.push('No Day N columns detected (e.g., "Procurement Qty (Day 1)").');
  }

  const rows: ParsedRow[] = [];

  for (const r of json) {
    const nameRaw = r['Product Name'];
    const name = (nameRaw == null ? '' : String(nameRaw)).trim();
    if (!name) {
      warnings.push('Skipped a row with empty Product Name');
      continue;
    }
    const externalId = numOrNull(r['ID']);
    const openingStock = Math.trunc(Number(r['Opening Inventory'] ?? 0) || 0);

    const metricsByDay: ParsedRow['metricsByDay'] = {};
    for (const d of days) {
      const pq = numOrZero(r[`Procurement Qty (Day ${d})`]);
      const pp = numOrZero(r[`Procurement Price (Day ${d})`]);
      const sq = numOrZero(r[`Sales Qty (Day ${d})`]);
      const sp = numOrZero(r[`Sales Price (Day ${d})`]);

      // Soft data-quality warnings
      if (pq > 0 && pp === 0) {
        warnings.push(`${name}: Day ${d} procurement qty > 0 but price = 0`);
      }
      if (sq > 0 && sp === 0) {
        warnings.push(`${name}: Day ${d} sales qty > 0 but price = 0`);
      }

      metricsByDay[d] = { pq, pp, sq, sp };
    }

    rows.push({ externalId, name, openingStock, days, metricsByDay });
  }

  return { rows, days, warnings, errors };
}

function numOrZero(v: any): number { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function numOrNull(v: any): number | null { const n = Number(v); return Number.isFinite(n) ? n : null; }
