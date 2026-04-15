import React from 'react';

interface DataTableProps {
  headers: { key: string; label: string; align?: 'left' | 'right' | 'center' }[];
  rows: Record<string, unknown>[];
  maxHeight?: number;
  inlineBars?: { column: string; color: string; maxValue?: number }[];
}

export const DataTable: React.FC<DataTableProps> = ({ headers, rows, maxHeight, inlineBars = [] }) => {
  // Compute max values for inline bars
  const barMaxes: Record<string, number> = {};
  for (const bar of inlineBars) {
    const vals = rows.map((r) => {
      const v = r[bar.column];
      return typeof v === 'number' ? v : 0;
    });
    barMaxes[bar.column] = bar.maxValue ?? Math.max(...vals, 1);
  }

  return (
    <div style={{ maxHeight: maxHeight ? `${maxHeight}px` : undefined, overflowY: maxHeight ? 'auto' : undefined }}>
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h.key} style={{ textAlign: h.align || 'left' }}>{h.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {headers.map((h) => {
                const val = row[h.key];
                const barDef = inlineBars.find((b) => b.column === h.key);
                const displayVal = val === null || val === undefined ? '—' : String(val);

                if (barDef && typeof val === 'number') {
                  const pct = Math.min((val / barMaxes[h.key]) * 100, 100);
                  return (
                    <td key={h.key} className={h.align === 'right' ? 'num' : ''}>
                      <div className="inline-bar-container">
                        <div
                          className="inline-bar"
                          style={{ width: `${pct}%`, background: barDef.color, maxWidth: '80px' }}
                        />
                        <span>{formatNumber(val)}</span>
                      </div>
                    </td>
                  );
                }

                return (
                  <td key={h.key} className={h.align === 'right' ? 'num' : ''}>
                    {typeof val === 'number' ? formatNumber(val) : displayVal}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString('es-CO');
  return n.toLocaleString('es-CO', { maximumFractionDigits: 2 });
}
