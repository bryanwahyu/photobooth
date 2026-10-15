import { useCallback, useEffect, useRef, useState } from "react";
import Checkout from "@/components/Checkout";
import StripEditor from "@/components/StripEditor";
import { useCamera } from "@/hooks/useCamera";
import { FILTERS, filterById } from "@/lib/filters";
import { packageById, type PackageId } from "@/lib/payment/types";

const SHOT_W = 720;
const SHOT_H = 540;

type Step = "checkout" | "capture" | "edit";

type Session = {
  packageId: PackageId;
  orderId: string;
  receipt: string;
  shots: number;
};

export default function PhotoBooth() {
  const { videoRef, status, error, start } = useCamera();

  const [step, setStep] = useState<Step>("checkout");
  const [session, setSession] = useState<Session | null>(null);

  const shotsRef = useRef<HTMLCanvasElement[]>([]);
  const [captured, setCaptured] = useState<HTMLCanvasElement[]>([]);
  const [captureFilterId, setCaptureFilterId] = useState(FILTERS[0].id);
  const [mirror, setMirror] = useState(true);
  const [delay, setDelay] = useState(3);

  const [countdown, setCountdown] = useState<number | null>(null);
  const [shotIndex, setShotIndex] = useState(0);
  const [flash, setFlash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewStill, setPreviewStill] = useState<string | null>(null);

  const filterCss = filterById(captureFilterId).css;
  const ready = status === "ready";
  const totalShots = session?.shots ?? 4;

  const handlePaid = useCallback(
    (info: { packageId: PackageId; orderId: string; receipt: string }) => {
      const pkg = packageById(info.packageId);
      setSession({ ...info, shots: pkg?.shots ?? 4 });
      setStep("capture");
    },
    [],
  );

  /* start the camera as soon as we reach the capture step */
  useEffect(() => {
    if (step === "capture" && status === "idle") void start();
  }, [start, status, step]);

  /* still frame powering the filter picker thumbnails */
  useEffect(() => {
    if (!ready || step !== "capture") return;
    const snap = () => {
      const video = videoRef.current;
      if (!video?.videoWidth) return;
      const c = document.createElement("canvas");
      c.width = 160;
      c.height = 120;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, c.width, c.height);
      setPreviewStill(c.toDataURL("image/jpeg", 0.6));
    };
    snap();
    const id = window.setInterval(snap, 4000);
    return () => window.clearInterval(id);
  }, [ready, step, videoRef]);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /** Frames are stored unfiltered so the editor can change the look afterwards. */
  const grabFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = SHOT_W;
    canvas.height = SHOT_H;
    const ctx = canvas.getContext("2d");
    if (!video || !ctx) return canvas;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    // center-crop the source to 4:3 so nothing gets stretched
    const targetRatio = SHOT_W / SHOT_H;
    const srcRatio = vw / vh;
    let sw = vw;
    let sh = vh;
    if (srcRatio > targetRatio) sw = vh * targetRatio;
    else sh = vw / targetRatio;
    const sx = (vw - sw) / 2;
    const sy = (vh - sh) / 2;

    if (mirror) {
      ctx.translate(SHOT_W, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, SHOT_W, SHOT_H);
    return canvas;
  }, [mirror, videoRef]);

  const runSession = useCallback(async () => {
    if (busy || !ready) return;
    setBusy(true);
    shotsRef.current = [];

    for (let i = 0; i < totalShots; i++) {
      setShotIndex(i + 1);
      const wait = i === 0 ? delay : Math.max(delay, 1);
      for (let n = wait; n > 0; n--) {
        setCountdown(n);
        await sleep(1000);
      }
      setCountdown(null);

      setFlash(true);
      shotsRef.current.push(grabFrame());
      await sleep(200);
      setFlash(false);
      await sleep(500);
    }

    setShotIndex(0);
    setCaptured(shotsRef.current);
    setBusy(false);
    setStep("edit");
  }, [busy, delay, grabFrame, ready, totalShots]);

  useEffect(() => {
    if (step !== "capture") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && ready && !busy) {
        e.preventDefault();
        void runSession();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, ready, runSession, step]);

  const restart = () => {
    shotsRef.current = [];
    setCaptured([]);
    setStep("capture");
  };

  const newSession = () => {
    shotsRef.current = [];
    setCaptured([]);
    setSession(null);
    setStep("checkout");
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 lg:py-12">
      <header className="text-center print:hidden">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">📸 Photobooth</h1>
        <p className="mt-2 text-sm text-neutral-400">
          {step === "checkout"
            ? "Pilih paket, bayar via QRIS / e-wallet / VA, lalu mulai foto."
            : step === "capture"
              ? `Sesi ${totalShots} foto. Tekan Space untuk mulai.`
              : "Edit hasilmu, cetak, atau unduh."}
        </p>
        <StepBar step={step} />
      </header>

      {step === "checkout" && <Checkout onPaid={handlePaid} />}

      {step === "capture" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
          <div className="grid gap-4">
            <div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-neutral-800 bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
                style={{ filter: filterCss, transform: mirror ? "scaleX(-1)" : undefined }}
              />

              {flash && <div className="pointer-events-none absolute inset-0 animate-flash bg-white" />}

              {countdown !== null && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/25 text-[clamp(72px,16vw,150px)] font-extrabold text-white drop-shadow-2xl">
                  {countdown}
                </div>
              )}

              {busy && shotIndex > 0 && (
                <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs tracking-wide text-white">
                  Foto {shotIndex} / {totalShots}
                </div>
              )}

              {!ready && (
                <div className="absolute inset-0 grid place-content-center justify-items-center gap-4 bg-neutral-950/92 p-6 text-center">
                  <p className="max-w-xs text-sm text-neutral-300">
                    {error ??
                      (status === "starting" ? "Menyalakan kamera..." : "Izinkan akses kamera untuk mulai.")}
                  </p>
                  <button
                    onClick={() => void start()}
                    disabled={status === "starting"}
                    className="rounded-lg bg-pink-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                  >
                    Nyalakan Kamera
                  </button>
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-neutral-500">Filter</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setCaptureFilterId(f.id)}
                    className={`shrink-0 overflow-hidden rounded-xl border transition ${
                      captureFilterId === f.id
                        ? "border-pink-500 ring-2 ring-pink-500/40"
                        : "border-neutral-800 hover:border-neutral-600"
                    }`}
                  >
                    <div className="h-14 w-20 bg-neutral-800">
                      {previewStill && (
                        <img
                          src={previewStill}
                          alt={f.label}
                          className="h-full w-full object-cover"
                          style={{ filter: f.css, transform: mirror ? "scaleX(-1)" : undefined }}
                        />
                      )}
                    </div>
                    <span className="block px-2 py-1 text-[11px] text-neutral-300">{f.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-neutral-600">Filter masih bisa diganti setelah foto, di halaman edit.</p>
            </div>
          </div>

          <aside className="grid h-fit gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
            <div className="rounded-lg border border-neutral-800 bg-neutral-800/40 px-3 py-2 text-xs text-neutral-400">
              Order <span className="font-mono text-neutral-200">{session?.orderId}</span> · lunas ·{" "}
              {totalShots} foto
            </div>

            <div className="grid gap-2">
              <label htmlFor="delay" className="text-xs uppercase tracking-wider text-neutral-500">
                Hitung Mundur
              </label>
              <select
                id="delay"
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
                className="rounded-lg border border-neutral-800 bg-neutral-800/60 px-3 py-2 text-sm outline-none focus:border-pink-500"
              >
                <option value={0}>Tanpa jeda</option>
                <option value={3}>3 detik</option>
                <option value={5}>5 detik</option>
              </select>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={mirror}
                onChange={(e) => setMirror(e.target.checked)}
                className="h-4 w-4 accent-pink-500"
              />
              Mode cermin
            </label>

            <button
              onClick={() => void runSession()}
              disabled={!ready || busy}
              className="rounded-xl bg-pink-500 px-4 py-3.5 text-base font-semibold text-white transition hover:brightness-110 disabled:opacity-45"
            >
              {busy ? "Sedang memotret..." : `Mulai Sesi (${totalShots} foto)`}
            </button>
          </aside>
        </div>
      )}

      {step === "edit" && session && (
        <StripEditor
          shots={captured}
          initialFilterId={captureFilterId}
          packageId={session.packageId}
          orderId={session.orderId}
          onRetake={restart}
          onNewSession={newSession}
        />
      )}
    </div>
  );
}

function StepBar({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "checkout", label: "1. Bayar" },
    { id: "capture", label: "2. Foto" },
    { id: "edit", label: "3. Edit & Cetak" },
  ];
  return (
    <div className="mt-4 flex justify-center gap-2 text-xs">
      {steps.map((s) => (
        <span
          key={s.id}
          className={`rounded-full border px-3 py-1 ${
            step === s.id
              ? "border-pink-500 bg-pink-500/15 text-pink-200"
              : "border-neutral-800 text-neutral-500"
          }`}
        >
          {s.label}
        </span>
      ))}
    </div>
  );
}
