"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/apiClient";

type SnapshotRow = {
  symbol: string;
  ltp: number;
  day_change_pct: number;
  volume_ratio: number;
  vwap_distance_pct: number;
  trend_strength: number;
  breadth_support: number;
  retest_quality: number;
  liquidity_sweep_score: number;
  option_ce_momentum: number;
  option_pe_momentum: number;
  iv_rank: number;
  spread_quality: number;
};

function blankRow(symbol = ""): SnapshotRow {
  return {
    symbol,
    ltp: 0,
    day_change_pct: 0,
    volume_ratio: 1,
    vwap_distance_pct: 0,
    trend_strength: 0,
    breadth_support: 0,
    retest_quality: 0,
    liquidity_sweep_score: 0,
    option_ce_momentum: 0,
    option_pe_momentum: 0,
    iv_rank: 50,
    spread_quality: 70,
  };
}

export default function QuantSnapshotUploader() {
  const [source, setSource] = useState("manual");
  const [rows, setRows] = useState<SnapshotRow[]>([
    blankRow("NIFTY"),
    blankRow("BANKNIFTY"),
    blankRow("BAJFINANCE"),
  ]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [csvText, setCsvText] = useState("");

  function updateRow<K extends keyof SnapshotRow>(
    index: number,
    key: K,
    value: SnapshotRow[K]
  ) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row
      )
    );
  }

  function addRow() {
    setRows((current) => [...current, blankRow()]);
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  function parseNumber(value: string) {
    const parsed = Number(String(value || "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function importCsvText() {
    setMessage("");
    setError("");

    const lines = csvText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      setError("Paste CSV with header and at least one data row.");
      return;
    }

    const headers = lines[0].split(",").map((item) => item.trim());
    const required = [
      "symbol",
      "ltp",
      "day_change_pct",
      "volume_ratio",
      "vwap_distance_pct",
      "trend_strength",
      "breadth_support",
      "retest_quality",
      "liquidity_sweep_score",
      "option_ce_momentum",
      "option_pe_momentum",
      "iv_rank",
      "spread_quality",
    ];

    const missing = required.filter((key) => !headers.includes(key));

    if (missing.length > 0) {
      setError(`CSV missing columns: ${missing.join(", ")}`);
      return;
    }

    const imported = lines.slice(1).map((line) => {
      const values = line.split(",").map((item) => item.trim());
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      return {
        symbol: String(row.symbol || "").toUpperCase(),
        ltp: parseNumber(row.ltp),
        day_change_pct: parseNumber(row.day_change_pct),
        volume_ratio: parseNumber(row.volume_ratio),
        vwap_distance_pct: parseNumber(row.vwap_distance_pct),
        trend_strength: parseNumber(row.trend_strength),
        breadth_support: parseNumber(row.breadth_support),
        retest_quality: parseNumber(row.retest_quality),
        liquidity_sweep_score: parseNumber(row.liquidity_sweep_score),
        option_ce_momentum: parseNumber(row.option_ce_momentum),
        option_pe_momentum: parseNumber(row.option_pe_momentum),
        iv_rank: parseNumber(row.iv_rank),
        spread_quality: parseNumber(row.spread_quality),
      };
    }).filter((row) => row.symbol);

    setRows(imported);
    setSource("csv-paste");
    setMessage(`Imported ${imported.length} rows from CSV paste. Click Save Market Snapshots next.`);
  }

  async function saveSnapshots() {
    setMessage("");
    setError("");

    const cleaned = rows.filter((row) => row.symbol.trim());

    if (cleaned.length === 0) {
      setError("Add at least one symbol before saving snapshots.");
      return;
    }

    try {
      const response = await apiFetch("/api/quant/snapshots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source,
          snapshots: cleaned,
        }),
      });

      if (!response.ok) {
        throw new Error(`Snapshot save failed: ${response.status}`);
      }

      const data = await response.json();
      setMessage(`Saved ${data.count} snapshot rows from ${data.source}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save snapshots.");
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
              Small Quant Model · Data Foundation
            </div>

            <h1 className="mt-3 text-3xl font-black text-white">
              Market Snapshot Uploader
            </h1>

            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              Save structured market snapshot rows for the quant scanner. This is manual data input
              for now. Later we connect Dhan, VWAP, breadth, and option-chain feeds automatically.
            </p>
          </div>

          <div className="rounded-3xl bg-slate-900 px-6 py-5 text-center text-slate-100">
            <div className="text-xs font-black uppercase tracking-widest">Execution</div>
            <div className="mt-2 text-3xl font-black">DATA ONLY</div>
            <div className="mt-2 text-xs">No orders</div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={saveSnapshots}
            className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300"
          >
            Save Market Snapshots
          </button>

          <button
            type="button"
            onClick={addRow}
            className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:bg-slate-900"
          >
            Add Row
          </button>

          <a
            href="/quant/scanner"
            className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
          >
            Open Scanner
          </a>
        </div>

        {message ? (
          <div className="mt-4 rounded-xl border border-emerald-800 bg-emerald-950/50 p-4 text-sm font-bold text-emerald-100">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm font-bold text-red-100">
            {error}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <label className="block text-sm font-bold text-slate-300">
          Source Label
          <input
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="manual / dhan-live / tradingview / csv"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <h2 className="text-xl font-black text-white">Paste CSV Snapshot Data</h2>

        <p className="mt-2 text-sm text-slate-400">
          Paste data from Google Sheets, TradingView export, or your own CSV table.
          Then import rows and save snapshots.
        </p>

        <textarea
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          rows={8}
          placeholder={"symbol,ltp,day_change_pct,volume_ratio,vwap_distance_pct,trend_strength,breadth_support,retest_quality,liquidity_sweep_score,option_ce_momentum,option_pe_momentum,iv_rank,spread_quality\nBAJFINANCE,7100,1.2,1.8,0.45,78,70,75,68,76,28,55,75"}
          className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={importCsvText}
            className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300"
          >
            Import CSV Rows
          </button>

          <button
            type="button"
            onClick={() => setCsvText("")}
            className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:bg-slate-900"
          >
            Clear CSV
          </button>
        </div>
      </section>

      <section className="space-y-4">
        {rows.map((row, index) => (
          <div
            key={index}
            className="rounded-3xl border border-slate-800 bg-slate-950 p-6"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-black text-white">
                Snapshot Row #{index + 1}
              </h2>

              <button
                type="button"
                onClick={() => removeRow(index)}
                className="rounded-xl border border-red-900 px-4 py-2 text-sm font-black text-red-100 hover:bg-red-950"
              >
                Remove
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {[
                ["symbol", "Symbol"],
                ["ltp", "LTP"],
                ["day_change_pct", "Day Change %"],
                ["volume_ratio", "Volume Ratio"],
                ["vwap_distance_pct", "VWAP Distance %"],
                ["trend_strength", "Trend Strength"],
                ["breadth_support", "Breadth Support"],
                ["retest_quality", "Retest Quality"],
                ["liquidity_sweep_score", "Liquidity Sweep"],
                ["option_ce_momentum", "CE Momentum"],
                ["option_pe_momentum", "PE Momentum"],
                ["iv_rank", "IV Rank"],
                ["spread_quality", "Spread Quality"],
              ].map(([key, label]) => (
                <label key={key} className="text-sm font-bold text-slate-300">
                  {label}
                  <input
                    value={String(row[key as keyof SnapshotRow])}
                    type={key === "symbol" ? "text" : "number"}
                    onChange={(event) =>
                      updateRow(
                        index,
                        key as keyof SnapshotRow,
                        key === "symbol"
                          ? (event.target.value.toUpperCase() as never)
                          : (Number(event.target.value) as never)
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
