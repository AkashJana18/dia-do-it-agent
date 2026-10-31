import { describe, it, expect } from "vitest";
import { buildPlan } from "../src/services/llm/mock-llm.js";

describe("mock llm plan builder", () => {
  it("plans the full winback chain for the demo Hinglish request", () => {
    const plan = buildPlan("Last weekend sales kam ho gayi hain. Check karo kya problem hai aur inactive customers ko wapas lane ke liye ek offer banao.");
    expect(plan).toContain("get_sales_metrics");
    expect(plan).toContain("analyze_sales_performance");
    expect(plan).toContain("get_customer_segments");
    expect(plan).toContain("create_customer_segment");
    expect(plan).toContain("create_offer");
    expect(plan).toContain("generate_campaign");
    // generate_campaign must come after the segment and offer are prepared
    expect(plan.indexOf("generate_campaign")).toBeGreaterThan(plan.indexOf("create_offer"));
  });

  it("plans a daily report", () => {
    const plan = buildPlan("Give me today's business report");
    expect(plan).toEqual(["get_sales_metrics", "get_customer_segments", "analyze_sales_performance"]);
  });

  it("plans campaign performance lookup", () => {
    const plan = buildPlan("How did my last campaign perform?");
    expect(plan).toContain("get_campaign_performance");
  });

  it("never returns an empty plan", () => {
    const plan = buildPlan("hello");
    expect(plan.length).toBeGreaterThan(0);
  });
});

describe("health", () => {
  it("module loads", async () => {
    const { buildApp } = await import("../src/app.js");
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    await app.close();
  });
});
