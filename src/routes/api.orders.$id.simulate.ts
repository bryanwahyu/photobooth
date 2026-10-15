import { createFileRoute } from "@tanstack/react-router";
import { getOrder, settleOrder, signReceipt } from "@/lib/payment/store";
import type { PublicOrder } from "@/lib/payment/types";

/**
 * Demo-only shortcut that marks an order paid without a real payment.
 * A production build replaces this with the gateway's webhook endpoint
 * (signature-verified) and deletes this route.
 */
export const Route = createFileRoute("/api/orders/$id/simulate")({
  server: {
    handlers: {
      POST: ({ params }) => {
        if (process.env.PAYMENT_PROVIDER && process.env.PAYMENT_PROVIDER !== "mock") {
          return Response.json({ error: "Simulasi dimatikan di mode non-mock" }, { status: 403 });
        }

        const order = getOrder(params.id);
        if (!order) return Response.json({ error: "Order tidak ditemukan" }, { status: 404 });
        if (Date.now() > order.expiresAt) {
          return Response.json({ error: "Order kedaluwarsa" }, { status: 409 });
        }

        const paid = settleOrder(order.id, "paid") ?? order;
        const payload: PublicOrder = { ...paid, qrDataUrl: null, receipt: signReceipt(paid) };
        return Response.json(payload);
      },
    },
  },
});
