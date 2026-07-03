import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { CourierSender } from "./courier";

export type CourierRecipient = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  code: string; // member referral code
};

export type CourierOrder = {
  consignmentNo: string;
  date: string; // pre-formatted
  contents: string; // e.g. "Welcome Kit"
  qty: string;
  weight: string;
  declaredValue: string;
  payment: string; // e.g. "Prepaid"
};

// Brand palette
const GREEN = rgb(0.09, 0.44, 0.29);
const GREEN_SOFT = rgb(0.9, 0.96, 0.93);
const INK = rgb(0.11, 0.13, 0.12);
const MUTED = rgb(0.42, 0.46, 0.44);
const LINE = rgb(0.78, 0.82, 0.8);
const LABEL_BG = rgb(0.96, 0.97, 0.965);

// A4 portrait
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 40; // outer margin

export async function buildCourierSlipPdf(input: {
  sender: CourierSender;
  recipient: CourierRecipient;
  order: CourierOrder;
}): Promise<Uint8Array> {
  const { sender, recipient, order } = input;
  const doc = await PDFDocument.create();
  doc.setTitle(`Courier Slip ${order.consignmentNo}`);
  doc.setProducer("ACHT MART");
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const innerW = PAGE_W - 2 * M;
  // Outer frame
  page.drawRectangle({ x: M, y: M, width: innerW, height: PAGE_H - 2 * M, borderColor: LINE, borderWidth: 1 });

  let y = PAGE_H - M; // top edge of content, we work downward

  // ---- Header band -------------------------------------------------------
  const headerH = 74;
  page.drawRectangle({ x: M, y: y - headerH, width: innerW, height: headerH, color: GREEN_SOFT });
  // Logo badge (circle with initials)
  const badgeR = 22;
  const badgeCx = M + 20 + badgeR;
  const badgeCy = y - headerH / 2;
  page.drawCircle({ x: badgeCx, y: badgeCy, size: badgeR, color: GREEN });
  const initials = initialsOf(sender.company);
  drawCentered(page, initials, badgeCx, badgeCy - 6, bold, 16, rgb(1, 1, 1));
  // Company name + tagline
  const nameX = badgeCx + badgeR + 14;
  page.drawText(sender.company, { x: nameX, y: y - 34, size: 20, font: bold, color: GREEN });
  if (sender.tagline) {
    page.drawText(sender.tagline, { x: nameX, y: y - 50, size: 9, font, color: MUTED });
  }
  // Doc title (right aligned)
  drawRight(page, "COURIER CONSIGNMENT NOTE", M + innerW - 16, y - 30, bold, 12, INK);
  drawRight(page, "Delivery / Shipping Slip", M + innerW - 16, y - 46, font, 9, MUTED);
  y -= headerH;

  // ---- Meta row (consignment / date / ref / service) ---------------------
  const metaH = 42;
  const metaY = y - metaH;
  page.drawRectangle({ x: M, y: metaY, width: innerW, height: metaH, color: LABEL_BG });
  const metaCols = [
    { label: "Consignment No.", value: order.consignmentNo },
    { label: "Date", value: order.date },
    { label: "Reference", value: recipient.code },
    { label: "Payment", value: order.payment },
  ];
  const colW = innerW / metaCols.length;
  metaCols.forEach((c, i) => {
    const cx = M + i * colW + 12;
    if (i > 0) page.drawLine({ start: { x: M + i * colW, y: metaY }, end: { x: M + i * colW, y }, thickness: 0.5, color: LINE });
    page.drawText(c.label.toUpperCase(), { x: cx, y: y - 15, size: 7, font: bold, color: MUTED });
    page.drawText(c.value || "—", { x: cx, y: y - 30, size: 11, font: bold, color: INK });
  });
  y = metaY;

  // ---- FROM / TO boxes ----------------------------------------------------
  y -= 16;
  const boxH = 150;
  const gap = 14;
  const boxW = (innerW - gap) / 2;
  const fromX = M;
  const toX = M + boxW + gap;
  const boxTop = y;

  // FROM box
  drawAddressBox(page, {
    x: fromX,
    top: boxTop,
    w: boxW,
    h: boxH,
    heading: "FROM (SENDER)",
    name: sender.company,
    lines: compact([
      sender.line1,
      sender.line2,
      joinComma([sender.city, sender.state, sender.pincode]),
    ]),
    phone: sender.phone,
    extra: compact([sender.email, sender.gstin ? `GSTIN: ${sender.gstin}` : ""]),
    font,
    bold,
    accent: false,
  });

  // TO box (accented — the important one for the courier)
  drawAddressBox(page, {
    x: toX,
    top: boxTop,
    w: boxW,
    h: boxH,
    heading: "TO (DELIVER TO)",
    name: recipient.name,
    lines: compact([
      recipient.line1,
      recipient.line2,
      joinComma([recipient.city, recipient.state]),
      recipient.pincode ? `PIN: ${recipient.pincode}` : "",
    ]),
    phone: recipient.phone,
    extra: compact([recipient.code ? `Member ID: ${recipient.code}` : ""]),
    font,
    bold,
    accent: true,
  });
  y = boxTop - boxH;

  // ---- Shipment details table --------------------------------------------
  y -= 20;
  page.drawText("SHIPMENT DETAILS", { x: M, y: y, size: 9, font: bold, color: GREEN });
  y -= 8;
  const tableTop = y;
  const rowH = 26;
  const cols = [
    { key: "Contents", w: 0.4, value: order.contents },
    { key: "Qty", w: 0.15, value: order.qty },
    { key: "Weight", w: 0.2, value: order.weight },
    { key: "Declared Value", w: 0.25, value: order.declaredValue },
  ];
  // header row
  page.drawRectangle({ x: M, y: tableTop - rowH, width: innerW, height: rowH, color: LABEL_BG });
  let cx = M;
  cols.forEach((c) => {
    const w = innerW * c.w;
    page.drawText(c.key.toUpperCase(), { x: cx + 8, y: tableTop - 17, size: 7.5, font: bold, color: MUTED });
    cx += w;
  });
  // value row
  const valTop = tableTop - rowH;
  page.drawRectangle({ x: M, y: valTop - rowH, width: innerW, height: rowH, borderColor: LINE, borderWidth: 0.5 });
  cx = M;
  cols.forEach((c, i) => {
    const w = innerW * c.w;
    if (i > 0) page.drawLine({ start: { x: cx, y: valTop - rowH }, end: { x: cx, y: tableTop }, thickness: 0.5, color: LINE });
    page.drawText(c.value || "—", { x: cx + 8, y: valTop - 17, size: 10, font, color: INK });
    cx += w;
  });
  // outer border for whole table
  page.drawRectangle({ x: M, y: valTop - rowH, width: innerW, height: rowH * 2, borderColor: LINE, borderWidth: 0.75 });
  y = valTop - rowH;

  // ---- Handling note ------------------------------------------------------
  y -= 24;
  page.drawText("HANDLING INSTRUCTIONS", { x: M, y, size: 8, font: bold, color: MUTED });
  y -= 14;
  page.drawText(
    "Handle with care. Do not deliver if the outer packaging is tampered or damaged.",
    { x: M, y, size: 9, font, color: INK },
  );

  // ---- Signature area (anchored just above the footer) --------------------
  const sigY = M + 110;
  const sigW = (innerW - gap) / 2;
  drawSignature(page, M, sigY, sigW, "Sender's Signature", font);
  drawSignature(page, M + sigW + gap, sigY, sigW, "Receiver's Signature & Date", font);

  // ---- Footer -------------------------------------------------------------
  const footY = M + 16;
  page.drawLine({ start: { x: M, y: footY + 14 }, end: { x: M + innerW, y: footY + 14 }, thickness: 0.5, color: LINE });
  const footParts = compact([
    sender.company,
    joinComma([sender.city, sender.state, sender.pincode]),
    sender.phone ? `Ph: ${sender.phone}` : "",
  ]).join("  |  ");
  page.drawText(footParts, { x: M, y: footY, size: 7.5, font, color: MUTED });
  drawRight(page, "Computer-generated courier slip — no signature of issuer required.", M + innerW, footY, font, 7, MUTED);

  return doc.save();
}

