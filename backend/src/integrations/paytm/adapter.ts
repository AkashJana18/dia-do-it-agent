// Boundary for real Paytm merchant integration.
// The mock provider below is the only implementation today. A real provider
// would implement the same interface against Paytm's documented APIs.
// Do not invent undocumented Paytm endpoints here.

export interface PaytmMerchantAdapter {
  getMerchantProfile(merchantId: string): Promise<MerchantProfile>;
  listTransactions(merchantId: string, opts: TransactionQuery): Promise<TransactionRow[]>;
  listCustomers(merchantId: string): Promise<CustomerRow[]>;
  listProducts(merchantId: string): Promise<ProductRow[]>;
  sendCampaign(input: CampaignSendInput): Promise<CampaignSendResult>;
}

export interface MerchantProfile {
  merchantId: string;
  businessName: string;
  city: string;
  currency: string;
}

export interface TransactionQuery {
  from?: Date;
  to?: Date;
  status?: string;
  limit?: number;
}

export interface TransactionRow {
  id: string;
  customerId: string | null;
  productId: string | null;
  quantity: number;
  amount: number;
  status: string;
  paymentMethod: string;
  createdAt: Date;
}

export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  language: string;
  firstPurchaseAt: Date | null;
  lastPurchaseAt: Date | null;
  totalSpend: number;
  orderCount: number;
}

export interface ProductRow {
  id: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  active: boolean;
}

export interface CampaignSendInput {
  campaignId: string;
  merchantId: string;
  audience: CustomerRow[];
  message: string;
  language: string;
  channel: string;
}

export interface CampaignSendResult {
  provider: "mock-paytm";
  sent: number;
  delivered: number;
  opened: number;
  redeemed: number;
  revenueAttributed: number;
  events: Array<{ customerId: string; type: string; at: Date }>;
  executedAt: Date;
}
