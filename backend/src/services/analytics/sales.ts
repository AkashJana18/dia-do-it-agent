import { prisma } from "../../database/prisma.js";

export interface SalesSummary {
  revenue: number;
  orders: number;
  avgTicket: number;
  uniqueCustomers: number;
  successfulOrders: number;
  failedOrders: number;
}

export async function salesSummary(merchantId: string, from: Date, to: Date): Promise<SalesSummary> {
  const tx = await prisma.transaction.findMany({
    where: { merchantId, createdAt: { gte: from, lte: to } },
  });
  const success = tx.filter((t) => t.status === "SUCCESS");
  const revenue = success.reduce((s, t) => s + t.amount, 0);
  const unique = new Set(success.map((t) => t.customerId).filter(Boolean)).size;
  return {
    revenue,
    orders: tx.length,
    avgTicket: success.length ? Math.round(revenue / success.length) : 0,
    uniqueCustomers: unique,
    successfulOrders: success.length,
    failedOrders: tx.filter((t) => t.status === "FAILED").length,
  };
}

export async function dailySeries(merchantId: string, days: number): Promise<Array<{ date: string; revenue: number; orders: number }>> {
  const out: Array<{ date: string; revenue: number; orders: number }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const s = await salesSummary(merchantId, d, next);
    out.push({ date: d.toISOString().slice(0, 10), revenue: s.revenue, orders: s.successfulOrders });
  }
  return out;
}

export async function weekendCompare(merchantId: string): Promise<{
  lastWeekend: { revenue: number; orders: number; avgTicket: number; days: string[] };
  prevWeekend: { revenue: number; orders: number; avgTicket: number; days: string[] };
  revenueDeltaPct: number;
  ordersDeltaPct: number;
  avgTicketDeltaPct: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // last completed weekend: most recent Sat+Sun strictly before today
  function weekendOf(offsetWeeks: number): { sat: Date; sun: Date } {
    const d = new Date(today);
    // find this week's sunday
    const day = d.getDay(); // 0 sun..6 sat
    const daysToSunday = day; // days back to sunday
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - daysToSunday - offsetWeeks * 7);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() - 1);
    return { sat: saturday, sun: sunday };
  }
  const last = weekendOf(0);
  // if today is weekend, "last completed" is previous weekend
  const completedLast = today.getDay() === 0 || today.getDay() === 6 ? weekendOf(1) : weekendOf(0);
  const completedPrev = today.getDay() === 0 || today.getDay() === 6 ? weekendOf(2) : weekendOf(1);

  async function agg(w: { sat: Date; sun: Date }) {
    const from = new Date(w.sat);
    from.setHours(0, 0, 0, 0);
    const to = new Date(w.sun);
    to.setHours(23, 59, 59, 999);
    const s = await salesSummary(merchantId, from, to);
    return { revenue: s.revenue, orders: s.successfulOrders, avgTicket: s.avgTicket, days: [w.sat.toISOString().slice(0, 10), w.sun.toISOString().slice(0, 10)] };
  }

  const lastAgg = await agg(completedLast);
  const prevAgg = await agg(completedPrev);
  const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round(((a - b) / b) * 1000) / 10);
  return {
    lastWeekend: lastAgg,
    prevWeekend: prevAgg,
    revenueDeltaPct: pct(lastAgg.revenue, prevAgg.revenue),
    ordersDeltaPct: pct(lastAgg.orders, prevAgg.orders),
    avgTicketDeltaPct: pct(lastAgg.avgTicket, prevAgg.avgTicket),
  };
}

export async function topProducts(merchantId: string, from: Date, to: Date, limit = 5): Promise<Array<{ productId: string; name: string; revenue: number; units: number }>> {
  const tx = await prisma.transaction.findMany({
    where: { merchantId, status: "SUCCESS", createdAt: { gte: from, lte: to }, productId: { not: null } },
    include: { product: true },
  });
  const map = new Map<string, { name: string; revenue: number; units: number }>();
  for (const t of tx) {
    if (!t.productId || !t.product) continue;
    const e = map.get(t.productId) ?? { name: t.product.name, revenue: 0, units: 0 };
    e.revenue += t.amount;
    e.units += t.quantity;
    map.set(t.productId, e);
  }
  return Array.from(map.entries())
    .map(([productId, v]) => ({ productId, name: v.name, revenue: v.revenue, units: v.units }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function yesterdayVsTrailing(merchantId: string): Promise<{
  yesterday: SalesSummary;
  trailing7AvgRevenue: number;
  trailing7AvgOrders: number;
  revenueDeltaPct: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yFrom = new Date(today);
  yFrom.setDate(yFrom.getDate() - 1);
  const yTo = new Date(today);
  yTo.setMilliseconds(-1);
  const yesterday = await salesSummary(merchantId, yFrom, yTo);

  // trailing 7 days before yesterday
  const tFrom = new Date(yFrom);
  tFrom.setDate(tFrom.getDate() - 7);
  const trailing = await salesSummary(merchantId, tFrom, yFrom);
  const trailing7AvgRevenue = Math.round(trailing.revenue / 7);
  const trailing7AvgOrders = Math.round(trailing.successfulOrders / 7);
  const revenueDeltaPct = trailing7AvgRevenue === 0 ? 0 : Math.round(((yesterday.revenue - trailing7AvgRevenue) / trailing7AvgRevenue) * 1000) / 10;
  return { yesterday, trailing7AvgRevenue, trailing7AvgOrders, revenueDeltaPct };
}
