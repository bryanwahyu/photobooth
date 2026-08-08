import { isDarkHex } from "./filters";

export type Layout = "strip" | "grid";

export type Adjustments = {
  brightness: number;
  contrast: number;
  saturate: number;
  blur: number;
};

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  blur: 0,
};

export type Sticker = {
  id: string;
  emoji: string;
  /** 0..1 relative to strip width/height so stickers survive re-layout */
  x: number;
  y: number;
  size: number;
};

export type StripOptions = {
  shots: HTMLCanvasElement[];
  layout: Layout;
  frame: string;
  caption: string;
  filterCss: string;
  adjustments: Adjustments;
  stickers: Sticker[];
  watermark: boolean;
  dateLabel: string;
};

const SHOT_W = 720;
const SHOT_H = 540;
const PAD = 28;
const GAP = 18;
const FOOTER = 100;

export function adjustmentCss(a: Adjustments): string {
  const parts: string[] = [];
  if (a.brightness !== 100) parts.push(`brightness(${a.brightness}%)`);
  if (a.contrast !== 100) parts.push(`contrast(${a.contrast}%)`);
  if (a.saturate !== 100) parts.push(`saturate(${a.saturate}%)`);
  if (a.blur > 0) parts.push(`blur(${a.blur}px)`);
  return parts.join(" ");
}

export function combineFilters(filterCss: string, a: Adjustments): string {
  const base = filterCss === "none" ? "" : filterCss;
  const combined = [base, adjustmentCss(a)].filter(Boolean).join(" ");
  return combined || "none";
}

export function stripSize(count: number, layout: Layout) {
  const cols = layout === "grid" ? 2 : 1;
  const rows = Math.ceil(count / cols);
  const cellW = layout === "grid" ? SHOT_W / 2 : SHOT_W;
  const cellH = layout === "grid" ? SHOT_H / 2 : SHOT_H;
  return {
    cols,
    rows,
    cellW,
    cellH,
    width: PAD * 2 + cellW * cols + GAP * (cols - 1),
    height: PAD + (cellH + GAP) * rows - GAP + FOOTER,
  };
}

export function renderStrip(canvas: HTMLCanvasElement, opts: StripOptions) {
  const { shots, layout, frame, caption, stickers, watermark, dateLabel } = opts;
  if (!shots.length) return;

  const { cols, cellW, cellH, width, height } = stripSize(shots.length, layout);
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = frame;
  ctx.fillRect(0, 0, width, height);

  const filter = combineFilters(opts.filterCss, opts.adjustments);
  shots.forEach((shot, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    ctx.save();
    ctx.filter = filter;
    ctx.drawImage(shot, PAD + col * (cellW + GAP), PAD + row * (cellH + GAP), cellW, cellH);
    ctx.restore();
  });

  const textColor = isDarkHex(frame) ? "#ffffff" : "#111111";
  const baseY = height - FOOTER + 46;
  ctx.textAlign = "center";
  ctx.fillStyle = textColor;
  ctx.font = "600 34px system-ui, sans-serif";
  ctx.fillText(caption.trim() || "Photobooth", width / 2, baseY);

  ctx.globalAlpha = 0.65;
  ctx.font = "400 22px system-ui, sans-serif";
  ctx.fillText(dateLabel, width / 2, baseY + 32);
  ctx.globalAlpha = 1;

  stickers.forEach((s) => {
    ctx.font = `${s.size}px system-ui, "Apple Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.emoji, s.x * width, s.y * height);
  });
  ctx.textBaseline = "alphabetic";

  if (watermark) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#000";
    ctx.font = "700 44px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 8);
    for (let y = -height; y < height; y += 140) {
      ctx.fillText("PREVIEW • BELUM DIBAYAR", 0, y);
    }
    ctx.restore();
  }
}
