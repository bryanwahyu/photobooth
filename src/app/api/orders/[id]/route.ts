import QRCode from "qrcode";
import { mockProvider } from "@/lib/payment/mock-provider";
import { getOrder, settleOrder, signReceipt } from "@/lib/payment/store";
import type { PublicOrder } from "@/lib/payment/types";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: RouteContext<"/api/orders/[id]">) {
  const { id } = await ctx.params;
  const order = getOrder(id);
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
}