// ---- helpers --------------------------------------------------------------

function drawAddressBox(
  page: PDFPage,
  o: {
    x: number; top: number; w: number; h: number;
    heading: string; name: string; lines: string[]; phone: string; extra: string[];
    font: PDFFont; bold: PDFFont; accent: boolean;
  },
) {
  const { x, top, w, h, heading, name, lines, phone, extra, font, bold, accent } = o;
  const bottom = top - h;
  page.drawRectangle({ x, y: bottom, width: w, height: h, borderColor: accent ? GREEN : LINE, borderWidth: accent ? 1.25 : 0.75 });
  // heading strip
  const stripH = 20;
  page.drawRectangle({ x, y: top - stripH, width: w, height: stripH, color: accent ? GREEN : LABEL_BG });
  page.drawText(heading, { x: x + 10, y: top - 14, size: 8.5, font: bold, color: accent ? rgb(1, 1, 1) : MUTED });

  let ty = top - stripH - 18;
  page.drawText(clip(name, font, 13, w - 20), { x: x + 10, y: ty, size: 13, font: bold, color: INK });
  ty -= 16;
  for (const ln of lines) {
    if (!ln) continue;
    page.drawText(clip(ln, font, 10, w - 20), { x: x + 10, y: ty, size: 10, font, color: INK });
    ty -= 14;
  }
  if (phone) {
    page.drawText(`Phone: ${phone}`, { x: x + 10, y: ty, size: 10, font: bold, color: INK });
    ty -= 14;
  }
  for (const ex of extra) {
    if (!ex) continue;
    page.drawText(clip(ex, font, 9, w - 20), { x: x + 10, y: ty, size: 9, font, color: MUTED });
    ty -= 12;
  }
}

function drawSignature(page: PDFPage, x: number, y: number, w: number, label: string, font: PDFFont) {
  page.drawLine({ start: { x, y }, end: { x: x + w, y }, thickness: 0.75, color: LINE });
  page.drawText(label, { x, y: y - 12, size: 8, font, color: MUTED });
}

function drawCentered(page: PDFPage, text: string, cx: number, y: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: cx - w / 2, y, size, font, color });
}

function drawRight(page: PDFPage, text: string, rightX: number, y: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightX - w, y, size, font, color });
}

// Truncate a string with an ellipsis so it fits maxWidth at the given size.
function clip(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t + "…", size) > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

function compact(arr: string[]): string[] {
  return arr.map((s) => (s ?? "").trim()).filter(Boolean);
}

function joinComma(arr: string[]): string {
  return compact(arr).join(", ");
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
