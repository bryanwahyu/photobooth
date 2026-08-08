import type { Order, PaymentProvider } from "./types";
import { buildQrisPayload } from "./qris";

/**
 * Demo provider. Charges are fake: QR payloads are structurally valid but not
 * issued by an acquirer, and orders settle on a timer (or via the
 * "simulasi bayar" endpoint) instead of a real webhook.
 *
 * To go live, implement this same interface against Midtrans / Xendit / Doku
 * and settle orders from their webhook instead of `checkStatus`.
 */
const AUTO_SETTLE_MS = Number(process.env.PAYMENT_AUTO_SETTLE_MS ?? 20000);

export const mockProvider: PaymentProvider = {
  name: "mock",

  async createCharge({ orderId, amount, methodId }) {
    if (methodId === "va_bca" || methodId === "va_bni") {
      const prefix = methodId === "va_bca" ? "39001" : "98801";
      const suffix = orderId.replace(/\D/g, "").slice(-8).padStart(8, "0");
      return { qrPayload: null, vaNumber: `${prefix}${suffix}`, deeplink: null };
    }

    const qrPayload = buildQrisPayload({
      merchantId: process.env.QRIS_MERCHANT_ID ?? "ID1234567890000",
      merchantName: process.env.QRIS_MERCHANT_NAME ?? "PHOTOBOOTH DEMO",
      merchantCity: process.env.QRIS_MERCHANT_CITY ?? "JAKARTA",
      amount,
      reference: orderId,
    });

    const deeplink =
      methodId === "gopay"
        ? `gojek://gopay/merchanttransfer?tref=${orderId}`
        : methodId === "ovo"
          ? `ovo://payment?ref=${orderId}`
          : null;

    return { qrPayload, vaNumber: null, deeplink };
  },

  async checkStatus(order: Order) {
    if (order.status !== "pending") return order.status;
    if (Date.now() > order.expiresAt) return "expired";
    if (AUTO_SETTLE_MS > 0 && Date.now() - order.createdAt >= AUTO_SETTLE_MS) return "paid";
    return "pending";
  },
};
