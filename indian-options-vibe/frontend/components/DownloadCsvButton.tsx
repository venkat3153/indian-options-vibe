'use client';

type CsvValue = string | number | boolean | null | undefined;
type CsvRow = Record<string, CsvValue>;

function escapeCsv(value: CsvValue) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsv(rows: CsvRow[]) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(escapeCsv).join(',');
  const body = rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(',')).join('\n');
  return `${headerLine}\n${body}`;
}

export function DownloadCsvButton({ filename, rows, disabledLabel = 'No CSV data' }: { filename: string; rows: CsvRow[]; disabledLabel?: string }) {
  function downloadCsv() {
    const csv = buildCsv(rows);
    if (!csv) return;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (!rows.length) {
    return (
      <button disabled className="rounded-xl border border-slate-800 px-4 py-3 text-sm text-slate-500 opacity-60">
        {disabledLabel}
      </button>
    );
  }

  return (
    <button onClick={downloadCsv} className="rounded-xl border border-emerald-800 px-4 py-3 text-sm text-emerald-300 hover:bg-emerald-950/30">
      Download CSV
    </button>
  );
}
