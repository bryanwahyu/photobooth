import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { MethodId, Order, PackageId, OrderStatus } from "./types";

/**
 * In-memory order store — good enough for a demo, but it does NOT survive a
 * serverless cold start or span multiple instances. Swap for Redis/Postgres
 * (e.g. Upstash on Vercel) before taking real money.
 */
const orders = new Map<string, Order>();

const ORDER_TTL_MS = 5 * 60 * 1000;

function secret(): string {
  return process.env.PAYMENT_SECRET ?? "dev-only-insecure-secret";
}

export function createOrder(input: {
  packageId: PackageId;
  methodId: MethodId;
  amount: number;
}): Order {
  const now = Date.now();
  const order: Order = {
    id: `PB-${now.toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`,
    packageId: input.packageId,
    methodId: input.methodId,
    amount: input.amount,
    status: "pending",
    createdAt: now,
    expiresAt: now + ORDER_TTL_MS,
    paidAt: null,
    qrPayload: null,
    vaNumber: null,
    deeplink: null,
  };
  orders.set(order.id, order);
  pruneExpired();
  return order;
}

export function getOrder(id: string): Order | undefined {
  return orders.get(id);
}

export function updateOrder(id: string, patch: Partial<Order>): Order | undefined {
  const order = orders.get(id);
  if (!order) return undefined;
  const next = { ...order, ...patch };
  orders.set(id, next);
  return next;
}

export function settleOrder(id: string, status: OrderStatus): Order | undefined {
  return updateOrder(id, {
    status,
    paidAt: status === "paid" ? Date.now() : null,
  });
}

function pruneExpired() {
  const cutoff = Date.now() - ORDER_TTL_MS * 2;
  for (const [id, order] of orders) {
    if (order.createdAt < cutoff) orders.delete(id);
  }
}

/* ---------- signed receipt ---------- */

export function signReceipt(order: Order): string {
  const payload = JSON.stringify({
    id: order.id,
    packageId: order.packageId,
    paidAt: order.paidAt,
  });
  const body = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyReceipt(
  receipt: string,
): { id: string; packageId: PackageId; paidAt: number } | null {
  const [body, sig] = receipt.split(".");
  if (!body || !sig) return null;

  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
}
