import type { LlmMessage, LlmTool, LlmResponse, LlmProvider } from "./types.js";

function lastUserText(messages: LlmMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user" && typeof messages[i].content === "string") return messages[i].content as string;
  }
  return "";
}

function countRounds(messages: LlmMessage[]): number {
  let rounds = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") break;
    if (messages[i].role === "assistant" && messages[i].tool_calls && messages[i].tool_calls!.length) rounds++;
  }
  return rounds;
}

function toolResultsAfterLastUser(messages: LlmMessage[]): Array<{ name: string; data: any }> {
  const out: Array<{ name: string; data: any }> = [];
  // find last user index
  let start = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") { start = i + 1; break; }
  }
  for (let i = start; i < messages.length; i++) {
    if (messages[i].role === "tool") {
      let data: any = null;
      try { data = JSON.parse(messages[i].content as string); } catch { data = messages[i].content; }
      out.push({ name: messages[i].name ?? "tool", data });
    }
  }
  return out;
}

function detectLang(text: string): "mr-IN" | "hi-IN" | "en-IN" {
  const t = text.toLowerCase();
  if (/marathi|मराठी/.test(t)) return "mr-IN";
  if (/hindi|हिंदी/.test(t)) return "hi-IN";
  // Hinglish-ish default for this product
  return "hi-IN";
}

export function buildPlan(text: string): string[] {
  const t = text.toLowerCase();
  const plan: string[] = [];
  const has = (re: RegExp) => re.test(t);
  const wantsReport = has(/report|aaj ka|today'?s business|daily|business report/);
  const wantsDecline = has(/drop|decline|kam ho|kya problem|why.*sale|sales.*down|gir[a-z]*|yesterday/);
  const wantsWinback = has(/inactive|bring back|wapas|win.?back|lane ke liye|recover|laut/);
  const wantsOffer = has(/offer|discount|margin/);
  const wantsCampPerf = has(/campaign.*(perform|result|how)|performance.*campaign/);

  if (wantsReport) {
    plan.push("get_sales_metrics", "get_customer_segments", "analyze_sales_performance");
  }
  if (wantsDecline) {
    if (!plan.includes("get_sales_metrics")) plan.push("get_sales_metrics");
    if (!plan.includes("analyze_sales_performance")) plan.push("analyze_sales_performance");
    if (!plan.includes("get_customer_segments")) plan.push("get_customer_segments");
  }
  if (wantsWinback) {
    if (!plan.includes("get_customer_segments")) plan.push("get_customer_segments");
    plan.push("create_customer_segment");
    if (wantsOffer || wantsWinback) {
      if (!plan.includes("create_offer")) plan.push("create_offer");
    }
    plan.push("generate_campaign");
  } else if (wantsOffer) {
    if (!plan.includes("get_sales_metrics")) plan.push("get_sales_metrics");
    if (!plan.includes("analyze_sales_performance")) plan.push("analyze_sales_performance");
    if (!plan.includes("create_offer")) plan.push("create_offer");
  }
  if (wantsCampPerf) {
    plan.push("get_campaign_performance");
  }
  // dedup preserving order
  const seen = new Set<string>();
  const deduped = plan.filter((p) => (seen.has(p) ? false : (seen.add(p), true)));
  if (deduped.length === 0) {
    deduped.push("get_sales_metrics", "get_customer_segments");
  }
  return deduped;
}

function findResult(results: Array<{ name: string; data: any }>, name: string): any {
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i].name === name) return results[i].data;
  }
  return null;
}

