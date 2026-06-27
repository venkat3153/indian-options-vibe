export type DhanReadOnlySnapshot = {
  connected: boolean;
  mode: "READ_ONLY";
  message: string;
  positions: {
    symbol: string;
    qty: number;
    avgPrice?: number;
    ltp?: number;
    pnl?: number;
  }[];
  orders: {
    symbol: string;
    side?: string;
    status: string;
    qty: number;
    price?: number;
  }[];
};

async function safeFetch(path: string) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getDhanReadOnlySnapshot(): Promise<DhanReadOnlySnapshot> {
  const status = await safeFetch("http://localhost:8000/api/dhan/status");
  const positionsRaw = await safeFetch("http://localhost:8000/api/dhan/positions");
  const ordersRaw = await safeFetch("http://localhost:8000/api/dhan/orders");

  const positionsList = Array.isArray(positionsRaw)
    ? positionsRaw
    : Array.isArray(positionsRaw?.positions)
      ? positionsRaw.positions
      : [];

  const ordersList = Array.isArray(ordersRaw)
    ? ordersRaw
    : Array.isArray(ordersRaw?.orders)
      ? ordersRaw.orders
      : [];

  return {
    connected: Boolean(status || positionsRaw || ordersRaw),
    mode: "READ_ONLY",
    message: status
      ? "Dhan read-only endpoint responded."
      : "Dhan backend read-only endpoint not wired yet.",
    positions: positionsList.map((p: any) => ({
      symbol: String(p.symbol || p.tradingSymbol || p.securityId || "-"),
      qty: Number(p.quantity || p.netQty || p.qty || 0),
      avgPrice: Number(p.averagePrice || p.avgPrice || 0),
      ltp: Number(p.ltp || p.lastTradedPrice || 0),
      pnl: Number(p.pnl || p.unrealizedProfit || 0),
    })),
    orders: ordersList.map((o: any) => ({
      symbol: String(o.symbol || o.tradingSymbol || o.securityId || "-"),
      side: String(o.side || o.transactionType || "-"),
      status: String(o.status || o.orderStatus || "-"),
      qty: Number(o.quantity || o.qty || 0),
      price: Number(o.price || o.orderPrice || 0),
    })),
  };
}
