# Photobooth

Web photobooth: bayar dulu (QRIS / e-wallet / virtual account), foto beberapa kali dengan filter realtime, edit hasilnya, lalu cetak otomatis atau unduh PNG.

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

## Pembayaran

Provider bawaan adalah **mock** — tidak ada uang berpindah:

- QR payload dibentuk mengikuti struktur EMVCo/QRIS (`src/lib/payment/qris.ts`), tapi merchant ID-nya dummy jadi tidak bisa dibayar sungguhan.
- Order pending otomatis jadi `paid` setelah `PAYMENT_AUTO_SETTLE_MS`, atau lewat tombol "Simulasi Bayar".
- Nomor VA dan deeplink e-wallet dibuat lokal.

### Ganti ke gateway sungguhan

1. Implement `PaymentProvider` (`src/lib/payment/types.ts`) untuk Midtrans / Xendit / Doku, pakai `src/lib/payment/mock-provider.ts` sebagai contoh.
2. Ganti `mockProvider` di route `src/app/api/orders/`.
3. Hapus route `src/app/api/orders/[id]/simulate/`, ganti dengan webhook gateway yang memverifikasi signature lalu memanggil `settleOrder`.
4. Ganti store in-memory di `src/lib/payment/store.ts` dengan database/Redis — `Map` tidak bertahan melewati cold start serverless dan tidak dibagi antar instance.
5. Set `PAYMENT_SECRET` ke nilai acak; receipt ditandatangani HMAC-SHA256.

## Struktur

```
src/app/api/orders/          buat order, cek status, simulasi bayar
src/components/Checkout.tsx  pilih paket + metode, tampilkan QR/VA, polling
src/components/PhotoBooth.tsx  orkestrasi step bayar → foto → edit
src/components/StripEditor.tsx editor + auto print
src/hooks/useCamera.ts       akses getUserMedia
src/lib/filters.ts           daftar filter & warna frame
src/lib/strip.ts             render strip ke canvas
src/lib/payment/             tipe, provider mock, QRIS builder, store
```

## Deploy

Deploy ke Vercel. Set environment variable `PAYMENT_SECRET` (dan `QRIS_*` bila perlu) di project settings.
