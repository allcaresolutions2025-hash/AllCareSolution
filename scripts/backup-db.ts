import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const prisma = new PrismaClient();

// JSON can't serialise BigInt natively — stringify it.
const replacer = (_k: string, v: unknown) => (typeof v === "bigint" ? v.toString() : v);

(async () => {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const outDir = path.join(os.homedir(), "Desktop", `achtmart-backup-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  // Every base table in the public schema.
  const tables = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
  );

  const manifest: { table: string; rows: number; file: string }[] = [];
  for (const { table_name } of tables) {
    const rows = await prisma.$queryRawUnsafe<unknown[]>(`SELECT * FROM "${table_name}"`);
    const file = `${table_name}.json`;
    fs.writeFileSync(path.join(outDir, file), JSON.stringify(rows, replacer, 2));
    manifest.push({ table: table_name, rows: rows.length, file });
    console.log(`  ${table_name.padEnd(28)} ${rows.length} rows`);
  }

  fs.writeFileSync(
    path.join(outDir, "_manifest.json"),
    JSON.stringify({ exportedAt: new Date().toISOString(), database: "neondb", tables: manifest }, null, 2),
  );

  const totalRows = manifest.reduce((s, m) => s + m.rows, 0);
  console.log(`\n✅ Backed up ${tables.length} tables, ${totalRows} total rows`);
  console.log(`📁 ${outDir}`);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error("BACKUP_ERROR:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
