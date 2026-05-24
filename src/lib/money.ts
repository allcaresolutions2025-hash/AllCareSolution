// Money helpers — all internal storage is paise (Int). Display layer shows points.
// Points are an abstract loyalty unit, NOT money. 1 internal paise-unit = 1 point
// (i.e. a product stored as 100,000 paise displays as "1,00,000 pts"). No INR
// conversion is implied for the customer-facing surface.

export const PAISE_PER_RUPEE = 100;
export const PAISE_PER_POINT = 1;

export function toPaise(rupees: number | string): number {
  const n = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (!isFinite(n)) return 0;
  return Math.round(n * PAISE_PER_RUPEE);
}

export function toRupees(paise: number): number {
  return paise / PAISE_PER_RUPEE;
}

export function paiseToPoints(paise: number): number {
  return paise / PAISE_PER_POINT;
}

export function pointsToPaise(points: number | string): number {
  const n = typeof points === "string" ? parseFloat(points) : points;
  if (!isFinite(n)) return 0;
  return Math.round(n * PAISE_PER_POINT);
}

export function formatPoints(paise: number, opts: { showLabel?: boolean } = {}): string {
  const { showLabel = true } = opts;
  const points = paise / PAISE_PER_POINT;
  const formatted = points.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return showLabel ? `${formatted} pts` : formatted;
}

export function formatPointsCompact(paise: number): string {
  const points = paise / PAISE_PER_POINT;
  if (points >= 10000000) return `${(points / 10000000).toFixed(2)} Cr pts`;
  if (points >= 100000) return `${(points / 100000).toFixed(2)} L pts`;
  if (points >= 1000) return `${(points / 1000).toFixed(1)}K pts`;
  return formatPoints(paise);
}

// Back-compat aliases — callers still importing formatINR/formatINRCompact get points output.
export const formatINR = (paise: number, opts: { showSymbol?: boolean } = {}) =>
  formatPoints(paise, { showLabel: opts.showSymbol ?? true });
export const formatINRCompact = formatPointsCompact;
