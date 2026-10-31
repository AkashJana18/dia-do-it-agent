import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
function loadEnv(p: string) {
  try {
    for (const line of readFileSync(p, "utf8").split(/\\r?\\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 0) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (process.env[k] === undefined) process.env[k] = v;
    }
  } catch {}
}
loadEnv(resolve(ROOT, ".env"));

const prisma = new PrismaClient();

// --- deterministic PRNG -----------------------------------------------------
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20250717);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}
function addMinutes(d: Date, m: number): Date {
  return new Date(d.getTime() + m * 60_000);
}

// --- static data ------------------------------------------------------------
const FIRST_NAMES = [
  "Rahul", "Priya", "Amit", "Neha", "Vikram", "Pooja", "Rohan", "Anjali",
  "Sanjay", "Meera", "Arjun", "Kavita", "Manish", "Sunita", "Deepak", "Ritu",
  "Karan", "Shweta", "Nikhil", "Divya", "Rajesh", "Anita", "Suresh", "Preeti",
  "Gaurav", "Nisha", "Abhishek", "Swati", "Mohit", "Payal", "Vivek", "Rekha",
];
const LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Singh", "Patel", "Jain", "Mehta", "Agarwal",
  "Kapoor", "Malhotra", "Chopra", "Bansal", "Tiwari", "Yadav", "Joshi",
  "Kulkarni", "Deshmukh", "Iyer", "Nair", "Reddy",
];

const PRODUCTS = [
  { name: "LED TV 55\" 4K Smart", category: "TV", price: 46999, cost: 42585 },
  { name: "LED TV 43\" Full HD Smart", category: "TV", price: 26499, cost: 24155 },
  { name: "Air Conditioner 1.5T Inverter", category: "Cooling", price: 41999, cost: 38719 },
  { name: "Refrigerator 253L Double Door", category: "Appliances", price: 28990, cost: 26671 },
  { name: "Washing Machine 7kg Front Load", category: "Appliances", price: 32990, cost: 30191 },
  { name: "Microwave 25L Convection", category: "Kitchen", price: 13490, cost: 12141 },
  { name: "Soundbar 260W Bluetooth", category: "Audio", price: 8999, cost: 7648 },
  { name: "Ceiling Fan 1200mm BLDC", category: "Cooling", price: 3499, cost: 2659 },
  { name: "Mixer Grinder 750W", category: "Kitchen", price: 3290, cost: 2533 },
  { name: "Rice Cooker 1.8L", category: "Kitchen", price: 2190, cost: 1708 },
  { name: "Water Purifier RO+UV", category: "Appliances", price: 11990, cost: 10171 },
  { name: "Steam Iron 1600W", category: "Home", price: 1799, cost: 1398 },
];

const LANGS = ["hi-IN", "en-IN", "mr-IN", "hi-IN", "hi-IN", "en-IN"];

