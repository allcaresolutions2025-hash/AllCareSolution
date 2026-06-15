import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "./db";

// Settings layer: env defaults, overridable via Setting table (admin-managed).
// Reads are cached on Vercel's data layer for 5 minutes (or until setSetting
// invalidates the tag). Admin changes propagate immediately on the next req.

const SETTINGS_CACHE_TAG = "business-settings";

type SettingKey =
  | "COMMISSION_L1_PERCENT"
  | "COMMISSION_L2_PERCENT"
  | "BUYBACK_DAYS"
  | "TDS_PERCENT"
  | "TDS_THRESHOLD_INR"
  | "GST_DEFAULT_PERCENT"
  | "SHIPPING_COST_INR"
  | "PIN_PRICE_INR";

const ENV_DEFAULTS: Record<SettingKey, string> = {
  COMMISSION_L1_PERCENT: process.env.COMMISSION_L1_PERCENT ?? "20",
  COMMISSION_L2_PERCENT: process.env.COMMISSION_L2_PERCENT ?? "5",
  BUYBACK_DAYS: process.env.BUYBACK_DAYS ?? "30",
  TDS_PERCENT: process.env.TDS_PERCENT ?? "5",
  TDS_THRESHOLD_INR: process.env.TDS_THRESHOLD_INR ?? "15000",
  GST_DEFAULT_PERCENT: process.env.GST_DEFAULT_PERCENT ?? "18",
  SHIPPING_COST_INR: process.env.SHIPPING_COST_INR ?? "0",
  PIN_PRICE_INR: process.env.PIN_PRICE_INR ?? "1000",
};

async function readAllSettings(): Promise<Record<SettingKey, number>> {
  const keys: SettingKey[] = [
    "COMMISSION_L1_PERCENT",
    "COMMISSION_L2_PERCENT",
    "BUYBACK_DAYS",
    "TDS_PERCENT",
    "TDS_THRESHOLD_INR",
    "GST_DEFAULT_PERCENT",
    "SHIPPING_COST_INR",
    "PIN_PRICE_INR",
  ];
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(
    keys.map((k) => [k, parseFloat(map[k] ?? ENV_DEFAULTS[k])])
  ) as Record<SettingKey, number>;
}

export const getAllBusinessSettings = unstable_cache(
  readAllSettings,
  ["business-settings"],
  { revalidate: 300, tags: [SETTINGS_CACHE_TAG] },
);

export async function getSetting(key: SettingKey): Promise<number> {
  const all = await getAllBusinessSettings();
  return all[key];
}

export async function setSetting(key: SettingKey, value: string | number) {
  await prisma.setting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });
  revalidateTag(SETTINGS_CACHE_TAG);
}
