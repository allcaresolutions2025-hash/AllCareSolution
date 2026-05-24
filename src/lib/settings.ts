import { prisma } from "./db";

// Settings layer: env defaults, overridable via Setting table (admin-managed).
// We cache reads in-memory per request to avoid hammering the DB.

type SettingKey =
  | "COMMISSION_L1_PERCENT"
  | "COMMISSION_L2_PERCENT"
  | "BUYBACK_DAYS"
  | "TDS_PERCENT"
  | "TDS_THRESHOLD_INR"
  | "GST_DEFAULT_PERCENT"
  | "SHIPPING_COST_INR";

const ENV_DEFAULTS: Record<SettingKey, string> = {
  COMMISSION_L1_PERCENT: process.env.COMMISSION_L1_PERCENT ?? "20",
  COMMISSION_L2_PERCENT: process.env.COMMISSION_L2_PERCENT ?? "5",
  BUYBACK_DAYS: process.env.BUYBACK_DAYS ?? "30",
  TDS_PERCENT: process.env.TDS_PERCENT ?? "5",
  TDS_THRESHOLD_INR: process.env.TDS_THRESHOLD_INR ?? "15000",
  GST_DEFAULT_PERCENT: process.env.GST_DEFAULT_PERCENT ?? "18",
  SHIPPING_COST_INR: process.env.SHIPPING_COST_INR ?? "0",
};

export async function getSetting(key: SettingKey): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key } });
  const raw = row?.value ?? ENV_DEFAULTS[key];
  const n = parseFloat(raw);
  return isFinite(n) ? n : 0;
}

export async function setSetting(key: SettingKey, value: string | number) {
  await prisma.setting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });
}

export async function getAllBusinessSettings() {
  const keys: SettingKey[] = [
    "COMMISSION_L1_PERCENT",
    "COMMISSION_L2_PERCENT",
    "BUYBACK_DAYS",
    "TDS_PERCENT",
    "TDS_THRESHOLD_INR",
    "GST_DEFAULT_PERCENT",
    "SHIPPING_COST_INR",
  ];
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(
    keys.map((k) => [k, parseFloat(map[k] ?? ENV_DEFAULTS[k])])
  ) as Record<SettingKey, number>;
}
