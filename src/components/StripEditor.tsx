import { useCallback, useEffect, useRef, useState } from "react";
import { FILTERS, FRAME_COLORS, filterById } from "@/lib/filters";
import type { PackageId } from "@/lib/payment/types";
import {
  DEFAULT_ADJUSTMENTS,
  renderStrip,
  type Adjustments,
  type Layout,
  type Sticker,
} from "@/lib/strip";

const STICKER_SET = ["✨", "❤️", "😎", "🎉", "🌈", "⭐", "🔥", "🌸", "🐣", "💫", "🎀", "☕"];
const AUTO_PRINT_DELAY = 6;

type Props = {
  shots: HTMLCanvasElement[];
  initialFilterId: string;
  packageId: PackageId;
  orderId: string;
  onRetake: () => void;
  onNewSession: () => void;
};

export default function StripEditor({
  shots,
  initialFilterId,
  packageId,
  orderId,
  onRetake,
  onNewSession,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const [filterId, setFilterId] = useState(initialFilterId);
  const [adjust, setAdjust] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const [frame, setFrame] = useState(FRAME_COLORS[0].value);
  const [layout, setLayout] = useState<Layout>("strip");
  const [caption, setCaption] = useState("Photobooth");
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [printUrl, setPrintUrl] = useState<string | null>(null);
  const [autoPrint, setAutoPrint] = useState(packageId !== "basic");
  const [autoCountdown, setAutoCountdown] = useState<number | null>(
    packageId !== "basic" ? AUTO_PRINT_DELAY : null,
  );
  const stickerSeq = useRef(0);

  const canSticker = packageId === "pro";
  const dateLabel = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderStrip(canvas, {
      shots,
      layout,
      frame,
      caption,
      filterCss: filterById(filterId).css,
      adjustments: adjust,
      stickers,
      watermark: false,
      dateLabel,
    });
  }, [adjust, caption, dateLabel, filterId, frame, layout, shots, stickers]);

  useEffect(() => {
    draw();
  }, [draw]);

  /* --- printing --- */

  const openPrint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setPrintUrl(canvas.toDataURL("image/png"));
    // let the print-only <img> commit to the DOM before the dialog opens
    window.setTimeout(() => window.print(), 250);
  }, []);

  useEffect(() => {
    if (autoCountdown === null) return;
    const id = window.setTimeout(() => {
      if (autoCountdown <= 1) {
        setAutoCountdown(null);
        openPrint();
      } else {
        setAutoCountdown(autoCountdown - 1);
      }
    }, 1000);
    return () => window.clearTimeout(id);
  }, [autoCountdown, openPrint]);

  const toggleAutoPrint = (on: boolean) => {
    setAutoPrint(on);
    setAutoCountdown(on ? AUTO_PRINT_DELAY : null);
  };

  /* --- sticker drag --- */

  const canvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!stickers.length) return;
    const p = canvasPoint(e);
    const hit = [...stickers]
      .reverse()
      .find((s) => Math.hypot((s.x - p.x) * 1.2, s.y - p.y) < 0.045);
    if (!hit) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id: hit.id, dx: p.x - hit.x, dy: p.y - hit.y };
    setSelected(hit.id);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = canvasPoint(e);
    setStickers((prev) =>
      prev.map((s) =>
        s.id === drag.id
          ? {
              ...s,
              x: Math.min(0.98, Math.max(0.02, p.x - drag.dx)),
              y: Math.min(0.98, Math.max(0.02, p.y - drag.dy)),
            }
          : s,
      ),
    );
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const addSticker = (emoji: string) => {
    const id = `${emoji}-${stickerSeq.current++}`;
    setStickers((prev) => [...prev, { id, emoji, x: 0.5, y: 0.5, size: 96 }]);
    setSelected(id);
  };

  const resizeSelected = (size: number) => {
    setStickers((prev) => prev.map((s) => (s.id === selected ? { ...s, size } : s)));
  };

  const removeSelected = () => {
    setStickers((prev) => prev.filter((s) => s.id !== selected));
    setSelected(null);
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `photobooth-${orderId}.png`;
    a.click();
  };

  const selectedSticker = stickers.find((s) => s.id === selected) ?? null;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,1fr)] print:hidden">
        <div className="grid content-start justify-items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="max-h-[62vh] max-w-full touch-none rounded-lg shadow-2xl shadow-black/50"
          />
          {stickers.length > 0 && (
            <p className="text-xs text-neutral-500">Geser stiker langsung di gambar.</p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={download}
              className="rounded-lg bg-pink-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Unduh PNG
            </button>
            <button
              onClick={openPrint}
              className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500"
            >
              Cetak Sekarang
            </button>
            <button
              onClick={onRetake}
              className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm text-neutral-300 transition hover:border-neutral-500"
            >
              Foto Ulang
            </button>
            <button
              onClick={onNewSession}
              className="rounded-lg border border-neutral-800 px-5 py-2.5 text-sm text-neutral-500 transition hover:border-neutral-600"
            >
              Sesi Baru
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={autoPrint}
              onChange={(e) => toggleAutoPrint(e.target.checked)}
              className="h-4 w-4 accent-pink-500"
            />
            Auto print
            {autoCountdown !== null && (
              <span className="text-amber-300">— cetak dalam {autoCountdown}s</span>
            )}
          </label>
        </div>

        <aside className="grid h-fit gap-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
          <section className="grid gap-2">
            <p className="text-xs uppercase tracking-wider text-neutral-500">Filter</p>
            <div className="grid grid-cols-3 gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterId(f.id)}
                  className={`rounded-lg border px-2 py-1.5 text-xs transition ${
                    filterId === f.id
                      ? "border-pink-500 bg-pink-500/10 text-white"
                      : "border-neutral-800 text-neutral-400 hover:border-neutral-600"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-3">
            <p className="text-xs uppercase tracking-wider text-neutral-500">Penyesuaian</p>
            <Slider
              label="Terang"
              value={adjust.brightness}
              min={50}
              max={160}
              onChange={(v) => setAdjust((a) => ({ ...a, brightness: v }))}
            />
            <Slider
              label="Kontras"
              value={adjust.contrast}
              min={50}
              max={180}
              onChange={(v) => setAdjust((a) => ({ ...a, contrast: v }))}
            />
            <Slider
              label="Saturasi"
              value={adjust.saturate}
              min={0}
              max={220}
              onChange={(v) => setAdjust((a) => ({ ...a, saturate: v }))}
            />
            <Slider
              label="Blur"
              value={adjust.blur}
              min={0}
              max={6}
              step={0.2}
              unit="px"
              onChange={(v) => setAdjust((a) => ({ ...a, blur: v }))}
            />
            <button
              onClick={() => setAdjust(DEFAULT_ADJUSTMENTS)}
              className="justify-self-start text-xs text-neutral-500 underline underline-offset-2"
            >
              Reset penyesuaian
            </button>
          </section>

          <section className="grid gap-2">
            <p className="text-xs uppercase tracking-wider text-neutral-500">Frame & Layout</p>
            <div className="flex flex-wrap gap-2">
              {FRAME_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFrame(c.value)}
                  aria-label={c.label}
                  title={c.label}
                  style={{ background: c.value }}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    frame === c.value ? "scale-110 border-amber-300" : "border-transparent"
                  }`}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["strip", "grid"] as Layout[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLayout(l)}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    layout === l
                      ? "border-pink-500 bg-pink-500/10 text-white"
                      : "border-neutral-800 text-neutral-400 hover:border-neutral-600"
                  }`}
                >
                  {l === "strip" ? `Strip 1×${shots.length}` : "Grid 2 kolom"}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-2">
            <label htmlFor="caption" className="text-xs uppercase tracking-wider text-neutral-500">
              Caption
            </label>
            <input
              id="caption"
              value={caption}
              maxLength={24}
              onChange={(e) => setCaption(e.target.value)}
              className="rounded-lg border border-neutral-800 bg-neutral-800/60 px-3 py-2 text-sm outline-none focus:border-pink-500"
            />
          </section>

          <section className="grid gap-2">
            <p className="text-xs uppercase tracking-wider text-neutral-500">
              Stiker {!canSticker && <span className="text-neutral-600">(paket Pro)</span>}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STICKER_SET.map((emoji) => (
                <button
                  key={emoji}
                  disabled={!canSticker}
                  onClick={() => addSticker(emoji)}
                  className="rounded-lg border border-neutral-800 px-2.5 py-1.5 text-lg transition hover:border-pink-500 disabled:opacity-35"
                >
                  {emoji}
                </button>
              ))}
            </div>
            {selectedSticker && (
              <div className="grid gap-2 rounded-lg border border-neutral-800 bg-neutral-800/40 p-3">
                <Slider
                  label={`Ukuran ${selectedSticker.emoji}`}
                  value={selectedSticker.size}
                  min={40}
                  max={220}
                  onChange={resizeSelected}
                />
                <button
                  onClick={removeSelected}
                  className="justify-self-start text-xs text-red-400 underline underline-offset-2"
                >
                  Hapus stiker
                </button>
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* print-only sheet */}
      <div id="print-area" className="hidden print:block">
        {printUrl && <img src={printUrl} alt="Photobooth strip" />}
      </div>
    </>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="grid gap-1 text-xs text-neutral-400">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="text-neutral-500">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-pink-500"
      />
    </label>
  );
}
