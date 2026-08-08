export type Filter = {
  id: string;
  label: string;
  css: string;
};

export const FILTERS: Filter[] = [
  { id: "none", label: "Normal", css: "none" },
  { id: "bw", label: "Hitam Putih", css: "grayscale(1) contrast(1.1)" },
  { id: "noir", label: "Noir", css: "grayscale(1) contrast(1.65) brightness(0.9)" },
  { id: "sepia", label: "Sepia", css: "sepia(0.8) saturate(1.2)" },
  {
    id: "vintage",
    label: "Vintage",
    css: "sepia(0.35) contrast(1.15) saturate(1.3) brightness(1.05)",
  },
  { id: "cool", label: "Dingin", css: "saturate(1.3) hue-rotate(-18deg) brightness(1.05)" },
  { id: "warm", label: "Hangat", css: "saturate(1.35) hue-rotate(14deg) brightness(1.06)" },
  { id: "fade", label: "Fade", css: "contrast(0.85) brightness(1.12) saturate(0.7)" },
  { id: "pop", label: "Pop", css: "saturate(1.8) contrast(1.25)" },
  { id: "dream", label: "Dreamy", css: "blur(0.6px) brightness(1.12) saturate(1.25) contrast(0.95)" },
  { id: "invert", label: "Negatif", css: "invert(1) hue-rotate(180deg)" },
  { id: "cyber", label: "Cyber", css: "hue-rotate(220deg) saturate(2) contrast(1.3)" },
];

export const DEFAULT_FILTER = FILTERS[0];

export function filterById(id: string): Filter {
  return FILTERS.find((f) => f.id === id) ?? DEFAULT_FILTER;
}

export const FRAME_COLORS = [
  { id: "white", label: "Putih", value: "#ffffff" },
  { id: "black", label: "Hitam", value: "#111111" },
  { id: "pink", label: "Pink", value: "#ff4d79" },
  { id: "amber", label: "Kuning", value: "#ffd166" },
  { id: "mint", label: "Mint", value: "#5fd0c0" },
  { id: "violet", label: "Ungu", value: "#7c5cff" },
];

export function isDarkHex(hex: string): boolean {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}
