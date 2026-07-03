import { prisma } from "./db";

// Company "sender" (FROM) details printed on the courier slip. Stored as plain
// key/value rows in the Setting table and edited by admin from the Rewards page.
// These are strings, so they live outside the numeric settings layer in
// lib/settings.ts and are read/written directly here.

export type CourierSender = {
  company: string;
  tagline: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
};

// key in Setting table -> field on CourierSender
const KEYS: Record<keyof CourierSender, string> = {
  company: "COURIER_SENDER_COMPANY",
  tagline: "COURIER_SENDER_TAGLINE",
  line1: "COURIER_SENDER_LINE1",
  line2: "COURIER_SENDER_LINE2",
  city: "COURIER_SENDER_CITY",
  state: "COURIER_SENDER_STATE",
  pincode: "COURIER_SENDER_PINCODE",
  phone: "COURIER_SENDER_PHONE",
  email: "COURIER_SENDER_EMAIL",
  gstin: "COURIER_SENDER_GSTIN",
};

const DEFAULTS: CourierSender = {
  company: "ACHT MART",
  tagline: "Pure · Natural · Authentic",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  email: "",
  gstin: "",
};

export async function getCourierSender(): Promise<CourierSender> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: Object.values(KEYS) } },
    select: { key: true, value: true },
  });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const out = { ...DEFAULTS };
  (Object.keys(KEYS) as (keyof CourierSender)[]).forEach((field) => {
    const v = byKey.get(KEYS[field]);
    if (v != null && v !== "") out[field] = v;
  });
  return out;
}

export async function setCourierSender(partial: Partial<CourierSender>): Promise<void> {
  const fields = Object.keys(partial) as (keyof CourierSender)[];
  await prisma.$transaction(
    fields.map((field) =>
      prisma.setting.upsert({
        where: { key: KEYS[field] },
        update: { value: String(partial[field] ?? "") },
        create: { key: KEYS[field], value: String(partial[field] ?? "") },
      }),
    ),
  );
}
