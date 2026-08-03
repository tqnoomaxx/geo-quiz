import type { AchievementUnlock } from "../engine/achievements/achievement";
import type { ProgressEvent } from "../engine/progress/progress";

export interface LocalIdentity {
  key: "local-identity";
  schemaVersion: 1;
  installationId: string;
  deviceId: string;
  localProfileId: string;
  linkedAccountId?: string;
  linkedAt?: string;
}

export interface AuthAccount {
  id: string;
  email?: string;
}

export interface AuthAdapter {
  readonly configured: boolean;
  getAccount(): Promise<AuthAccount | undefined>;
  requestEmailCode(email: string): Promise<void>;
  verifyEmailCode(email: string, token: string): Promise<AuthAccount>;
  signOut(): Promise<void>;
}

export interface SyncInput {
  importBatchId: string;
  identity: LocalIdentity;
  progressEvents: ProgressEvent[];
  achievementUnlocks: AchievementUnlock[];
}

export interface SyncResult {
  acknowledgedEventIds: string[];
  progressEvents: ProgressEvent[];
  achievementUnlocks: AchievementUnlock[];
  syncedAt: string;
}

export interface SyncAdapter {
  sync(input: SyncInput): Promise<SyncResult>;
}

export interface ProgressExport {
  schemaVersion: 1;
  exportedAt: string;
  identity: LocalIdentity;
  progressEvents: ProgressEvent[];
  achievementUnlocks: AchievementUnlock[];
}
