import { prisma } from "../../database/prisma.js";
import { paytm } from "../../integrations/paytm/mock.js";
import type { CustomerRow } from "../../integrations/paytm/adapter.js";

export interface SegmentDescriptor {
  name: string;
  description: string;
  criteria: Record<string, unknown>;
  customers: CustomerRow[];
}

export async function buildSegments(merchantId: string): Promise<Array<{ name: string; description: string; criteria: Record<string, unknown>; count: number; customers: CustomerRow[] }>> {
  const customers = await paytm.listCustomers(merchantId);
  const now = Date.now();
  const DAY = 86400000;

  const active = customers.filter((c) => c.lastPurchaseAt && now - c.lastPurchaseAt.getTime() <= 30 * DAY);
  const dormant = customers.filter((c) => c.lastPurchaseAt && now - c.lastPurchaseAt.getTime() > 30 * DAY && now - c.lastPurchaseAt.getTime() <= 90 * DAY);
  const lost = customers.filter((c) => c.lastPurchaseAt && now - c.lastPurchaseAt.getTime() > 90 * DAY);
  const frequent = customers.filter((c) => c.orderCount >= 4);
  const highValueThreshold = [...customers].sort((a, b) => b.totalSpend - a.totalSpend)[Math.floor(customers.length * 0.2)]?.totalSpend ?? 0;
  const highValue = customers.filter((c) => c.totalSpend >= highValueThreshold && c.totalSpend > 0);

  const inactive60 = customers.filter((c) => !c.lastPurchaseAt || now - (c.lastPurchaseAt?.getTime() ?? 0) > 60 * DAY);

  const mk = (name: string, description: string, criteria: Record<string, unknown>, list: CustomerRow[]) => ({
    name,
    description,
    criteria,
    count: list.length,
    customers: list,
  });

  return [
    mk("Active (30 days)", "Customers who bought in the last 30 days.", { inactiveDaysMax: 30 }, active),
    mk("Dormant (31-90 days)", "Customers who have not bought in 31 to 90 days.", { inactiveDaysMin: 31, inactiveDaysMax: 90 }, dormant),
    mk("Inactive 60+ days", "Customers with no purchase in the last 60 days.", { inactiveDaysMin: 60 }, inactive60),
    mk("Lost (90+ days)", "Customers with no purchase in the last 90 days.", { inactiveDaysMin: 90 }, lost),
    mk("Frequent buyers", "Customers with 4 or more orders.", { minOrders: 4 }, frequent),
    mk("High value (top 20%)", "Top 20% of customers by lifetime spend.", { topPercent: 20 }, highValue),
  ];
}

export async function segmentByName(merchantId: string, name: string): Promise<{ count: number; customers: CustomerRow[]; description: string; criteria: Record<string, unknown> } | null> {
  const segs = await buildSegments(merchantId);
  const found = segs.find((s) => s.name.toLowerCase() === name.toLowerCase());
  if (!found) return null;
  return { count: found.count, customers: found.customers, description: found.description, criteria: found.criteria };
}

export async function persistSegment(merchantId: string, name: string, description: string, criteria: Record<string, unknown>, customers: CustomerRow[]): Promise<string> {
  const seg = await prisma.customerSegment.create({
    data: {
      merchantId,
      name,
      description,
      criteria: criteria as object,
      customerCount: customers.length,
    },
  });
  return seg.id;
}
