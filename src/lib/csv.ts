// Tiny CSV builder — no deps. Output is UTF-8 with a BOM so Excel renders ₹ /
// non-ASCII correctly, and quotes any cell containing comma, quote or newline.

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return rows.map((r) => r.map(escape).join(",")).join("\r\n");
}

export function csvResponse(filename: string, csv: string): Response {
  const bom = "﻿";
  return new Response(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
