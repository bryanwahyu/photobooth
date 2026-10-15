# Photobooth

Web photobooth: bayar dulu (QRIS / e-wallet / virtual account), foto beberapa kali dengan filter realtime, edit hasilnya, lalu cetak otomatis atau unduh PNG.

Stack: **TanStack Start** (TanStack Router + Vite) dengan TanStack Query untuk polling status order, Tailwind v4.

## Alur

1. **Bayar** — pilih paket (Basic 4 foto / Fun 6 foto / Pro 8 foto), pilih metode, scan QR atau transfer ke VA. Status order di-polling tiap 2 detik.
2. **Foto** — kamera menyala, filter bisa dipilih dari thumbnail preview live, hitung mundur 0/3/5 detik, mode cermin. `Space` untuk mulai sesi.
3. **Edit & cetak** — ganti filter, atur terang/kontras/saturasi/blur, ganti warna frame, layout strip 1 kolom atau grid 2 kolom, caption, stiker (paket Pro, bisa digeser). Auto print jalan sendiri setelah hitungan mundur, atau tekan Cetak Sekarang / Unduh PNG.

Frame disimpan tanpa filter, jadi filter dan penyesuaian masih bisa diubah setelah foto diambil.

## Jalankan

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka http://localhost:3000. Kamera hanya jalan di `localhost` atau HTTPS.

Build produksi menghasilkan server berdiri sendiri:

```bash
npm run build   # → .output/
npm start       # node .output/server/index.mjs
```

## Pembayaran

Provider bawaan adalah **mock** — tidak ada uang berpindah:

- QR payload dibentuk mengikuti struktur EMVCo/QRIS (`src/lib/payment/qris.ts`), tapi merchant ID-nya dummy jadi tidak bisa dibayar sungguhan.
- Order pending otomatis jadi `paid` setelah `PAYMENT_AUTO_SETTLE_MS`, atau lewat tombol "Simulasi Bayar".
- Nomor VA dan deeplink e-wallet dibuat lokal.

### Ganti ke gateway sungguhan

1. Implement `PaymentProvider` (`src/lib/payment/types.ts`) untuk Midtrans / Xendit / Doku, pakai `src/lib/payment/mock-provider.ts` sebagai contoh.
2. Ganti `mockProvider` di `src/routes/api.orders.ts`.
3. Hapus `src/routes/api.orders.$id.simulate.ts`, ganti dengan webhook gateway yang memverifikasi signature lalu memanggil `settleOrder`.
4. Ganti store in-memory di `src/lib/payment/store.ts` dengan database/Redis — `Map` tidak bertahan melewati cold start serverless dan tidak dibagi antar instance.
5. Set `PAYMENT_SECRET` ke nilai acak; receipt ditandatangani HMAC-SHA256.

## Struktur

```
src/router.tsx                 getRouter + QueryClient (wajib bernama router.*)
src/routes/__root.tsx          shell HTML, meta, stylesheet
src/routes/index.tsx           halaman booth
src/routes/api.orders.ts       POST buat order
src/routes/api.orders.$id.ts   GET cek status
src/routes/api.orders.$id.simulate.ts  POST simulasi bayar (demo)
src/components/Checkout.tsx    pilih paket + metode, QR/VA, polling via useQuery
src/components/PhotoBooth.tsx  orkestrasi step bayar → foto → edit
src/components/StripEditor.tsx editor + auto print
src/hooks/useCamera.ts         akses getUserMedia
src/lib/filters.ts             daftar filter & warna frame
src/lib/strip.ts               render strip ke canvas
src/lib/payment/               tipe, provider mock, QRIS builder, store
src/routeTree.gen.ts           digenerate otomatis, jangan diedit
```

Server route memakai `createFileRoute(path)({ server: { handlers: { GET, POST } } })` — nama file memakai titik sebagai pemisah segmen (`api.orders.$id.ts` → `/api/orders/$id`).

## Deploy

**Vercel** — nitro mendeteksi env `VERCEL` dan memakai preset Vercel sendiri. Set environment variable `PAYMENT_SECRET` (dan `QRIS_*` bila perlu) di project settings.

**PC booth (kiosk)** — `npm run build` lalu `npm start`, jalankan Chrome dengan cetak tanpa dialog:

```
chrome.exe --kiosk --kiosk-printing --app=http://localhost:3000
```

Printer tujuan harus jadi default printer Windows; ukuran kertas diatur di driver printer, bukan di aplikasi.
