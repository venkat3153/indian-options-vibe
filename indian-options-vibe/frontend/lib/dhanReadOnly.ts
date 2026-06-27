export type DhanReadOnlyStatus = {
  connected: boolean;
  mode: "READ_ONLY";
  message: string;
  checkedAt: string;
};

export type DhanReadOnlyPosition = {
  symbol: string;
  productType?: string;
  quantity: number;
  averagePrice?: number;
  ltp?: number;
  pnl?: number;
};

export type DhanReadOnlyOrder = {
  orderId?: string;
  symbol: string;
  side?: string;
  status: string;
  quantity: number;
  price?: number;
  createdAt?: string;
};

export type DhanReadOnlySnapshot = {
  status: DhanReadOnlyStatus;
  positions: DhanReadOnlyPosition[];
  orders: DhanReadOnlyOrder[];
};

async function tryFetchJson<T>(paths: string[]): Promise<T | null> {
  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: "no-store" });

      if (!response.ok) continue;

      const data = await response.json();
      return data as T;
    } catch {
      continue;
    }
  }

  return null;
}

export async function loadDhanReadOnlySnapshot(): Promise<DhanReadOnlySnapshot> {
  const checkedAt = new Date().toISOString();

  const statusData = await tryFetchJson<any>([
    "/api/dhan/status",
    "/api/broker/dhan/status",
    "http://localhost:8000/dhan/status",
    "http://localhost:8000/api/dhan/status",
  ]);

  const positionsData = await tryFetchJson<any>([
    "/api/dhan/positions",
    "/api/broker/dhan/positions",
    "http://localhost:8000/dhan/positions",
    "http://localhost:8000/api/dhan/positions",
  ]);

  const ordersData = await tryFetchJson<any>([
    "/api/dhan/orders",
    "/api/broker/dhan/orders",
    "http://localhost:8000/dhan/orders",
    "http://localhost:8000/api/dhan/orders",
  ]);

  const positions =
    Array.isArray(positionsData)
      ? positionsData
      : Array.isArray(positionsData?.positions)
        ? positionsData.positions
        : [];

  const orders =
    Array.isArray(ordersData)
      ? ordersData
      : Array.isArray(ordersData?.orders)
        ? ordersData.orders
        : [];

  return {
    status: {
      connected: Boolean(statusData) || positions.length > 0 || orders.length > 0,
      mode: "READ_ONLY",
      message: statusData
        ? "Dhan read-only data source responded."
        : "No Dhan read-only endpoint responded yet. Backend route may need wiring.",
      checkedAt,
    },
    positions: positions.map((item: any) => ({
      symbol: String(item.symbol || item.tradingSymbol || item.securityId || "-"),
      productType: item.productType || item.product || item.exchangeSegment,
      quantity: Number(item.quantity || item.netQty || item.positionQty || 0),
      averagePrice: Number(item.averagePrice || item.avgPrice || item.buyAvg || 0),
      ltp: Number(item.ltp || item.lastTradedPrice || 0),
      pnl: Number(item.pnl || item.realizedProfit || item.unrealizedProfit || 0),
    })),
    orders: orders.map((item: any) => ({
      orderId: String(item.orderId || item.id || ""),
      symbol: String(item.symbol || item.tradingSymbol || item.securityId || "-"),
      side: item.side || item.transactionType || item.orderSide,
      status: String(item.status || item.orderStatus || "-"),
      quantity: Number(item.quantity || item.qty || 0),
      price: Number(item.price || item.orderPrice || 0),
      createdAt: item.createdAt || item.orderTime || item.exchangeTime,
    })),
  };
}
