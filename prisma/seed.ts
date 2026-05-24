import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { customAlphabet } from "nanoid";

const prisma = new PrismaClient();
const generate = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 8);

async function main() {
  console.log("🌱 Seeding ACHT MART…");

  // Admin user
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@achtmart.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMe@2026";
  const adminName = process.env.SEED_ADMIN_NAME || "ACHT MART Admin";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      role: "ADMIN",
      referralCode: generate(),
      agreedToTermsAt: new Date(),
      wallet: { create: {} },
    },
    update: {},
  });
  console.log(`✅ Admin: ${admin.email}  (password: ${adminPassword})`);

  // Default business settings
  const settings: [string, string][] = [
    ["COMMISSION_L1_PERCENT", "20"],
    ["COMMISSION_L2_PERCENT", "5"],
    ["BUYBACK_DAYS", "30"],
    ["TDS_PERCENT", "5"],
    ["TDS_THRESHOLD_INR", "15000"],
    ["GST_DEFAULT_PERCENT", "18"],
    ["SHIPPING_COST_INR", "0"],
  ];
  for (const [key, value] of settings) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }
  console.log("✅ Business settings");

  // Products
  const products: Array<{
    slug: string; name: string; shortDesc: string; description: string;
    ingredients: string; mrp: number; price: number; sku: string; imageUrl: string;
    sortOrder: number;
  }> = [
    {
      slug: "panch-tulsi-drops",
      name: "Panch Tulsi Drops",
      shortDesc: "Concentrated extract of 5 varieties of Tulsi (Holy Basil) for immunity and respiratory health.",
      description: "Panch Tulsi Drops is a powerful Ayurvedic formulation combining five sacred varieties of Tulsi: Rama, Krishna, Vana, Bisva, and Nimbu Tulsi.\n\nKnown traditionally for its immunomodulatory, anti-inflammatory, and respiratory-supporting properties. Each bottle contains 30ml of pure concentrated extract.",
      ingredients: "Ocimum sanctum (Rama Tulsi), Ocimum tenuiflorum (Krishna Tulsi), Ocimum gratissimum (Vana Tulsi), Ocimum canum (Bisva Tulsi), Ocimum citriodorum (Nimbu Tulsi). Base: Glycerine USP.",
      mrp: 129900, price: 100000, sku: "AM-PT-30",
      imageUrl: "https://images.unsplash.com/photo-1611072547810-19a4ae8de24f?w=800",
      sortOrder: 1,
    },
    {
      slug: "moringa-oleifera-drops",
      name: "Moringa Oleifera Drops",
      shortDesc: "Nutrient-rich Moringa leaf extract — natural multivitamin from the 'tree of life'.",
      description: "Moringa Oleifera, often called the 'miracle tree' or 'tree of life', is packed with 90+ nutrients including vitamins A, C, E, calcium, iron, and complete proteins.\n\nOur drops are extracted from organically grown moringa leaves and concentrated for maximum bio-availability. 30ml bottle.",
      ingredients: "Moringa oleifera leaf extract, vegetable glycerine, purified water.",
      mrp: 129900, price: 100000, sku: "AM-MO-30",
      imageUrl: "https://images.unsplash.com/photo-1612203985729-70726954388c?w=800",
      sortOrder: 2,
    },
    {
      slug: "men-oil",
      name: "Men Oil — Ayurvedic Wellness",
      shortDesc: "Traditional Ayurvedic blend supporting men's vitality and overall wellness.",
      description: "A time-tested Ayurvedic blend specifically formulated for men's wellness. Contains classical herbs known in Ayurveda for supporting energy, stamina, and vitality.\n\nNot a medicine — a wellness supplement to be used as part of a healthy lifestyle. Consult your physician before use.",
      ingredients: "Ashwagandha (Withania somnifera), Shilajit, Safed Musli, Kaunch Beej, in a base of refined sesame oil.",
      mrp: 129900, price: 100000, sku: "AM-MN-30",
      imageUrl: "https://images.unsplash.com/photo-1617982440535-c9b5d7d6d8b1?w=800",
      sortOrder: 3,
    },
    {
      slug: "neem-giloy-drops",
      name: "Neem Giloy Drops",
      shortDesc: "Powerful detox and immunity blend of Neem and Giloy (Guduchi).",
      description: "Neem and Giloy are two of Ayurveda's most respected herbs, used for centuries for their detoxifying and immunity-enhancing properties.\n\nThis combination supports natural body cleansing, skin clarity, and a robust immune response. 30ml.",
      ingredients: "Azadirachta indica (Neem leaf extract), Tinospora cordifolia (Giloy stem extract), glycerine, water.",
      mrp: 129900, price: 100000, sku: "AM-NG-30",
      imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800",
      sortOrder: 4,
    },
    {
      slug: "sea-buckthorn",
      name: "Sea Buckthorn Drops",
      shortDesc: "Himalayan superfruit packed with Omega 7, vitamin C, and antioxidants.",
      description: "Sea Buckthorn is one of nature's most nutritionally complete fruits, native to the high Himalayas. Rich in Omega 3, 6, 7, and 9 fatty acids, vitamin C (up to 15x more than oranges), vitamin E, and powerful antioxidants.\n\nSupports skin, eye, and cardiovascular health. 30ml.",
      ingredients: "Cold-pressed Hippophae rhamnoides (Sea Buckthorn) berry oil and leaf extract.",
      mrp: 129900, price: 100000, sku: "AM-SB-30",
      imageUrl: "https://images.unsplash.com/photo-1606143419822-f51a5dec51c1?w=800",
      sortOrder: 5,
    },
    {
      slug: "double-stem-cell-dx-drops",
      name: "Double Stem Cell DX Drops",
      shortDesc: "Plant stem-cell complex from apple and grape — cellular wellness support.",
      description: "Premium plant-based wellness blend combining stem-cell extracts from rare Swiss apple (Malus domestica) and burgundy grape (Vitis vinifera), traditionally used to support cellular vitality and skin health.\n\nNot a medical treatment. 30ml.",
      ingredients: "Malus domestica fruit cell extract, Vitis vinifera fruit cell extract, glycerine, purified water.",
      mrp: 129900, price: 100000, sku: "AM-DS-30",
      imageUrl: "https://images.unsplash.com/photo-1610126819019-fe50862ff95a?w=800",
      sortOrder: 6,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      create: { ...p, stock: 100, gstRate: 18, isActive: true },
      update: {},
    });
  }
  console.log(`✅ ${products.length} products`);

  console.log("\n🎉 Seed complete!\n");
  console.log("Admin login:");
  console.log(`  Email:    ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log("\nPlease change the admin password after first login.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
