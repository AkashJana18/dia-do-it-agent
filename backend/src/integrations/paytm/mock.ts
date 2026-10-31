import { prisma } from "../../database/prisma.js";
import type {
  PaytmMerchantAdapter,
  MerchantProfile,
  TransactionQuery,
  TransactionRow,
  CustomerRow,
  ProductRow,
  CampaignSendInput,
  CampaignSendResult,
} from "./adapter.js";

function seededRng(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  let s = h || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class MockPaytmAdapter implements PaytmMerchantAdapter {
  async getMerchantProfile(merchantId: string): Promise<MerchantProfile> {
    const m = await prisma.merchant.findUniqueOrThrow({ where: { id: merchantId } });
    return {
      merchantId: m.id,
      businessName: m.name,
      city: m.city,
      currency: m.currency,
    };
  }

  async listTransactions(merchantId: string, opts: TransactionQuery): Promise<TransactionRow[]> {
    const rows = await prisma.transaction.findMany({
      where: {
        merchantId,
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.from || opts.to
          ? {
              createdAt: {
                ...(opts.from ? { gte: opts.from } : {}),
                ...(opts.to ? { lte: opts.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: "asc" },
      ...(opts.limit ? { take: opts.limit } : {}),
    });
    return rows.map((r) => ({
      id: r.id,
      customerId: r.customerId,
      productId: r.productId,
      quantity: r.quantity,
      amount: r.amount,
      status: r.status,
      paymentMethod: r.paymentMethod,
      createdAt: r.createdAt,
    }));
  }

  async listCustomers(merchantId: string): Promise<CustomerRow[]> {
    const rows = await prisma.customer.findMany({ where: { merchantId } });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      language: r.language,
      firstPurchaseAt: r.firstPurchaseAt,
      lastPurchaseAt: r.lastPurchaseAt,
      totalSpend: r.totalSpend,
      orderCount: r.orderCount,
    }));
  }

  async listProducts(merchantId: string): Promise<ProductRow[]> {
    const rows = await prisma.product.findMany({ where: { merchantId, active: true } });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      price: r.price,
      costPrice: r.costPrice,
      active: r.active,
    }));
  }

  async sendCampaign(input: CampaignSendInput): Promise<CampaignSendResult> {
    const rng = seededRng(input.campaignId);
    const audience = input.audience;
    const n = audience.length;
    const sent = n;
    const delivered = Math.max(0, Math.round(n * (0.92 + rng() * 0.06)));
    const opened = Math.max(0, Math.round(delivered * (0.45 + rng() * 0.25)));
    // redemption uplift depends on offer generosity; keep conservative
    const redeemed = Math.max(0, Math.round(opened * (0.12 + rng() * 0.18)));
    const avgSpend = audience.reduce((s, c) => s + (c.totalSpend || 0), 0) / Math.max(1, n);
    const revenueAttributed = Math.round(redeemed * Math.max(400, avgSpend * 0.35));

    const events: CampaignSendResult["events"] = [];
    const now = new Date();
    for (const c of audience) {
      events.push({ customerId: c.id, type: "SENT", at: new Date(now.getTime() + rng() * 60_000) });
    }
    // delivered subset
    const deliveredSet = audience.slice(0, delivered);
    for (const c of deliveredSet) {
      events.push({ customerId: c.id, type: "DELIVERED", at: new Date(now.getTime() + 60_000 + rng() * 120_000) });
    }
    const openedSet = audience.slice(0, opened);
    for (const c of openedSet) {
      events.push({ customerId: c.id, type: "OPENED", at: new Date(now.getTime() + 180_000 + rng() * 300_000) });
    }
    const redeemedSet = audience.slice(0, redeemed);
    for (const c of redeemedSet) {
      events.push({ customerId: c.id, type: "REDEEMED", at: new Date(now.getTime() + 600_000 + rng() * 1_800_000) });
    }

    return {
      provider: "mock-paytm",
      sent,
      delivered,
      opened,
      redeemed,
      revenueAttributed,
      events,
      executedAt: now,
    };
  }
}

export const paytm = new MockPaytmAdapter();
