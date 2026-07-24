/**
 * Seeds the Groceries catalog (~80 items) from the supplied Tamil price list,
 * with English (default), Tamil and Hindi names for per-member localization.
 *
 * Idempotent: upserts by SKU (GRC-0001…), so re-running updates in place.
 * Run:  npx tsx scripts/seed-groceries.ts   (or: npm run db:seed-groceries)
 *
 * Notes / defaults (see plan): GST 5%, MRP = price, stock 100, placeholder
 * image, prices treated as GST-inclusive paise. Coriander powder priced at the
 * low end of its ₹40–₹70 range. Update prices/images later as needed.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Neutral self-contained placeholder (data URI) so no external image is needed.
const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#f1f5f4"/><text x="50%" y="50%" font-family="sans-serif" font-size="20" fill="#0f766e" text-anchor="middle" dominant-baseline="middle">ACHT MART</text></svg>`,
  );

type Item = { en: string; ta: string; hi: string; price: number; pack: string };
type Group = { sub: string; items: Item[] };

const RUPEE = (r: number) => r * 100; // rupees → paise

const GROUPS: Group[] = [
  {
    sub: "Masala Powders",
    items: [
      { en: "Turmeric Powder", ta: "மஞ்சள் தூள்", hi: "हल्दी पाउडर", price: 40, pack: "50 g" },
      { en: "Sambar Powder", ta: "சாம்பார் தூள்", hi: "सांबार पाउडर", price: 50, pack: "50 g" },
      { en: "Garam Masala Powder", ta: "கரம் மசாலா தூள்", hi: "गरम मसाला पाउडर", price: 60, pack: "50 g" },
      { en: "Biryani Masala Powder", ta: "பிரியாணி மசாலா தூள்", hi: "बिरयानी मसाला पाउडर", price: 60, pack: "50 g" },
      { en: "Kurma Masala Powder", ta: "குருமா மசாலா தூள்", hi: "कुरमा मसाला पाउडर", price: 60, pack: "50 g" },
      { en: "Home-style Kuzhambu Powder", ta: "வீட்டு குழம்பு பொடி", hi: "घर का कुज़म्बू पाउडर", price: 60, pack: "50 g" },
      { en: "Pepper Rasam Powder", ta: "மிளகு ரசப் பொடி", hi: "काली मिर्च रसम पाउडर", price: 50, pack: "50 g" },
      { en: "Fenugreek Rasam Powder", ta: "வெந்தய ரசப் பொடி", hi: "मेथी रसम पाउडर", price: 50, pack: "50 g" },
      { en: "Coriander Powder", ta: "மல்லி தூள்", hi: "धनिया पाउडर", price: 40, pack: "50 g" },
      { en: "Chilli Powder", ta: "சனி மிளகாய் பொடி", hi: "मिर्च पाउडर", price: 50, pack: "50 g" },
      { en: "Poriyal Powder", ta: "பொரியல் பொடி", hi: "पोरियल पाउडर", price: 50, pack: "50 g" },
      { en: "Chicken Masala Powder", ta: "சிக்கன் மசாலா பொடி", hi: "चिकन मसाला पाउडर", price: 70, pack: "50 g" },
      { en: "Chicken 65 Masala Powder", ta: "சிக்கன் 65 மசாலா பொடி", hi: "चिकन 65 मसाला पाउडर", price: 70, pack: "50 g" },
    ],
  },
  {
    sub: "Millet Flours & Mixes",
    items: [
      { en: "Millet Health Flour (Sathu Maavu)", ta: "சிறுதானிய சத்து மாவு", hi: "मिलेट सत्तू आटा", price: 90, pack: "100 g" },
      { en: "Millet Puttu Flour", ta: "சிறுதானிய புட்டு மாவு", hi: "मिलेट पुट्टू आटा", price: 70, pack: "100 g" },
      { en: "Pearl Millet Flour Mix", ta: "கம்பு மாவு மிக்ஸ்", hi: "बाजरा आटा मिक्स", price: 60, pack: "100 g" },
      { en: "Pearl Millet Dosa Flour Mix", ta: "கம்பு தோசை மாவு மிக்ஸ்", hi: "बाजरा डोसा आटा मिक्स", price: 70, pack: "100 g" },
      { en: "Ragi Flour Mix", ta: "கேப்பை மாவு மிக்ஸ்", hi: "रागी आटा मिक्स", price: 60, pack: "100 g" },
      { en: "Ragi Dosa Flour Mix", ta: "கேப்பை தோசை மாவு மிக்ஸ்", hi: "रागी डोसा आटा मिक्स", price: 70, pack: "100 g" },
      { en: "Black Kavuni Rice Mix", ta: "கருப்பு கவுனி மிக்ஸ்", hi: "काला कवुनी चावल मिक्स", price: 100, pack: "100 g" },
      { en: "Black Kavuni Puttu Mix", ta: "கருப்பு கவுனி புட்டு மிக்ஸ்", hi: "काला कवुनी पुट्टू मिक्स", price: 110, pack: "100 g" },
      { en: "Black Urad Kali Mix", ta: "கருப்பு உளுந்தங்கழி", hi: "काली उड़द कली मिक्स", price: 90, pack: "100 g" },
      { en: "Black Urad Milk Powder", ta: "கருப்பு உளுந்து பால் பொடி", hi: "काली उड़द दूध पाउडर", price: 100, pack: "100 g" },
      { en: "Mappillai Samba Rice Mix", ta: "மாப்பிள்ளை சம்பா மிக்ஸ்", hi: "माप्पिळ्ळै सांबा मिक्स", price: 90, pack: "100 g" },
      { en: "Mappillai Samba Dosa Mix", ta: "மாப்பிள்ளை தோசை மிக்ஸ்", hi: "माप्पिळ्ळै डोसा मिक्स", price: 80, pack: "100 g" },
      { en: "Mullu Murungai Kanji Mix", ta: "முள்ளும் முருங்கை கஞ்சி மிக்ஸ்", hi: "मुल्लु मुरुंगै कांजी मिक्स", price: 100, pack: "100 g" },
      { en: "Mullu Murungai Dosa Mix", ta: "முள்ளும் முருங்கை தோசை மிக்ஸ்", hi: "मुल्लु मुरुंगै डोसा मिक्स", price: 90, pack: "100 g" },
      { en: "Horse Gram Kanji Dosa Mix", ta: "கொள்ளு கஞ்சி தோசை மிக்ஸ்", hi: "कुल्थी कांजी डोसा मिक्स", price: 80, pack: "100 g" },
      { en: "Horse Gram Kanji", ta: "கொள்ளு கஞ்சி", hi: "कुल्थी कांजी", price: 70, pack: "100 g" },
    ],
  },
  {
    sub: "Herbal Podis",
    items: [
      { en: "Vallarai (Brahmi) Powder", ta: "வல்லாரை பொடி", hi: "वल्लारै (ब्राह्मी) पाउडर", price: 70, pack: "50 g" },
      { en: "Moringa Leaf Powder", ta: "முருங்கை பொடி", hi: "मोरिंगा पत्ता पाउडर", price: 70, pack: "50 g" },
      { en: "Pirandai Powder", ta: "பிரண்டை பொடி", hi: "पिरंडै पाउडर", price: 70, pack: "50 g" },
      { en: "Multi-Greens Powder", ta: "மல்டி கீரை பொடி", hi: "मल्टी साग पाउडर", price: 70, pack: "50 g" },
      { en: "Mudakathan Powder", ta: "முடக்கத்தான் பொடி", hi: "मुडक्कत्तान पाउडर", price: 70, pack: "50 g" },
      { en: "Banana Flower Powder", ta: "வாழைப்பூ பொடி", hi: "केले के फूल का पाउडर", price: 70, pack: "50 g" },
      { en: "Lentil (Paruppu) Podi", ta: "பருப்பு பொடி", hi: "दाल पोडी", price: 50, pack: "50 g" },
      { en: "Sesame (Ellu) Podi", ta: "எள்ளு பொடி", hi: "तिल पोडी", price: 60, pack: "50 g" },
      { en: "Mudavattukkal Powder", ta: "முடவாட்டுக்கால் பொடி", hi: "मुडवाट्टुक्काल पाउडर", price: 70, pack: "50 g" },
      { en: "Curry Leaf Powder", ta: "கருவேப்பிலை பொடி", hi: "करी पत्ता पाउडर", price: 50, pack: "50 g" },
      { en: "Mullu Murungai Powder", ta: "முள்ளும் முருங்கை பொடி", hi: "मुल्लु मुरुंगै पाउडर", price: 70, pack: "50 g" },
      { en: "Banana Stem Idli Podi", ta: "வாழைத்தண்டு இட்லி பொடி", hi: "केले तने इडली पोडी", price: 70, pack: "50 g" },
    ],
  },
  {
    sub: "Malts",
    items: [
      { en: "ABC Malt (Apple-Beetroot-Carrot)", ta: "ABC மால்ட்", hi: "ABC माल्ट", price: 100, pack: "50 g" },
      { en: "Beetroot Malt", ta: "பீட்ரூட் மால்ட்", hi: "चुकंदर माल्ट", price: 90, pack: "50 g" },
      { en: "Red Banana Malt", ta: "ரெட் பனானா மால்ட்", hi: "लाल केला माल्ट", price: 100, pack: "50 g" },
      { en: "Banana Malt", ta: "பனானா மால்ட்", hi: "केला माल्ट", price: 90, pack: "50 g" },
      { en: "Ragi Sago Malt", ta: "ராகி சாகோ மால்ட்", hi: "रागी साबूदाना माल्ट", price: 80, pack: "50 g" },
      { en: "Pearl Millet Sago Malt", ta: "கம்பு சாகோ மால்ட்", hi: "बाजरा साबूदाना माल्ट", price: 80, pack: "50 g" },
      { en: "Foxtail Millet Sago Malt", ta: "சினை சாகோ மால்ட்", hi: "कंगनी साबूदाना माल्ट", price: 90, pack: "50 g" },
      { en: "White Poha Malt", ta: "வெள்ளை அவல் மால்ட்", hi: "सफेद पोहा माल्ट", price: 80, pack: "50 g" },
      { en: "Red Poha Malt", ta: "சிவப்பு அவல் மால்ட்", hi: "लाल पोहा माल्ट", price: 90, pack: "50 g" },
      { en: "Banana Flower Malt", ta: "வாழைப்பூ மால்ட்", hi: "केले फूल माल्ट", price: 100, pack: "50 g" },
      { en: "Protein Powder", ta: "புரோட்டீன் பவுடர்", hi: "प्रोटीन पाउडर", price: 120, pack: "50 g" },
    ],
  },
  {
    sub: "Herbal Mixes",
    items: [
      { en: "Guava Leaf Mix", ta: "கொய்யா இலை மிக்ஸ்", hi: "अमरूद पत्ता मिक्स", price: 80, pack: "50 g" },
      { en: "Gooseberry (Amla) Powder Mix", ta: "நெல்லிக்காய் பவுடர் மிக்ஸ்", hi: "आंवला पाउडर मिक्स", price: 90, pack: "50 g" },
      { en: "Moringa Powder Mix", ta: "முருங்கை பொடி மிக்ஸ்", hi: "मोरिंगा पाउडर मिक्स", price: 80, pack: "50 g" },
      { en: "Curry Leaf Powder Mix", ta: "கருவேப்பிலை பொடி மிக்ஸ்", hi: "करी पत्ता पाउडर मिक्स", price: 80, pack: "50 g" },
      { en: "Mudakathan Soup Mix", ta: "முடக்கத்தான் சூப் மிக்ஸ்", hi: "मुडक्कत्तान सूप मिक्स", price: 100, pack: "50 g" },
      { en: "Mudavattukkal Soup Mix", ta: "முடவாட்டுக்கால் சூப் மிக்ஸ்", hi: "मुडवाट्टुक्काल सूप मिक्स", price: 120, pack: "50 g" },
      { en: "Pirandai Soup Mix", ta: "பிரண்டை சூப் மிக்ஸ்", hi: "पिरंडै सूप मिक्स", price: 100, pack: "50 g" },
      { en: "Honey Gooseberry Mix", ta: "தேன்நெல்லி மிக்ஸ்", hi: "शहद आंवला मिक्स", price: 120, pack: "50 g" },
      { en: "Rose Gulkand Mix", ta: "ரோஜா குல்கந்து மிக்ஸ்", hi: "गुलाब गुलकंद मिक्स", price: 140, pack: "50 g" },
    ],
  },
  {
    sub: "Tiffin Mixes",
    items: [
      { en: "Medu Vada Mix", ta: "மெதுவடை மிக்ஸ்", hi: "मेदु वड़ा मिक्स", price: 80, pack: "50 g" },
      { en: "Pongal Mix", ta: "பொங்கல் மிக்ஸ்", hi: "पोंगल मिक्स", price: 80, pack: "50 g" },
      { en: "Paruthi Paal Mix", ta: "பருத்திப்பால் மிக்ஸ்", hi: "परुत्ति पाल मिक्स", price: 100, pack: "50 g" },
      { en: "Sweet Pongal Mix", ta: "சர்க்கரை பொங்கல் மிக்ஸ்", hi: "मीठा पोंगल मिक्स", price: 100, pack: "50 g" },
      { en: "Paniyaram Mix", ta: "பனியாரம் மிக்ஸ்", hi: "पनियारम मिक्स", price: 90, pack: "50 g" },
      { en: "Appam Flour Mix", ta: "ஆப்பம் மாவு மிக்ஸ்", hi: "अप्पम आटा मिक्स", price: 80, pack: "50 g" },
      { en: "Fenugreek Kali Mix", ta: "வெந்தய களி மிக்ஸ்", hi: "मेथी कली मिक्स", price: 100, pack: "50 g" },
      { en: "Foxtail Millet Laddu Mix", ta: "சினை லட்டு மிக்ஸ்", hi: "कंगनी लड्डू मिक्स", price: 100, pack: "50 g" },
      { en: "Black Urad Kali Koottu Mix", ta: "கருப்பு உளுந்த களி கூட்டு மிக்ஸ்", hi: "काली उड़द कली कूट्टू मिक्स", price: 120, pack: "50 g" },
      { en: "Curry Leaf Koottu Mix", ta: "கருவேப்பிலை கூட்டு மிக்ஸ்", hi: "करी पत्ता कूट्टू मिक्स", price: 90, pack: "50 g" },
      { en: "Moringa Greens Mix", ta: "முருங்கை இலைக்கீரை மிக்ஸ்", hi: "मोरिंगा साग मिक्स", price: 100, pack: "50 g" },
      { en: "Mappillai Samba Laddu Mix", ta: "மாப்பிள்ளை சம்பா லட்டு மிக்ஸ்", hi: "माप्पिळ्ळै सांबा लड्डू मिक्स", price: 120, pack: "50 g" },
      { en: "Ragi Koottu Mix", ta: "கேப்பை கூட்டு மிக்ஸ்", hi: "रागी कूट्टू मिक्स", price: 80, pack: "50 g" },
      { en: "Pearl Millet Laddu Mix", ta: "கம்பு லட்டு மிக்ஸ்", hi: "बाजरा लड्डू मिक्स", price: 100, pack: "50 g" },
    ],
  },
  {
    sub: "Others",
    items: [
      { en: "Nalangu Maavu (Herbal Bath Powder)", ta: "நலங்கு மாவு", hi: "नलंगु स्नान पाउडर", price: 60, pack: "50 g" },
      { en: "Shikakai Powder", ta: "சியக்காய் தூள்", hi: "शिकाकाई पाउडर", price: 60, pack: "50 g" },
      { en: "Garlic Pepper Kuzhambu", ta: "பூண்டு மிளகு குழம்பு", hi: "लहसुन काली मिर्च कुज़म्बू", price: 70, pack: "50 g" },
      { en: "Dry Fish Thokku (Karuvadu)", ta: "கருவாடு தொக்கு", hi: "सूखी मछली थोक्कू", price: 100, pack: "50 g" },
      { en: "Lemon Pickle", ta: "எலுமிச்சை ஊறுகாய்", hi: "नींबू का अचार", price: 60, pack: "50 g" },
    ],
  },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  let seq = 0;
  let created = 0;
  for (const group of GROUPS) {
    for (const it of group.items) {
      seq += 1;
      const sku = `GRC-${String(seq).padStart(4, "0")}`;
      const price = RUPEE(it.price);
      await prisma.product.upsert({
        where: { sku },
        create: {
          slug: `${slugify(it.en)}-${sku.toLowerCase()}`,
          name: it.en,
          nameTa: it.ta,
          nameHi: it.hi,
          category: "GROCERIES",
          subCategory: group.sub,
          shortDesc: `${it.pack} pack`,
          description: `${it.en} — ${it.pack} pack.`,
          mrp: price,
          price,
          stock: 100,
          sku,
          imageUrl: PLACEHOLDER,
          gstRate: 5,
          isActive: true,
          sortOrder: seq,
        },
        update: {
          name: it.en,
          nameTa: it.ta,
          nameHi: it.hi,
          category: "GROCERIES",
          subCategory: group.sub,
          shortDesc: `${it.pack} pack`,
          mrp: price,
          price,
          gstRate: 5,
          sortOrder: seq,
        },
      });
      created += 1;
    }
  }
  console.log(`Seeded ${created} grocery products across ${GROUPS.length} sub-categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
