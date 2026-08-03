import type { AchievementUnlock } from "../engine/achievements/achievement";
import type { ProgressEvent } from "../engine/progress/progress";

export function mergeProgressEvents(
  local: readonly ProgressEvent[],
  remote: readonly ProgressEvent[],
  localProfileId: string
): ProgressEvent[] {
  const byId = new Map<string, ProgressEvent>();

  for (const event of [...local, ...remote]) {
    if (!byId.has(event.id)) {
      byId.set(event.id, { ...event, profileId: localProfileId });
    }
  }

  return [...byId.values()].sort(
    (left, right) =>
      left.occurredAt.localeCompare(right.occurredAt) ||
      left.id.localeCompare(right.id)
  );
}

export function mergeAchievementUnlocks(
  local: readonly AchievementUnlock[],
  remote: readonly AchievementUnlock[],
  localProfileId: string
): AchievementUnlock[] {
  const byId = new Map<string, AchievementUnlock>();

  for (const unlock of [...local, ...remote]) {
    const normalized = { ...unlock, profileId: localProfileId };
    const existing = byId.get(unlock.achievementId);

    if (!existing) {
      byId.set(unlock.achievementId, normalized);
      continue;
    }

    byId.set(unlock.achievementId, {
      ...existing,
      definitionVersion: Math.max(
        existing.definitionVersion,
        unlock.definitionVersion
      ),
      unlockedAt:
        unlock.unlockedAt < existing.unlockedAt
          ? unlock.unlockedAt
          : existing.unlockedAt,
      sourceEventIds: [
        ...new Set([...existing.sourceEventIds, ...unlock.sourceEventIds])
      ],
      verification:
        existing.verification === "server" || unlock.verification === "server"
          ? "server"
          : "local"
    });
  }

  return [...byId.values()].sort(
    (left, right) =>
      left.unlockedAt.localeCompare(right.unlockedAt) ||
      left.achievementId.localeCompare(right.achievementId)
  );
}
