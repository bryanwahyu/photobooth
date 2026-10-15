import { createFileRoute } from "@tanstack/react-router";
import QRCode from "qrcode";
import { mockProvider } from "@/lib/payment/mock-provider";
import { getOrder, settleOrder, signReceipt } from "@/lib/payment/store";
import type { PublicOrder } from "@/lib/payment/types";

export const Route = createFileRoute("/api/orders/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const order = getOrder(params.id);
        if (!order) return Response.json({ error: "Order tidak ditemukan" }, { status: 404 });

        const status = await mockProvider.checkStatus(order);
        const current = status === order.status ? order : (settleOrder(order.id, status) ?? order);

        const qrDataUrl = current.qrPayload
          ? await QRCode.toDataURL(current.qrPayload, { margin: 1, width: 512 })
          : null;

        const payload: PublicOrder = {
          ...current,
          qrDataUrl,
          receipt: current.status === "paid" ? signReceipt(current) : null,
        };
        return Response.json(payload);
      },
    },
  },
});
