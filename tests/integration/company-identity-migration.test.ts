import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { expect, it } from "vitest";
import { openTestDatabase } from "../helpers/test-database";

it("upgrades legacy jobs without name matching and preserves shared logo provenance", async () => {
  const connection = await openTestDatabase();
  const schema = `upgrade_${randomUUID().replaceAll("-", "")}`;
  try {
    await connection.db.transaction(async (tx) => {
      await tx.execute(sql.raw(`CREATE SCHEMA "${schema}"`));
      await tx.execute(sql.raw(`SET LOCAL search_path TO "${schema}"`));
      const files = (await readdir("db/migrations")).filter((f) => f.endsWith(".sql")).sort();
      const apply = async (file: string) => {
        const source = (await readFile(`db/migrations/${file}`, "utf8")).replaceAll(
          '"public".',
          `"${schema}".`,
        );
        for (const statement of source.split("--> statement-breakpoint"))
          if (statement.trim()) await tx.execute(sql.raw(statement));
      };
      for (const file of files.filter((f) => f < "0011")) await apply(file);
      const profile = randomUUID(),
        company = randomUUID();
      const a = randomUUID(),
        b = randomUUID(),
        c = randomUUID(),
        d = randomUUID();
      await tx.execute(
        sql`INSERT INTO profiles(id,display_name) VALUES (${profile},'Alex Example')`,
      );
      await tx.execute(
        sql`INSERT INTO companies(id,profile_id,name) VALUES (${company},${profile},'Shared company')`,
      );
      await tx.execute(sql`INSERT INTO jobs(id,profile_id,title,company_name,company_id,raw_description,logo_storage_key,logo_content_type,updated_at) VALUES
    (${a},${profile},'First','Legacy name',${company},'Work','logos/older-12345678.png','image/png','2026-01-01'),
    (${b},${profile},'Second','Another old name',${company},'Work','logos/newest-12345678.png','image/png','2026-02-01'),
    (${c},${profile},'Third','Same name',NULL,'Work','logos/unlinked-12345678.png','image/png','2026-01-01'),
    (${d},${profile},'Fourth','Same name',NULL,'Work',NULL,NULL,'2026-01-01')`);
      await apply(files.find((f) => f.startsWith("0011"))!);
      const rows = (
        await tx.execute(
          sql`SELECT j.id, j.company_id, c.name, c.logo_storage_key FROM jobs j JOIN companies c ON j.company_id=c.id ORDER BY j.title`,
        )
      ).rows;
      expect(rows).toHaveLength(4);
      const byId = new Map(rows.map((r) => [r.id, r]));
      expect(byId.get(a)).toMatchObject({
        company_id: company,
        name: "Shared company",
        logo_storage_key: "logos/newest-12345678.png",
      });
      expect(byId.get(b)?.company_id).toBe(company);
      expect(byId.get(c)).toMatchObject({
        name: "Same name",
        logo_storage_key: "logos/unlinked-12345678.png",
      });
      expect(byId.get(c)?.company_id).not.toBe(byId.get(d)?.company_id);
      expect(
        (
          await tx.execute(
            sql`SELECT column_name FROM information_schema.columns WHERE table_schema=${schema} AND table_name='jobs' AND column_name IN ('company_name','logo_storage_key','logo_content_type')`,
          )
        ).rows,
      ).toHaveLength(0);
      await tx.execute(sql.raw(`DROP SCHEMA "${schema}" CASCADE`));
    });
  } finally {
    await connection.close();
  }
});
