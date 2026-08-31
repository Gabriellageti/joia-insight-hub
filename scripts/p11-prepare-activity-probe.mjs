import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
const probe = readFileSync(new URL("./p11-activity-probe.sql", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20260830164910_p11_preserve_activity_history_on_delete.sql", import.meta.url), "utf8")
  .replace(/^BEGIN;\s*/u, "").replace(/COMMIT;\s*$/u, "");
mkdirSync(resolve("tmp"), { recursive: true });
writeFileSync(resolve("tmp/p11-activity-preflight.sql"), probe.replace("/* MIGRATION_UNDER_TEST */", `EXECUTE $migration_under_test$${migration}$migration_under_test$;`));
console.log("Generated transaction-only probe: tmp/p11-activity-preflight.sql");
