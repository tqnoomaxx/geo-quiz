import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/202607300001_phase3_account_sync.sql",
    import.meta.url
  ),
  "utf8"
).toLowerCase();

const tables = [
  "profiles",
  "devices",
  "progress_events",
  "achievement_unlocks",
  "sync_import_batches"
];

describe("Supabase Phase-3-Migration", () => {
  it.each(tables)("aktiviert RLS für %s", (table) => {
    expect(migration).toContain(
      `alter table public.${table} enable row level security`
    );
  });

  it.each(tables)("begrenzt %s durch auth.uid-basierte Policies", (table) => {
    expect(migration).toMatch(
      new RegExp(
        `create policy [\\s\\S]+?on public\\.${table}[\\s\\S]+?to authenticated[\\s\\S]+?\\(select auth\\.uid\\(\\)\\)`
      )
    );
  });

  it("importiert Batches idempotent in einer Datenbankfunktion", () => {
    expect(migration).toContain(
      "create or replace function public.import_progress_batch"
    );
    expect(migration).toContain(
      "on conflict (profile_id, id) do nothing"
    );
    expect(migration).toContain("'already_imported'");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
  });

  it("gibt dem Browser keinen direkten Schreibzugriff auf Ereignisse", () => {
    expect(migration).toContain(
      "grant select on public.progress_events to authenticated"
    );
    expect(migration).not.toContain(
      "grant insert on public.progress_events to authenticated"
    );
    expect(migration).toContain(
      "from public, anon"
    );
  });

  it("enthält keine Browserfreigabe für service_role-Schlüssel", () => {
    expect(migration).not.toContain("service_role key");
    expect(migration).not.toContain("supabase_service_role");
  });
});
