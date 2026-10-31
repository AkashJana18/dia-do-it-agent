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
  const wantsReport = has(/report|aaj ka|today'?s business|daily|business report|रिपोर्ट|आज का हिसाब|आज की बिक्री/);
  const wantsDecline = has(
    /drop|decline|kam ho|kya problem|why.*sale|sales.*down|gir[a-z]*|yesterday|कम हो|क्यों.*बिक्री|बिक्री.*क्यों|कम हुई|गिर/
  );
  const wantsWinback = has(
    /inactive|bring back|wapas|win.?back|lane ke liye|recover|laut|वापस|रुके|नहीं आए|आना बंद/
  );
  const wantsOffer = has(/offer|discount|margin|ऑफर|छूट|डिस्काउंट/);
  const wantsCampPerf = has(/campaign.*(perform|result|how)|performance.*campaign|मैसेज.*नतीज|नतीजे/);

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
      else if (/weekend|week|वीकेंड|सप्ताहांत|हफ़्ते/.test(t)) period = "week";
      else if (/month|महीन|महीने/.test(t)) period = "month";
      else if (/decline|drop|kam|कम|गिर/.test(t)) period = "yesterday";
      return { period, compare: true };
    }
    case "analyze_sales_performance": {
      let focus = "today";
      if (/yesterday/.test(t)) focus = "yesterday";
      else if (/weekend|वीकेंड|सप्ताहांत/.test(t)) focus = "weekend";
      else if (/week|हफ़्ते/.test(t)) focus = "week";
      else if (/decline|drop|kam|कम|गिर/.test(t)) focus = "yesterday";
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

function preferredLanguage(messages: LlmMessage[]): string {
  const system = messages.find((m) => m.role === "system");
  const content = typeof system?.content === "string" ? system.content : "";
  const match = content.match(/preferred language:\s*([a-z]{2}-[A-Z]{2})/);
  return match?.[1] ?? "hi-IN";
}

function composeReply(
  userText: string,
  results: Array<{ name: string; data: any }>,
  lang: string
): string {
  const hi = lang.startsWith("hi");
  const mr = lang.startsWith("mr");
  const t = userText.toLowerCase();
  const wantsReport = /report|aaj ka|today'?s business|daily|business report|रिपोर्ट|आज का हिसाब|आज की बिक्री/.test(t);
  const wantsDecline = /drop|decline|kam ho|kya problem|why.*sale|sales.*down|gir|कम हो|क्यों.*बिक्री|बिक्री.*क्यों|कम हुई|गिर/.test(t);
  const wantsWinback = /inactive|bring back|wapas|win.?back|lane ke liye|recover|laut|वापस|रुके|नहीं आए|आना बंद/.test(t);
  const wantsOffer = /offer|discount|margin|ऑफर|छूट|डिस्काउंट/.test(t) && !wantsWinback;
  const wantsCampPerf = /campaign.*(perform|result|how)|performance.*campaign|मैसेज.*नतीज|नतीजे/.test(t);

  const sm = findResult(results, "get_sales_metrics");
  const segs = findResult(results, "get_customer_segments");
  const an = findResult(results, "analyze_sales_performance");
  const seg = findResult(results, "create_customer_segment");
  const off = findResult(results, "create_offer");
  const camp = findResult(results, "generate_campaign");
  const cperf = findResult(results, "get_campaign_performance");

  if (wantsReport) {
    const today = sm?.today ?? sm?.data?.today;
    const rev = today?.revenue ?? 0;
    const orders = today?.successfulOrders ?? today?.orders ?? 0;
    const avg = today?.avgTicket ?? 0;
    const delta = sm?.revenueDeltaPct ?? sm?.data?.revenueDeltaPct ?? 0;
    const active = segs?.active ?? segs?.data?.active ?? 0;
    if (hi) {
      return `आज का हिसाब: ${fmt(rev)}, ${orders} ऑर्डर, औसत बिल ${fmt(avg)}. कल से ${delta >= 0 ? "+" : ""}${delta}%. ${active} ग्राहक सक्रिय हैं. सबसे अच्छा अगला कदम: जो ग्राहक आना बंद कर दिए, उन्हें वापस बुलाना.`;
    }
    if (mr) {
      return `आजचा हिशोब: ${fmt(rev)}, ${orders} ऑर्डर, सरासरी बिल ${fmt(avg)}. कालच्या तुलनेत ${delta >= 0 ? "+" : ""}${delta}%. ${active} ग्राहक सक्रिय आहेत. पुढचे पाऊल: येणे बंद केलेल्या ग्राहकांना परत बोलवणे.`;
    }
    return `Today: ${fmt(rev)} from ${orders} orders, average bill ${fmt(avg)}. That is ${delta >= 0 ? "+" : ""}${delta}% from yesterday. The best next step is to bring back customers who have stopped buying.`;
  }

  if (wantsDecline) {
    const wk = an?.weekend ?? an?.data?.weekend;
    const lastRev = wk?.lastWeekend?.revenue ?? sm?.lastWeekendRevenue ?? 0;
    const prevRev = wk?.prevWeekend?.revenue ?? sm?.prevWeekendRevenue ?? 0;
    const delta = wk?.revenueDeltaPct ?? (prevRev ? Math.round(((lastRev - prevRev) / prevRev) * 1000) / 10 : 0);
    const avgDelta = wk?.avgTicketDeltaPct ?? 0;
    const ordersDelta = wk?.ordersDeltaPct ?? 0;
    if (hi) {
      return `पिछले वीकेंड ${fmt(lastRev)} की बिक्री हुई, उससे पहले ${fmt(prevRev)}, यानी ${delta >= 0 ? "+" : ""}${delta}%. ऑर्डर ${ordersDelta >= 0 ? "+" : ""}${ordersDelta}% और औसत बिल ${avgDelta >= 0 ? "+" : ""}${avgDelta}% बदला. मतलब ग्राहक कम नहीं हुए, बड़ी खरीद कम हुई. मैंने 60 दिन से न आए ग्राहकों के लिए वापस बुलाने का मैसेज नीचे तैयार किया है.`;
    }
    if (mr) {
      return `गेल्या वीकेंडला ${fmt(lastRev)} ची विक्री झाली, त्याआधी ${fmt(prevRev)}, म्हणजे ${delta >= 0 ? "+" : ""}${delta}%. ऑर्डर ${ordersDelta >= 0 ? "+" : ""}${ordersDelta}% आणि सरासरी बिल ${avgDelta >= 0 ? "+" : ""}${avgDelta}% बदलले. म्हणजे ग्राहक कमी झाले नाहीत, मोठ्या खरेदी कमी झाल्या. 60 दिवसांपासून न आलेल्या ग्राहकांसाठी परत बोलवण्याचा संदेश खाली तयार आहे.`;
    }
    return `Last weekend made ${fmt(lastRev)}, the weekend before ${fmt(prevRev)}. That is ${delta >= 0 ? "+" : ""}${delta}%. Orders changed ${ordersDelta >= 0 ? "+" : ""}${ordersDelta}% and the average bill ${avgDelta >= 0 ? "+" : ""}${avgDelta}%. That means fewer big purchases, not fewer visitors. I have prepared a message for customers who have not bought in 60 days.`;
  }

  if (wantsWinback) {
    const n = seg?.customerCount ?? seg?.data?.customerCount ?? 0;
    const aud = camp?.audienceCount ?? camp?.data?.audienceCount ?? n;
    if (hi) {
      return `मैंने वापस बुलाने का मैसेज तैयार किया है: 60 दिन से न खरीदने वाले ${aud} ग्राहकों को 8% छूट. नीचे देख लीजिए. हाँ कहिए तो भेज दूँ.`;
    }
    if (mr) {
      return `परत बोलवण्याचा संदेश तयार आहे: 60 दिवसांपासून न खरेदी करणाऱ्या ${aud} ग्राहकांना 8% सूट. खाली बघा. हो म्हणाल तर पाठवतो.`;
    }
    return `I have written a comeback message: 8% off for ${aud} customers who have not bought in 60 days. Check it below, and say yes if you want me to send it.`;
  }

  if (wantsOffer) {
    const est = off?.estimatedCost ?? off?.data?.estimatedCost ?? 0;
    const margin = off?.marginOk ?? off?.data?.marginOk ?? true;
    if (hi) {
      return `8% छूट का ऑफर, 14 दिन तक, कम से कम ₹2,000 का बिल. अंदाज़न ₹${est.toLocaleString("en-IN")} का खर्च आएगा. ${margin ? "मुनाफ़ा ठीक रहेगा." : "मुनाफ़ा कम रहेगा, भेजने से पहले सोच लीजिए."}`;
    }
    if (mr) {
      return `8% सूटीची ऑफर, 14 दिवस, किमान ₹2,000 चे बिल. अंदाजे ₹${est.toLocaleString("en-IN")} खर्च येईल. ${margin ? "नफा ठीक राहील." : "नफा कमी राहील, पाठवण्यापूर्वी विचार करा."}`;
    }
    return `An 8% off offer for 14 days, minimum bill ₹2,000. It will cost about ₹${est.toLocaleString("en-IN")}. ${margin ? "Profit stays safe." : "Profit is tight, so think before sending."}`;
  }

  if (wantsCampPerf) {
    const name = cperf?.name ?? cperf?.data?.name ?? "";
    const sent = cperf?.sent ?? cperf?.data?.sent ?? 0;
    const red = cperf?.redeemed ?? cperf?.data?.redeemed ?? 0;
    const rev = cperf?.revenue ?? cperf?.data?.revenue ?? 0;
    if (hi) return `मैसेज का नतीजा: ${sent} को भेजा, ${red} ने इस्तेमाल किया, कमाई ${fmt(rev)}.`;
    if (mr) return `संदेशाचा निकाल: ${sent} जणांना पाठवला, ${red} जणांनी वापरला, कमाई ${fmt(rev)}.`;
    return `Message results: ${sent} sent, ${red} used, ${fmt(rev)} in sales.`;
  }

  const rev = sm?.today?.revenue ?? sm?.data?.today?.revenue ?? 0;
  const orders = sm?.today?.successfulOrders ?? sm?.data?.today?.successfulOrders ?? sm?.today?.orders ?? sm?.data?.today?.orders ?? 0;
  const active = segs?.active ?? segs?.data?.active ?? 0;
  if (hi) {
    return `आज अब तक ${fmt(rev)}, ${orders} ऑर्डर. ${active} ग्राहक सक्रिय हैं. बिक्री के बारे में कुछ पूछिए, या कहिए तो ऑफर बना दूँ.`;
  }
  if (mr) {
    return `आजपर्यंत ${fmt(rev)}, ${orders} ऑर्डर. ${active} ग्राहक सक्रिय आहेत. विक्रीबद्दल काही विचारा, किंवा सांगा तर ऑफर बनवतो.`;
  }
  return `Today so far: ${fmt(rev)} from ${orders} orders. ${active} customers are active. Ask me about sales, or say the word and I'll build an offer.`;
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
    const reply = composeReply(text, results, preferredLanguage(messages));
    return { message: { role: "assistant", content: reply }, finishReason: "stop" };
  }
}
