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
const INK = rgb(0.11, 0.13, 0.12);
const MUTED = rgb(0.42, 0.46, 0.44);
const LINE = rgb(0.78, 0.82, 0.8);
const LABEL_BG = rgb(0.96, 0.97, 0.965);

// Small shipping label sized for small packages. Width is fixed (~A6 width) and
// the height is computed to hug the content, so there's no wasted paper.
const PAGE_W = 297.64;
const M = 14; // outer margin
const GAP = 10; // gap between blocks

export async function buildCourierSlipPdf(input: {
  sender: CourierSender;
  recipient: CourierRecipient;
  order: CourierOrder;
}): Promise<Uint8Array> {
  const { sender, recipient, order } = input;
  const doc = await PDFDocument.create();
  doc.setTitle(`Courier Slip ${order.consignmentNo}`);
  doc.setProducer("ACHT MART");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const innerW = PAGE_W - 2 * M;

  // Build both blocks first so we can size the page height to the content.
  const fromLines = boxContentLines(
    {
      name: sender.company,
      lines: compact([sender.line1, sender.line2, joinComma([sender.city, sender.state, sender.pincode])]),
      phone: sender.phone,
      extra: [],
    },
    font, bold, innerW, 12,
  );
  const toLines = boxContentLines(
    {
      name: recipient.name,
      lines: compact([
        recipient.line1,
        recipient.line2,
        joinComma([recipient.city, recipient.state]),
        recipient.pincode ? `PIN: ${recipient.pincode}` : "",
      ]),
      phone: recipient.phone,
      extra: [],
    },
    font, bold, innerW, 15, // larger recipient name for readability
  );
  const fromH = boxHeight(fromLines);
  const toH = boxHeight(toLines);

  // Minimal order details (bottom; not essential on the package itself).
  const detail1 = compact([order.consignmentNo ? `No. ${order.consignmentNo}` : "", order.date]).join("   ");
  const detail2 = compact([
    order.contents ? `${order.contents}${order.qty ? ` x${order.qty}` : ""}` : "",
    recipient.code ? `Ref: ${recipient.code}` : "",
    order.payment,
  ]).join("   ");
  const detailsH = 10 + (detail1 ? 11 : 0) + (detail2 ? 11 : 0) + 4; // separator + lines + pad

  const contentH = fromH + GAP + toH + GAP + detailsH;
  const pageH = Math.round(M + contentH + M);
  const page = doc.addPage([PAGE_W, pageH]);

  // Outer frame around the whole label.
  page.drawRectangle({ x: M, y: M, width: innerW, height: pageH - 2 * M, borderColor: LINE, borderWidth: 1 });

  let y = pageH - M; // top edge; work downward.

  // FROM block (top) — sender = the company, kept compact.
  drawBox(page, M, y, innerW, fromH, "FROM", false, fromLines, bold);
  y -= fromH + GAP;

  // TO block (below, accented — the part the courier actually reads).
  drawBox(page, M, y, innerW, toH, "TO / DELIVER TO", true, toLines, bold);
  y -= toH + GAP;

  // Details strip.
  page.drawLine({ start: { x: M, y }, end: { x: M + innerW, y }, thickness: 0.5, color: LINE });
  y -= 11;
  if (detail1) { page.drawText(detail1, { x: M, y, size: 8, font, color: MUTED }); y -= 11; }
  if (detail2) { page.drawText(detail2, { x: M, y, size: 8, font, color: MUTED }); }

  return doc.save();
}

// ---- helpers --------------------------------------------------------------

type RLine = { text: string; font: PDFFont; size: number; color: ReturnType<typeof rgb>; lh: number };

const BOX_STRIP_H = 15;
const BOX_TOP_PAD = 12;
const BOX_BOT_PAD = 9;

// Turn a box's logical content into wrapped, styled render-lines so the full
// address is shown across multiple lines instead of being truncated. `nameSize`
// sets the recipient/company name size (the TO box uses a larger one).
function boxContentLines(
  o: { name: string; lines: string[]; phone: string; extra: string[] },
  font: PDFFont,
  bold: PDFFont,
  boxW: number,
  nameSize = 12,
): RLine[] {
  const maxW = boxW - 16;
  const out: RLine[] = [];
  out.push({ text: clip(o.name, bold, nameSize, maxW), font: bold, size: nameSize, color: INK, lh: nameSize + 3 });
  for (const ln of o.lines)
    for (const s of wrapText(spaceCommas(ln), font, 9.5, maxW))
      out.push({ text: s, font, size: 9.5, color: INK, lh: 12.5 });
  if (o.phone) out.push({ text: `Phone: ${o.phone}`, font: bold, size: 9.5, color: INK, lh: 13 });
  for (const ex of o.extra)
    for (const s of wrapText(spaceCommas(ex), font, 8.5, maxW))
      out.push({ text: s, font, size: 8.5, color: MUTED, lh: 11 });
  return out;
}

function boxHeight(lines: RLine[]): number {
  const body = lines.reduce((a, l) => a + l.lh, 0);
  return BOX_STRIP_H + BOX_TOP_PAD + body + BOX_BOT_PAD;
}

function drawBox(
  page: PDFPage,
  x: number,
  top: number,
  w: number,
  h: number,
  heading: string,
  accent: boolean,
  lines: RLine[],
  bold: PDFFont,
) {
  const bottom = top - h;
  page.drawRectangle({ x, y: bottom, width: w, height: h, borderColor: accent ? GREEN : LINE, borderWidth: accent ? 1.5 : 0.75 });
  page.drawRectangle({ x, y: top - BOX_STRIP_H, width: w, height: BOX_STRIP_H, color: accent ? GREEN : LABEL_BG });
  page.drawText(heading, { x: x + 8, y: top - 10.5, size: 8, font: bold, color: accent ? rgb(1, 1, 1) : MUTED });
  let ty = top - BOX_STRIP_H - BOX_TOP_PAD;
  for (const ln of lines) {
    page.drawText(ln.text, { x: x + 8, y: ty, size: ln.size, font: ln.font, color: ln.color });
    ty -= ln.lh;
  }
}

// Word-wrap to fit maxWidth; hard-breaks a single word that is itself too long.
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const norm = text.replace(/\s+/g, " ").trim();
  if (!norm) return [];
  const lines: string[] = [];
  let cur = "";
  for (const word of norm.split(" ")) {
    const attempt = cur ? `${cur} ${word}` : word;
    if (font.widthOfTextAtSize(attempt, size) <= maxWidth) {
      cur = attempt;
      continue;
    }
    if (cur) lines.push(cur);
    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      // Break an over-long token character by character.
      let chunk = "";
      for (const ch of word) {
        if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
          if (chunk) lines.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      cur = chunk;
    } else {
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Ensure a readable space after each comma so run-together addresses like
// "Das,tiyuliya,Bareilly" wrap at natural word boundaries.
function spaceCommas(s: string): string {
  return s.replace(/\s*,\s*/g, ", ");
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
