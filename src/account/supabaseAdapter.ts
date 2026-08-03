import type { SupabaseClient } from "@supabase/supabase-js";
import type { AchievementUnlock } from "../engine/achievements/achievement";
import type { ProgressEvent } from "../engine/progress/progress";
import type {
  AuthAccount,
  AuthAdapter,
  SyncAdapter,
  SyncInput,
  SyncResult
} from "./types";

export interface AccountBackend {
  auth: AuthAdapter;
  sync: SyncAdapter;
}

interface ProgressRow {
  id: string;
  profile_id: string;
  session_id: string;
  question_id: string;
  entity_id: string;
  skill_key: string;
  outcome: ProgressEvent["outcome"];
  score: number;
  response_time_ms: number;
  occurred_at: string;
  dataset_version: string;
  quiz_definition_id: string;
  schema_version: 1;
}

interface UnlockRow {
  achievement_id: string;
  profile_id: string;
  definition_version: number;
  unlocked_at: string;
  source_event_ids: string[];
  verification: "local" | "server";
}

function accountFromUser(
  user: { id: string; email?: string | null } | null
): AuthAccount | undefined {
  return user
    ? { id: user.id, email: user.email ?? undefined }
    : undefined;
}

function progressFromRow(row: ProgressRow): ProgressEvent {
  return {
    schemaVersion: row.schema_version,
    id: row.id,
    profileId: row.profile_id,
    sessionId: row.session_id,
    questionId: row.question_id,
    entityId: row.entity_id,
    skillKey: row.skill_key,
    outcome: row.outcome,
    score: row.score,
    responseTimeMs: row.response_time_ms,
    occurredAt: row.occurred_at,
    datasetVersion: row.dataset_version,
    quizDefinitionId: row.quiz_definition_id
  };
}

function unlockFromRow(row: UnlockRow): AchievementUnlock {
  return {
    schemaVersion: 1,
    achievementId: row.achievement_id,
    definitionVersion: row.definition_version,
    profileId: row.profile_id,
    unlockedAt: row.unlocked_at,
    sourceEventIds: row.source_event_ids,
    verification: row.verification
  };
}

class SupabaseAccountBackend implements AuthAdapter, SyncAdapter {
  readonly configured = true;

  constructor(private readonly client: SupabaseClient) {}

  async getAccount() {
    const { data, error } = await this.client.auth.getUser();
    if (error && error.name !== "AuthSessionMissingError") throw error;
    return accountFromUser(data.user);
  }

  async requestEmailCode(email: string) {
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }
    });
    if (error) throw error;
  }

  async verifyEmailCode(email: string, token: string) {
    const { data, error } = await this.client.auth.verifyOtp({
      email,
      token,
      type: "email"
    });
    if (error) throw error;

    const account = accountFromUser(data.user);
    if (!account) {
      throw new Error("Der Einmalcode ergab keine gültige Anmeldung.");
    }
    return account;
  }

  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  async sync(input: SyncInput): Promise<SyncResult> {
    const { error: importError } = await this.client.rpc(
      "import_progress_batch",
      {
        p_batch_id: input.importBatchId,
        p_installation_id: input.identity.installationId,
        p_device_id: input.identity.deviceId,
        p_events: input.progressEvents,
        p_unlocks: input.achievementUnlocks
      }
    );
    if (importError) throw importError;

    const [progressResponse, unlockResponse] = await Promise.all([
      this.client
        .from("progress_events")
        .select(
          "id, profile_id, session_id, question_id, entity_id, skill_key, outcome, score, response_time_ms, occurred_at, dataset_version, quiz_definition_id, schema_version"
        )
        .order("occurred_at", { ascending: true }),
      this.client
        .from("achievement_unlocks")
        .select(
          "achievement_id, profile_id, definition_version, unlocked_at, source_event_ids, verification"
        )
        .order("unlocked_at", { ascending: true })
    ]);

    if (progressResponse.error) throw progressResponse.error;
    if (unlockResponse.error) throw unlockResponse.error;

    return {
      acknowledgedEventIds: input.progressEvents.map((event) => event.id),
      progressEvents: (progressResponse.data as ProgressRow[]).map(
        progressFromRow
      ),
      achievementUnlocks: (unlockResponse.data as UnlockRow[]).map(
        unlockFromRow
      ),
      syncedAt: new Date().toISOString()
    };
  }
}

export async function loadAccountBackend(): Promise<
  AccountBackend | undefined
> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) return undefined;

  const { createClient } = await import("@supabase/supabase-js");
  const backend = new SupabaseAccountBackend(
    createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  );

  return { auth: backend, sync: backend };
}
