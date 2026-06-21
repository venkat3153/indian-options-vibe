'use client';

import { useEffect, useRef, useState } from 'react';

type Breadth = { supportive?: boolean; positive?: number; negative?: number; avg_change_pct?: number };

export function MainTableFinalStatusDecorator() {
  const [breadth, setBreadth] = useState<Breadth | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadBreadth() {
      try {
        const res = await fetch('http://localhost:8000/api/market/breadth');
        const json = await res.json();
        if (!cancelled) setBreadth(json);
      } catch {
        if (!cancelled) setBreadth(null);
      }
    }
    loadBreadth();
    const t = window.setInterval(loadBreadth, 15000);
    return () => { cancelled = true; window.clearInterval(t); };
  }, []);

  useEffect(() => {
    function decorate() {
      if (typeof window === 'undefined') return;
      if (window.location.pathname !== '/stocks') return;

      const tables = Array.from(document.querySelectorAll('table'));
      const table = tables.find((t) => t.textContent?.includes('Live Strength') && t.textContent?.includes('Watchlist'));
      if (!table) return;

      const headerRow = table.querySelector('thead tr');
      if (!headerRow) return;
      if (!headerRow.querySelector('[data-final-status-header="true"]')) {
        const th = document.createElement('th');
        th.textContent = 'Final Status';
        th.setAttribute('data-final-status-header', 'true');
        th.className = 'px-3';
        const riskHeader = Array.from(headerRow.children).find((cell) => cell.textContent?.trim() === 'Risk');
        headerRow.insertBefore(th, riskHeader || null);
      }

      const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
      bodyRows.forEach((row) => {
        const tr = row as HTMLTableRowElement;
        if (tr.querySelector('[data-final-status-cell="true"]')) {
          updateCell(tr.querySelector('[data-final-status-cell="true"]') as HTMLElement, tr, breadth);
          return;
        }
        const td = document.createElement('td');
        td.setAttribute('data-final-status-cell', 'true');
        td.className = 'px-3';
        updateCell(td, tr, breadth);
        const riskCell = tr.lastElementChild;
        tr.insertBefore(td, riskCell || null);
      });
    }

    decorate();
    observerRef.current?.disconnect();
    observerRef.current = new MutationObserver(() => decorate());
    observerRef.current.observe(document.body, { childList: true, subtree: true });
    const t = window.setInterval(decorate, 3000);
    return () => { observerRef.current?.disconnect(); window.clearInterval(t); };
  }, [breadth]);

  return null;
}

function updateCell(cell: HTMLElement, row: HTMLTableRowElement, breadth: Breadth | null) {
  const text = row.textContent || '';
  const weakBreadth = breadth && breadth.supportive === false;
  const label = !breadth
    ? 'Checking'
    : weakBreadth
      ? 'Wait: Breadth Weak'
      : text.includes('Extended / Avoid')
        ? 'Wait: Extended'
        : text.includes('Weak Live')
          ? 'Avoid: Weak Live'
          : text.includes('Live Watch')
            ? 'Ready to Watch'
            : 'Wait';

  const tone = label.startsWith('Ready')
    ? 'border-emerald-700 bg-emerald-500/10 text-emerald-300'
    : label.startsWith('Avoid')
      ? 'border-red-700 bg-red-500/10 text-red-300'
      : label === 'Checking'
        ? 'border-slate-700 bg-slate-800 text-slate-300'
        : 'border-yellow-700 bg-yellow-500/10 text-yellow-300';

  const title = breadth
    ? `Breadth: ${breadth.positive ?? '-'} positive, ${breadth.negative ?? '-'} negative, avg ${breadth.avg_change_pct ?? '-'}%`
    : 'Checking market breadth';

  cell.innerHTML = `<span title="${escapeHtml(title)}" class="whitespace-nowrap rounded-full border px-2 py-1 text-xs ${tone}">${escapeHtml(label)}</span>`;
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
