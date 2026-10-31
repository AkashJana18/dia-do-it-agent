import type { UiLang } from "./copy";

const HI: Record<string, string> = {
  get_sales_metrics: "आपकी बिक्री",
  get_transaction_history: "पिछले ऑर्डर",
  get_customer_segments: "आपके ग्राहक",
  analyze_sales_performance: "बिक्री की वजह",
  create_offer: "ऑफर तैयार किया",
  create_customer_segment: "ग्राहकों की सूची बनाई",
  generate_campaign: "मैसेज तैयार किया",
  preview_campaign: "मैसेज जाँचा",
  execute_campaign: "मैसेज भेजा",
  get_campaign_performance: "नतीजे देखे",
};

const EN: Record<string, string> = {
  get_sales_metrics: "Your sales",
  get_transaction_history: "Recent orders",
  get_customer_segments: "Your customers",
  analyze_sales_performance: "Why sales moved",
  create_offer: "Prepared the offer",
  create_customer_segment: "Built the customer list",
  generate_campaign: "Wrote the message",
  preview_campaign: "Checked the message",
  execute_campaign: "Sent the message",
  get_campaign_performance: "Read the results",
};

export function toolLabel(tool: string, lang: UiLang): string {
  const table = lang === "hi" ? HI : EN;
  return table[tool] ?? (lang === "hi" ? "आपका हिसाब" : "Your business");
}

// Plain names for the few labels the tools emit in English.
const METRIC_HI: Array<[RegExp, string]> = [
  [/^revenue$/i, "कमाई"],
  [/^orders$/i, "ऑर्डर"],
  [/avg(erage)? ticket/i, "औसत बिल"],
  [/unique customers/i, "ग्राहक"],
  [/^weekend revenue/i, "वीकेंड बिक्री बदलाव"],
  [/^order count/i, "ऑर्डर बदलाव"],
  [/^avg ticket/i, "औसत बिल बदलाव"],
  [/yesterday vs/i, "कल बनाम हफ़्ते का औसत"],
];

export function metricLabel(label: string, lang: UiLang): string {
  if (lang !== "hi") return label;
  for (const [re, out] of METRIC_HI) if (re.test(label)) return out;
  return label;
}

const TITLE_HI: Array<[RegExp, string]> = [
  [/sales performance/i, "बिक्री का हाल"],
  [/today sales/i, "आज की बिक्री"],
  [/week sales/i, "हफ़्ते की बिक्री"],
  [/month sales/i, "महीने की बिक्री"],
  [/customer segments/i, "आपके ग्राहक"],
];

export function insightTitle(title: string, lang: UiLang): string {
  if (!title) return lang === "hi" ? "आपका हिसाब" : "Your numbers";
  if (lang !== "hi") return title;
  for (const [re, out] of TITLE_HI) if (re.test(title)) return out;
  return title;
}

export function segmentTitle(name: string, lang: UiLang): string {
  if (lang !== "hi") return name;
  const s = name.toLowerCase();
  if (s.includes("inactive") || s.includes("60+")) return "60 दिन से न आए ग्राहक";
  if (s.includes("dormant")) return "31-90 दिन से न आए ग्राहक";
  if (s.includes("lost") || s.includes("90+")) return "90 दिन से न आए ग्राहक";
  if (s.includes("frequent")) return "नियमित ग्राहक";
  if (s.includes("high value")) return "बड़े ग्राहक";
  if (s.includes("active")) return "सक्रिय ग्राहक";
  return name;
}

export function offerValue(type?: string, value?: number, lang: UiLang = "en"): string {
  if (!type || value == null) return "…";
  if (type.toUpperCase() === "PERCENT") return lang === "hi" ? `${value}% छूट` : `${value}% off`;
  return lang === "hi" ? `₹${value} की छूट` : `₹${value} off`;
}

export function sendTitle(audience: number | undefined, lang: UiLang): string {
  const n = audience ?? 0;
  return lang === "hi" ? `${n} ग्राहकों को मैसेज भेजें` : `Send a message to ${n} customers`;
}

export function relativeDay(iso: string, lang: UiLang): string {
  const then = new Date(iso);
  const now = new Date();
  const days = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime()) /
      86400000
  );
  if (days <= 0) return lang === "hi" ? "आज" : "Today";
  if (days === 1) return lang === "hi" ? "कल" : "Yesterday";
  if (days < 7) return lang === "hi" ? `${days} दिन पहले` : `${days} days ago`;
  return then.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function inr(n?: number | null): string {
  if (n == null || Number.isNaN(Number(n))) return "…";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

export function secondsLabel(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
