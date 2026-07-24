/**
 * Adds Tamil + Hindi names to the existing Wellness products so the shop's
 * per-member language switch works for them too (English stays the fallback).
 *
 * Idempotent: updates by SKU. Run:  npx tsx scripts/translate-wellness.ts
 * (or: npm run db:translate-wellness)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TRANSLATIONS: { sku: string; nameTa: string; nameHi: string }[] = [
  { sku: "Promax",   nameTa: "புரோமேக்ஸ் வீட்டு பொருட்கள்", nameHi: "प्रोमैक्स होम प्रोडक्ट्स" },
  { sku: "AM-PT-30", nameTa: "பஞ்ச் துளசி டிராப்ஸ்",        nameHi: "पंच तुलसी ड्रॉप्स" },
  { sku: "AM-MO-30", nameTa: "முருங்கை (மொரிங்கா) டிராப்ஸ்", nameHi: "मोरिंगा (सहजन) ड्रॉप्स" },
  { sku: "AM-MN-30", nameTa: "ஆண்கள் எண்ணெய் — ஆயுர்வேத ஆரோக்கியம்", nameHi: "मेन ऑयल — आयुर्वेदिक वेलनेस" },
  { sku: "AM-NG-30", nameTa: "வேம்பு கிலோய் டிராப்ஸ்",      nameHi: "नीम गिलोय ड्रॉप्स" },
  { sku: "AM-SB-30", nameTa: "சீ பக்தார்ன் டிராப்ஸ்",        nameHi: "सी बकथॉर्न ड्रॉप्स" },
  { sku: "AM-DS-30", nameTa: "டபுள் ஸ்டெம் செல் DX டிராப்ஸ்", nameHi: "डबल स्टेम सेल DX ड्रॉप्स" },
];

async function main() {
  let updated = 0;
  for (const t of TRANSLATIONS) {
    const res = await prisma.product.updateMany({
      where: { sku: t.sku },
      data: { nameTa: t.nameTa, nameHi: t.nameHi },
    });
    if (res.count === 0) console.warn(`No product found for sku ${t.sku}`);
    updated += res.count;
  }
  console.log(`Translated ${updated} wellness products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