function buildArgs(toolName: string, userText: string, messages: LlmMessage[], round: number): Record<string, unknown> {
  const t = userText.toLowerCase();
  const results = toolResultsAfterLastUser(messages);
  switch (toolName) {
    case "get_sales_metrics": {
      let period = "today";
      if (/yesterday|yest/.test(t)) period = "yesterday";
      else if (/weekend|week/.test(t)) period = "week";
      else if (/month/.test(t)) period = "month";
      else if (/decline|drop|kam/.test(t)) period = "yesterday";
      return { period, compare: true };
    }
    case "analyze_sales_performance": {
      let focus = "today";
      if (/yesterday/.test(t)) focus = "yesterday";
      else if (/weekend/.test(t)) focus = "weekend";
      else if (/week/.test(t)) focus = "week";
      else if (/decline|drop|kam/.test(t)) focus = "yesterday";
      return { focus, includeHypotheses: true };
    }
    case "create_customer_segment":
      return {
        name: "Inactive 60+ days (auto)",
        description: "Customers with no successful purchase in the last 60 days.",
        criteria: { inactiveDays: 60 },
      };
    case "create_offer":
      return {
        type: "PERCENT",
        value: 8,
        minAmount: 2000,
        validityDays: 14,
        title: "Come-back 8% off",
      };
    case "generate_campaign": {
      const seg = findResult(results, "create_customer_segment");
      const off = findResult(results, "create_offer");
      const lang = detectLang(userText);
      return {
        segmentId: seg?.segmentId ?? seg?.data?.segmentId ?? "latest",
        offerId: off?.offerId ?? off?.data?.offerId ?? "latest",
        language: lang === "mr-IN" ? "mr-IN" : lang === "hi-IN" ? "hi-IN" : "en-IN",
        channel: "WHATSAPP",
      };
    }
    case "get_campaign_performance":
      return { campaignId: "latest" };
    default:
      return {};
  }
}

function fmt(n: number): string {
  return "Rs. " + n.toLocaleString("en-IN");
}

