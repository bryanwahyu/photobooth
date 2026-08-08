import QRCode from "qrcode";
import { mockProvider } from "@/lib/payment/mock-provider";
import { createOrder, updateOrder } from "@/lib/payment/store";
import { methodById, packageById, type PublicOrder } from "@/lib/payment/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body harus JSON" }, { status: 400 });
  }

  const { packageId, methodId } = (body ?? {}) as { packageId?: string; methodId?: string };
  const pkg = packageId ? packageById(packageId) : undefined;
  const method = methodId ? methodById(methodId) : undefined;

  if (!pkg) return Response.json({ error: "Paket tidak dikenal" }, { status: 400 });
  if (!method) return Response.json({ error: "Metode bayar tidak dikenal" }, { status: 400 });

  const order = createOrder({ packageId: pkg.id, methodId: method.id, amount: pkg.price });

  const charge = await mockProvider.createCharge({
    orderId: order.id,
    amount: order.amount,
    methodId: method.id,
  });

  const full = updateOrder(order.id, charge) ?? { ...order, ...charge };

  const qrDataUrl = full.qrPayload
    ? await QRCode.toDataURL(full.qrPayload, { margin: 1, width: 512 })
    : null;

  const payload: PublicOrder = { ...full, qrDataUrl, receipt: null };
  return Response.json(payload, { status: 201 });
}
