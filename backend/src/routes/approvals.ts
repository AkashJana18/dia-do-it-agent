import type { FastifyInstance } from "fastify";
import { prisma } from "../database/prisma.js";
import { requireMerchant } from "../middleware/auth.js";

export async function approvalRoutes(app: FastifyInstance) {
  app.get("/api/approvals", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const status = (request.query as any)?.status;
    const approvals = await prisma.approval.findMany({
      where: { merchantId: mid, ...(status ? { status } : {}) },
      orderBy: { requestedAt: "desc" },
      include: { action: true },
      take: 50,
    });
    return { approvals };
  });

  app.post("/api/approvals/:id/approve", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const { id } = request.params as { id: string };
    const approval = await prisma.approval.findFirst({ where: { id, merchantId: mid } });
    if (!approval) return reply.code(404).send({ error: "approval not found" });
    if (approval.status !== "pending") return reply.code(409).send({ error: `approval already ${approval.status}` });

    const action = await prisma.agentAction.findFirst({ where: { id: approval.actionId, merchantId: mid } });
    if (!action) return reply.code(404).send({ error: "action not found" });

    await prisma.approval.update({ where: { id }, data: { status: "approved", decidedAt: new Date(), decidedBy: "merchant" } });
    await prisma.agentAction.update({ where: { id: action.id }, data: { status: "approved", decidedAt: new Date() } });
    await prisma.auditLog.create({ data: { merchantId: mid, actionId: action.id, event: "approval_granted", data: { approvalId: id } } });

    // execute if it is a campaign execution action
    if (action.type === "EXECUTE_CAMPAIGN") {
      // delegate to execute_campaign tool via agent? Instead call service directly.
      const { getTool } = await import("../agent/tools/index.js");
      const tool = getTool("execute_campaign");
      if (tool) {
        const result = await tool.handler({ merchantId: mid, conversationId: action.conversationId ?? undefined }, { actionId: action.id });
        return { approval: { ...approval, status: "approved" }, action: { ...action, status: "completed" }, execution: result };
      }
    }

    return { approval: { ...approval, status: "approved" }, action: { ...action, status: "approved" } };
  });

  app.post("/api/approvals/:id/reject", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { comment?: string };
    const approval = await prisma.approval.findFirst({ where: { id, merchantId: mid } });
    if (!approval) return reply.code(404).send({ error: "approval not found" });
    if (approval.status !== "pending") return reply.code(409).send({ error: `approval already ${approval.status}` });

    const action = await prisma.agentAction.findFirst({ where: { id: approval.actionId, merchantId: mid } });
    await prisma.approval.update({ where: { id }, data: { status: "rejected", decidedAt: new Date(), decidedBy: "merchant", comment: body.comment ?? null } });
    if (action) await prisma.agentAction.update({ where: { id: action.id }, data: { status: "rejected", decidedAt: new Date() } });
    await prisma.auditLog.create({ data: { merchantId: mid, actionId: action?.id ?? null, event: "approval_rejected", data: { approvalId: id, comment: body.comment } } });
    return { approval: { ...approval, status: "rejected" } };
  });
}

export async function actionRoutes(app: FastifyInstance) {
  app.get("/api/actions", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const actions = await prisma.agentAction.findMany({ where: { merchantId: mid }, orderBy: { createdAt: "desc" }, take: 50 });
    return { actions };
  });

  app.get("/api/audit", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const logs = await prisma.auditLog.findMany({ where: { merchantId: mid }, orderBy: { createdAt: "desc" }, take: 100 });
    return { logs };
  });
}