function composeReply(userText: string, results: Array<{ name: string; data: any }>): string {
  const lang = detectLang(userText);
  const t = userText.toLowerCase();
  const wantsReport = /report|aaj ka|today'?s business|daily|business report/.test(t);
  const wantsDecline = /drop|decline|kam ho|kya problem|why.*sale|sales.*down|gir/.test(t);
  const wantsWinback = /inactive|bring back|wapas|win.?back|lane ke liye|recover|laut/.test(t);
  const wantsOffer = /offer|discount|margin/.test(t) && !wantsWinback;
  const wantsCampPerf = /campaign.*(perform|result|how)|performance.*campaign/.test(t);

  const sm = findResult(results, "get_sales_metrics");
  const segs = findResult(results, "get_customer_segments");
  const an = findResult(results, "analyze_sales_performance");
  const seg = findResult(results, "create_customer_segment");
  const off = findResult(results, "create_offer");
  const camp = findResult(results, "generate_campaign");
  const cperf = findResult(results, "get_campaign_performance");

  if (wantsReport) {
    const today = sm?.today ?? sm?.data?.today;
    const yest = sm?.yesterday ?? sm?.data?.yesterday;
    const rev = today?.revenue ?? 0;
    const orders = today?.orders ?? 0;
    const avg = today?.avgTicket ?? 0;
    const delta = sm?.revenueDeltaPct ?? sm?.data?.revenueDeltaPct ?? 0;
    const active = segs?.active ?? segs?.data?.active ?? 0;
    const dormant = segs?.dormant ?? segs?.data?.dormant ?? 0;
    const text = `Aaj ka report: revenue ${fmt(rev)} across ${orders} orders, average ticket ${fmt(avg)}. Compared to yesterday that is ${delta >= 0 ? "+" : ""}${delta}%. Active customers ${active}, dormant ${dormant}. ${an?.headline ?? an?.data?.headline ?? "Sales are steady."} Next best action: focus on the inactive 60-day cohort with a comeback offer.`;
    if (lang === "mr-IN") return `आजचा अहवाल: ${fmt(rev)} महसूल, ${orders} ऑर्डर, सरासरी टिकीट ${fmt(avg)}. कालच्या तुलनेत ${delta >= 0 ? "+" : ""}${delta}%. सक्रिय ग्राहक ${active}, निष्क्रिय ${dormant}. पुढील सर्वोत्तम कृती: 60 दिवसांपासून निष्क्रिय ग्राहकांसाठी परत येण्याची ऑफर.`;
    return text;
  }

  if (wantsDecline) {
    const wk = an?.weekend ?? an?.data?.weekend;
    const lastRev = wk?.lastWeekend?.revenue ?? sm?.lastWeekendRevenue ?? 0;
    const prevRev = wk?.prevWeekend?.revenue ?? sm?.prevWeekendRevenue ?? 0;
    const delta = wk?.revenueDeltaPct ?? (prevRev ? Math.round(((lastRev - prevRev) / prevRev) * 1000) / 10 : 0);
    const avgDelta = wk?.avgTicketDeltaPct ?? 0;
    const ordersDelta = wk?.ordersDeltaPct ?? 0;
    const text = `Last weekend sales were ${fmt(lastRev)} versus ${fmt(prevRev)} the weekend before, a change of ${delta >= 0 ? "+" : ""}${delta}%. Order count changed ${ordersDelta >= 0 ? "+" : ""}${ordersDelta}% and average ticket ${avgDelta >= 0 ? "+" : ""}${avgDelta}%. The pattern points to fewer high-ticket purchases rather than fewer visitors. I recommend a comeback offer to customers inactive for 60+ days, which I have prepared below for your approval.`;
    if (lang === "mr-IN") return `गेल्या आठवड्याच्या शेवटी विक्री ${fmt(lastRev)} होती, मागील आठवड्याच्या शेवटी ${fmt(prevRev)} होती, बदल ${delta >= 0 ? "+" : ""}${delta}%. ऑर्डर संख्या ${ordersDelta >= 0 ? "+" : ""}${ordersDelta}% आणि सरासरी टिकीट ${avgDelta >= 0 ? "+" : ""}${avgDelta}% बदलले. नमुना दर्शवतो की अधिक मौल्यवान खरेदी कमी झाल्या. मी 60+ दिवस निष्क्रिय ग्राहकांसाठी परत येण्याची ऑफर तयार केली आहे, तुमच्या मंजुरीसाठी खाली दिली आहे.`;
    return text;
  }

  if (wantsWinback) {
    const n = seg?.customerCount ?? seg?.data?.customerCount ?? 0;
    const aud = camp?.audienceCount ?? camp?.data?.audienceCount ?? n;
    const text = `I have prepared a comeback campaign: 8% off for ${aud} customers who have not bought in the last 60 days. The offer, audience and message are in the preview below. Please review and approve to send.`;
    if (lang === "mr-IN") return `मी परत येण्याची मोहीम तयार केली आहे: गेल्या 60 दिवसांत खरेदी न केलेल्या ${aud} ग्राहकांसाठी 8% सूट. ऑफर, प्रेक्षक आणि संदेश खालील पूर्वावलोकनात आहेत. पाठवण्यासाठी कृपया तपासा आणि मंजूर करा.`;
    return text;
  }

  if (wantsOffer) {
    const est = off?.estimatedCost ?? off?.data?.estimatedCost ?? 0;
    const margin = off?.marginOk ?? off?.data?.marginOk ?? true;
    const text = `Suggested an 8% comeback offer valid 14 days, minimum bill Rs. 2,000. Estimated discount cost ${fmt(est)}. Margin check: ${margin ? "healthy, stays above the floor" : "tight, review before publishing"}. Approve to publish.`;
    return text;
  }

  if (wantsCampPerf) {
    const name = cperf?.name ?? cperf?.data?.name ?? "latest campaign";
    const sent = cperf?.sent ?? cperf?.data?.sent ?? 0;
    const del = cperf?.delivered ?? cperf?.data?.delivered ?? 0;
    const op = cperf?.opened ?? cperf?.data?.opened ?? 0;
    const red = cperf?.redeemed ?? cperf?.data?.redeemed ?? 0;
    const rev = cperf?.revenue ?? cperf?.data?.revenue ?? 0;
    return `${name}: sent ${sent}, delivered ${del}, opened ${op}, redeemed ${red}, revenue ${fmt(rev)}.`;
  }

  // default overview
  const rev = sm?.today?.revenue ?? sm?.data?.today?.revenue ?? 0;
  const orders = sm?.today?.orders ?? sm?.data?.today?.orders ?? 0;
  const active = segs?.active ?? segs?.data?.active ?? 0;
  return `Today so far: ${fmt(rev)} across ${orders} orders. ${active} active customers. Ask me to investigate a drop, build an offer, or prepare a campaign.`;
}

export class MockLlmProvider implements LlmProvider {
  name = "mock";
  async chat(messages: LlmMessage[], _tools: LlmTool[]): Promise<LlmResponse> {
    const text = lastUserText(messages);
    const rounds = countRounds(messages);
    const plan = buildPlan(text);
    if (rounds < plan.length) {
      const toolName = plan[rounds];
      const args = buildArgs(toolName, text, messages, rounds);
      return {
        message: {
          role: "assistant",
          content: null,
          tool_calls: [{ id: `mock_call_${rounds}`, name: toolName, arguments: JSON.stringify(args) }],
        },
        finishReason: "tool_calls",
      };
    }
    const results = toolResultsAfterLastUser(messages);
    const reply = composeReply(text, results);
    return { message: { role: "assistant", content: reply }, finishReason: "stop" };
  }
}