async function main() {
  // wipe
  await prisma.campaignEvent.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.customerSegment.deleteMany();
  await prisma.toolRun.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.agentAction.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.merchantPreference.deleteMany();
  await prisma.merchant.deleteMany();

  const merchant = await prisma.merchant.create({
    data: {
      name: "Sharma Electronics",
      businessType: "Electronics retail",
      city: "Mumbai",
      currency: "INR",
      phone: "+91 98200 11223",
    },
  });

  await prisma.merchantPreference.create({
    data: {
      merchantId: merchant.id,
      languageCode: "hi-IN",
      ttsVoice: "shubh",
      theme: "dark",
      autoPlayTts: true,
    },
  });

  const products = await Promise.all(
    PRODUCTS.map((p) =>
      prisma.product.create({
        data: {
          merchantId: merchant.id,
          name: p.name,
          category: p.category,
          price: p.price,
          costPrice: p.cost,
          active: true,
        },
      }),
    ),
  );

  // customers
  const customerCount = 112;
  const customers: { id: string; profile: "active" | "dormant" | "lost"; ticket: "low" | "mid" | "high" }[] = [];
  for (let i = 0; i < customerCount; i++) {
    const profile: "active" | "dormant" | "lost" =
      i < 62 ? "active" : i < 92 ? "dormant" : "lost";
    const ticket: "low" | "mid" | "high" =
      rng() < 0.55 ? "low" : rng() < 0.85 ? "mid" : "high";
    const c = await prisma.customer.create({
      data: {
        merchantId: merchant.id,
        name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
        phone: `+91 9${randInt(1000, 9999)} ${randInt(10000, 99999)}`,
        language: pick(LANGS),
      },
    });
    customers.push({ id: c.id, profile, ticket });
  }

  // transaction generation
  const isWeekend = (d: Date) => {
    const day = d.getDay();
    return day === 0 || day === 6;
  };

  // last two completed weekends are "weak" (decline story)
  const weakWeekendDays = new Set<number>(); // day offsets
  // find last Saturday/Sunday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let off = 1; off <= 14; off++) {
    const d = new Date(today);
    d.setDate(d.getDate() - off);
    if (isWeekend(d)) weakWeekendDays.add(off);
  }

  const productWeight = (p: { category: string }) => {
    // base weights
    const w: Record<string, number> = {
      TV: 3, Cooling: 5, Appliances: 4, Kitchen: 6, Audio: 3, Home: 8,
    };
    return w[p.category] ?? 4;
  };
  const weightedProduct = () => {
    const total = products.reduce((s, p) => s + productWeight(p), 0);
    let r = rng() * total;
    for (const p of products) {
      r -= productWeight(p);
      if (r <= 0) return p;
    }
    return products[products.length - 1];
  };

  const activeCustomers = customers.filter((c) => c.profile === "active");
  const dormantCustomers = customers.filter((c) => c.profile === "dormant");
  const lostCustomers = customers.filter((c) => c.profile === "lost");

  const pickCustomer = (dayOffset: number): (typeof customers)[number] => {
    // active buy most; dormant buy rarely; lost almost never
    const r = rng();
    let pool: typeof customers;
    if (r < 0.78) pool = activeCustomers;
    else if (r < 0.92) pool = dormantCustomers;
    else pool = lostCustomers;
    // ticket bias: high-ticket customers buy big items more
    return pick(pool);
  };

  const customerAgg = new Map<string, { spend: number; orders: number; first: Date | null; last: Date | null }>();
  for (const c of customers) customerAgg.set(c.id, { spend: 0, orders: 0, first: null, last: null });

  const DAY_COUNT = 90;
  for (let off = DAY_COUNT; off >= 0; off--) {
    const dayDate = daysAgo(off);
    const weekend = isWeekend(dayDate);
    const weak = weekend && weakWeekendDays.has(off);
    const yesterday = off === 1;

    let nTx = weekend
      ? weak
        ? randInt(5, 9)
        : randInt(14, 26)
      : randInt(6, 14);

    if (off === 0) nTx = randInt(3, 7);
    // yesterday: slightly fewer, and discourage high-ticket
    if (yesterday) nTx = randInt(7, 11);

    for (let t = 0; t < nTx; t++) {
      const cust = pickCustomer(off);
      const prod = weightedProduct();
      // yesterday: skip very high ticket products sometimes
      let finalProd = prod;
      if (yesterday && prod.price > 25000 && rng() < 0.7) {
        // pick a cheaper product
        finalProd = products.find((p) => p.price < 12000) ?? prod;
      }
      const qty = rng() < 0.12 ? 2 : 1;
      const amount = finalProd.price * qty;
      const statusRoll = rng();
      const status = statusRoll < 0.92 ? "SUCCESS" : statusRoll < 0.97 ? "FAILED" : "PENDING";
      const pmRoll = rng();
      const paymentMethod = pmRoll < 0.7 ? "UPI" : pmRoll < 0.9 ? "CASH" : "CARD";

      const createdAt = addMinutes(dayDate, randInt(10 * 60, 21 * 60));

      await prisma.transaction.create({
        data: {
          merchantId: merchant.id,
          customerId: cust.id,
          productId: finalProd.id,
          quantity: qty,
          amount,
          status,
          paymentMethod,
          createdAt,
        },
      });

      if (status === "SUCCESS") {
        const agg = customerAgg.get(cust.id)!;
        agg.spend += amount;
        agg.orders += 1;
        if (!agg.first || createdAt < agg.first) agg.first = createdAt;
        if (!agg.last || createdAt > agg.last) agg.last = createdAt;
      }
    }
  }

  // mark a small cohort as long-lost for demo realism
  for (let i = customers.length - 12; i < customers.length; i++) {
    const c = customers[i];
    const agg = customerAgg.get(c.id)!;
    agg.last = daysAgo(120);
  }

  // update customer aggregates
  for (const c of customers) {
    const agg = customerAgg.get(c.id)!;
    await prisma.customer.update({
      where: { id: c.id },
      data: {
        totalSpend: agg.spend,
        orderCount: agg.orders,
        firstPurchaseAt: agg.first,
        lastPurchaseAt: agg.last,
      },
    });
  }

  // historical campaigns
  const segInactive = await prisma.customerSegment.create({
    data: {
      merchantId: merchant.id,
      name: "Inactive 60+ days",
      description: "Customers with no successful purchase in the last 60 days.",
      criteria: { inactiveDays: 60 },
      customerCount: 38,
    },
  });

  const c1 = await prisma.campaign.create({
    data: {
      merchantId: merchant.id,
      name: "Summer AC Sale",
      segmentId: segInactive.id,
      message: "Beat the Mumbai heat! 12% off on all ACs and coolers this weekend. Visit Sharma Electronics.",
      language: "hi-IN",
      channel: "WHATSAPP",
      status: "completed",
      audienceCount: 42,
      sentCount: 42,
      deliveredCount: 40,
      openedCount: 26,
      redeemedCount: 12,
      revenueAttributed: 420000,
      createdAt: daysAgo(45),
      executedAt: daysAgo(45),
    },
  });
  const c2 = await prisma.campaign.create({
    data: {
      merchantId: merchant.id,
      name: "Festive Diwali Bundle",
      message: "Diwali dhamaka! Bundle TV + Soundbar and save Rs. 3,000. Limited stock.",
      language: "hi-IN",
      channel: "WHATSAPP",
      status: "completed",
      audienceCount: 68,
      sentCount: 68,
      deliveredCount: 66,
      openedCount: 48,
      redeemedCount: 22,
      revenueAttributed: 590000,
      createdAt: daysAgo(30),
      executedAt: daysAgo(30),
    },
  });
  const c3 = await prisma.campaign.create({
    data: {
      merchantId: merchant.id,
      name: "Old Customers WhatsApp Blast",
      message: "We miss you at Sharma Electronics. Come see what's new this month.",
      language: "hi-IN",
      channel: "WHATSAPP",
      status: "completed",
      audienceCount: 35,
      sentCount: 35,
      deliveredCount: 33,
      openedCount: 11,
      redeemedCount: 2,
      revenueAttributed: 18000,
      createdAt: daysAgo(23),
      executedAt: daysAgo(23),
    },
  });

  // sample campaign events for the poor campaign (for analytics realism)
  const sampleCustomers = customers.slice(0, 8).map((c) => c.id);
  for (const cid of sampleCustomers) {
    await prisma.campaignEvent.create({
      data: { campaignId: c3.id, customerId: cid, type: "SENT", createdAt: daysAgo(23) },
    });
  }

  await prisma.offer.create({
    data: {
      merchantId: merchant.id,
      name: "Diwali 10% off (expired)",
      type: "PERCENT",
      value: 10,
      minAmount: 5000,
      maxDiscount: 3000,
      validFrom: daysAgo(45),
      validTo: daysAgo(31),
      estimatedCost: 45000,
      marginOk: true,
      status: "expired",
    },
  });

  // welcome conversation
  const conv = await prisma.conversation.create({
    data: { merchantId: merchant.id, title: "Welcome to DIA" },
  });
  await prisma.message.create({
    data: {
      conversationId: conv.id,
      role: "assistant",
      content: {
        text: "Namaste! Main DIA hoon, aapka business teammate. Aaj ka sales, customers aur campaigns dekhne ke liye poochhiye. Main voice bhi samajhta hoon.",
        cards: [],
      },
    },
  });

  console.log("Seed complete. Merchant:", merchant.id, "Customers:", customerCount, "Products:", products.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
