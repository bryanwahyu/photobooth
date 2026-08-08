export type PackageId = "basic" | "fun" | "pro";

export type Package = {
  id: PackageId;
  name: string;
  price: number;
  shots: number;
  perks: string[];
};

export const PACKAGES: Package[] = [
  {
    id: "basic",
    name: "Basic",
    price: 15000,
    shots: 4,
    perks: ["4 foto", "Semua filter", "Unduh strip PNG"],
  },
  {
    id: "fun",
    name: "Fun",
    price: 25000,
    shots: 6,
    perks: ["6 foto", "Semua filter + edit", "Auto print", "Tanpa watermark"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 40000,
    shots: 8,
    perks: ["8 foto", "Semua fitur Fun", "Stiker & teks bebas", "2× cetak"],
  },
];

export function packageById(id: string): Package | undefined {
  return PACKAGES.find((p) => p.id === id);
}

export type MethodId = "qris" | "gopay" | "ovo" | "va_bca" | "va_bni";

export type PaymentMethod = {
  id: MethodId;
  name: string;
  group: "qr" | "ewallet" | "va";
  hint: string;
};

export const METHODS: PaymentMethod[] = [
  { id: "qris", name: "QRIS", group: "qr", hint: "Scan pakai bank / e-wallet apa pun" },
  { id: "gopay", name: "GoPay", group: "ewallet", hint: "Scan QR di aplikasi Gojek" },
  { id: "ovo", name: "OVO", group: "ewallet", hint: "Scan QR di aplikasi OVO" },
  { id: "va_bca", name: "Virtual Account BCA", group: "va", hint: "Transfer ke nomor VA" },
  { id: "va_bni", name: "Virtual Account BNI", group: "va", hint: "Transfer ke nomor VA" },
];

export function methodById(id: string): PaymentMethod | undefined {
  return METHODS.find((m) => m.id === id);
}

export type OrderStatus = "pending" | "paid" | "expired";

export type Order = {
  id: string;
  packageId: PackageId;
  methodId: MethodId;
  amount: number;
  status: OrderStatus;
  createdAt: number;
  expiresAt: number;
  paidAt: number | null;
  /** QR payload string (QRIS-shaped for the mock provider) */
  qrPayload: string | null;
  /** Virtual-account number for `va_*` methods */
  vaNumber: string | null;
  /** Deep link for e-wallet methods */
  deeplink: string | null;
};

export type PublicOrder = Omit<Order, "qrPayload"> & {
  qrPayload: string | null;
  qrDataUrl: string | null;
  /** Signed receipt, only present once the order is paid */
  receipt: string | null;
};

export type PaymentProvider = {
  name: string;
  createCharge(input: {
    orderId: string;
    amount: number;
    methodId: MethodId;
  }): Promise<Pick<Order, "qrPayload" | "vaNumber" | "deeplink">>;
  /** Providers with webhooks return null here; the mock settles on a timer. */
  checkStatus(order: Order): Promise<OrderStatus>;
};
