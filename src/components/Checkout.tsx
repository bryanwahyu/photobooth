import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  METHODS,
  PACKAGES,
  type MethodId,
  type PackageId,
  type PublicOrder,
} from "@/lib/payment/types";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

const orderKey = (id: string) => ["order", id] as const;

async function readJson(res: Response) {
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Permintaan gagal");
  return data;
}

type Props = {
  onPaid: (info: { packageId: PackageId; orderId: string; receipt: string }) => void;
};

export default function Checkout({ onPaid }: Props) {
  const queryClient = useQueryClient();

  const [packageId, setPackageId] = useState<PackageId>("fun");
  const [methodId, setMethodId] = useState<MethodId>("qris");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const paidRef = useRef(false);

  const pkg = PACKAGES.find((p) => p.id === packageId)!;

  const create = useMutation({
    mutationFn: async (): Promise<PublicOrder> =>
      readJson(
        await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packageId, methodId }),
        }),
      ),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKey(order.id), order);
      setOrderId(order.id);
    },
  });

  /* Status polling: Query stops on its own once the order leaves `pending`. */
  const orderQuery = useQuery({
    queryKey: orderKey(orderId ?? ""),
    enabled: orderId !== null,
    queryFn: async (): Promise<PublicOrder> => readJson(await fetch(`/api/orders/${orderId}`)),
    refetchInterval: (query) => (query.state.data?.status === "pending" ? 2000 : false),
  });

  const simulate = useMutation({
    mutationFn: async (): Promise<PublicOrder> =>
      readJson(await fetch(`/api/orders/${orderId}/simulate`, { method: "POST" })),
    onSuccess: (order) => queryClient.setQueryData(orderKey(order.id), order),
  });

  const order = orderQuery.data ?? null;
  const error = create.error?.message ?? simulate.error?.message ?? null;

  const reset = () => {
    paidRef.current = false;
    setOrderId(null);
    create.reset();
    simulate.reset();
  };

  /* countdown ticker */
  useEffect(() => {
    if (order?.status !== "pending") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [order?.status]);

  /* hand control back once paid */
  useEffect(() => {
    if (order?.status === "paid" && order.receipt && !paidRef.current) {
      paidRef.current = true;
      const receipt = order.receipt;
      const t = window.setTimeout(
        () => onPaid({ packageId: order.packageId, orderId: order.id, receipt }),
        1200,
      );
      return () => window.clearTimeout(t);
    }
  }, [onPaid, order]);

  const remaining = order ? Math.max(0, order.expiresAt - now) : 0;
  const mmss = `${String(Math.floor(remaining / 60000)).padStart(2, "0")}:${String(
    Math.floor((remaining % 60000) / 1000),
  ).padStart(2, "0")}`;

  if (order) {
    return (
      <div className="mx-auto grid w-full max-w-md gap-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-neutral-500">Order {order.id}</p>
          <p className="mt-1 text-3xl font-bold">{rupiah(order.amount)}</p>
          <p className="text-sm text-neutral-400">
            Paket {PACKAGES.find((p) => p.id === order.packageId)?.name} •{" "}
            {METHODS.find((m) => m.id === order.methodId)?.name}
          </p>
        </div>

        {order.status === "paid" ? (
          <div className="grid place-items-center gap-2 rounded-xl border border-emerald-700/60 bg-emerald-900/25 p-6 text-center">
            <span className="text-4xl">✅</span>
            <p className="font-semibold text-emerald-300">Pembayaran berhasil</p>
            <p className="text-xs text-neutral-400">Menyiapkan sesi foto...</p>
          </div>
        ) : order.status === "expired" ? (
          <div className="grid gap-3 rounded-xl border border-red-800/60 bg-red-900/20 p-6 text-center">
            <p className="font-semibold text-red-300">Order kedaluwarsa</p>
            <button
              onClick={reset}
              className="rounded-lg bg-pink-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Buat order baru
            </button>
          </div>
        ) : (
          <>
            {order.qrDataUrl && (
              <div className="grid justify-items-center gap-3">
                <img
                  src={order.qrDataUrl}
                  alt="QR pembayaran"
                  className="w-56 rounded-xl bg-white p-3"
                />
                <p className="text-xs text-neutral-400">
                  Scan QR di aplikasi bank / e-wallet. Kedaluwarsa {mmss}
                </p>
              </div>
            )}

            {order.vaNumber && (
              <div className="grid gap-2 rounded-xl border border-neutral-800 bg-neutral-800/50 p-4 text-center">
                <p className="text-xs uppercase tracking-wider text-neutral-500">
                  Nomor Virtual Account
                </p>
                <p className="font-mono text-xl tracking-wider">{order.vaNumber}</p>
                <button
                  onClick={() => navigator.clipboard?.writeText(order.vaNumber!)}
                  className="mx-auto rounded-lg border border-neutral-700 px-3 py-1 text-xs text-neutral-300"
                >
                  Salin
                </button>
                <p className="text-xs text-neutral-500">Kedaluwarsa {mmss}</p>
              </div>
            )}

            {order.deeplink && (
              <a
                href={order.deeplink}
                className="rounded-lg border border-neutral-700 px-4 py-2 text-center text-sm text-neutral-200"
              >
                Buka aplikasi
              </a>
            )}

            <div className="grid gap-2">
              <p className="text-center text-xs text-neutral-500">
                Menunggu pembayaran... status dicek otomatis tiap 2 detik.
              </p>
              {error && <p className="text-center text-sm text-red-400">{error}</p>}
              <button
                onClick={() => simulate.mutate()}
                disabled={simulate.isPending}
                className="rounded-lg border border-dashed border-amber-500/60 px-4 py-2 text-sm text-amber-300 disabled:opacity-50"
              >
                Simulasi Bayar (demo)
              </button>
              <button
                onClick={reset}
                className="text-xs text-neutral-500 underline underline-offset-2"
              >
                Batal, pilih paket lain
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {PACKAGES.map((p) => (
          <button
            key={p.id}
            onClick={() => setPackageId(p.id)}
            className={`grid gap-2 rounded-2xl border p-5 text-left transition ${
              packageId === p.id
                ? "border-pink-500 bg-pink-500/10"
                : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-600"
            }`}
          >
            <span className="text-sm font-semibold text-neutral-300">{p.name}</span>
            <span className="text-2xl font-bold">{rupiah(p.price)}</span>
            <ul className="grid gap-1 text-xs text-neutral-400">
              {p.perks.map((perk) => (
                <li key={perk}>• {perk}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        <p className="text-xs uppercase tracking-wider text-neutral-500">Metode Pembayaran</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMethodId(m.id)}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                methodId === m.id
                  ? "border-pink-500 bg-pink-500/10"
                  : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-600"
              }`}
            >
              <span>
                <span className="block text-sm font-semibold">{m.name}</span>
                <span className="block text-xs text-neutral-500">{m.hint}</span>
              </span>
              <span className="text-lg">
                {m.group === "va" ? "🏦" : m.group === "qr" ? "🔳" : "📱"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-center text-sm text-red-400">{error}</p>}

      <button
        onClick={() => create.mutate()}
        disabled={create.isPending}
        className="mx-auto w-full max-w-sm rounded-xl bg-pink-500 px-6 py-3.5 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
      >
        {create.isPending ? "Membuat order..." : `Bayar ${rupiah(pkg.price)}`}
      </button>

      <p className="text-center text-xs text-neutral-600">
        Mode demo: tidak ada uang berpindah. QR & VA dibuat provider mock.
      </p>
    </div>
  );
}
