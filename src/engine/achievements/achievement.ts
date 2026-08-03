import type { ProgressEvent } from "../progress/progress";

export type AchievementTier = "bronze" | "silver" | "gold";

export type AchievementRule =
  | {
      aggregate: "event_count";
      target: number;
      outcome?: ProgressEvent["outcome"];
      skillPrefix?: string;
    }
  | {
      aggregate: "distinct_entity_count";
      target: number;
      outcome?: ProgressEvent["outcome"];
      skillPrefix?: string;
    }
  | {
      aggregate: "completed_session_count";
      target: number;
    }
  | {
      aggregate: "perfect_session_count";
      target: number;
      minimumAttempts: number;
    };

export interface AchievementDefinition {
  id: string;
  version: 1;
  familyId: string;
  title: string;
  description: string;
  badgeAssetKey: string;
  tier?: AchievementTier;
  rule: AchievementRule;
}

export interface AchievementUnlock {
  schemaVersion: 1;
  achievementId: string;
  definitionVersion: number;
  profileId: string;
  unlockedAt: string;
  sourceEventIds: string[];
  verification: "local" | "server";
}

export interface AchievementProgress {
  definition: AchievementDefinition;
  value: number;
  target: number;
  unlocked: boolean;
}

export interface CorrectAnswerFamilyTemplate {
  idPrefix: string;
  familyId: string;
  skillPrefix: string;
  badgeAssetKey: string;
  tiers: Array<{
    id: string;
    tier: AchievementTier;
    title: string;
    description: string;
    target: number;
  }>;
}

export function generateCorrectAnswerFamily(
  template: CorrectAnswerFamilyTemplate
): AchievementDefinition[] {
  return template.tiers.map((tier) => ({
    id: `${template.idPrefix}:${tier.id}`,
    version: 1,
    familyId: template.familyId,
    title: tier.title,
    description: tier.description,
    badgeAssetKey: template.badgeAssetKey,
    tier: tier.tier,
    rule: {
      aggregate: "event_count",
      outcome: "correct",
      skillPrefix: template.skillPrefix,
      target: tier.target
    }
  }));
}

export function validateAchievementDefinitions(
  definitions: readonly AchievementDefinition[]
): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();

  for (const definition of definitions) {
    if (ids.has(definition.id)) {
      issues.push(`Doppelte Achievement-ID: ${definition.id}`);
    }
    ids.add(definition.id);

    if (!Number.isInteger(definition.rule.target) || definition.rule.target < 1) {
      issues.push(`Ungültiges Ziel für ${definition.id}.`);
    }
    if (
      definition.rule.aggregate === "perfect_session_count" &&
      (!Number.isInteger(definition.rule.minimumAttempts) ||
        definition.rule.minimumAttempts < 1)
    ) {
      issues.push(`Ungültige Mindestlänge für ${definition.id}.`);
    }
  }

  return issues;
}

const DEFINITIONS: AchievementDefinition[] = [
  {
    id: "discovery:first-round",
    version: 1,
    familyId: "discovery",
    title: "Erste Runde",
    description: "Schließe deine erste Quizrunde ab.",
    badgeAssetKey: "compass",
    tier: "bronze",
    rule: { aggregate: "completed_session_count", target: 1 }
  },
  ...generateCorrectAnswerFamily({
    idPrefix: "countries",
    familyId: "countries-correct",
    skillPrefix: "country:",
    badgeAssetKey: "country",
    tiers: [
      {
        id: "correct-10",
        tier: "bronze",
        title: "Länderkenner · Bronze",
        description: "Beantworte 10 Länderfragen richtig.",
        target: 10
      },
      {
        id: "correct-50",
        tier: "silver",
        title: "Länderkenner · Silber",
        description: "Beantworte 50 Länderfragen richtig.",
        target: 50
      }
    ]
  }),
  ...generateCorrectAnswerFamily({
    idPrefix: "capitals",
    familyId: "capitals-correct",
    skillPrefix: "city:",
    badgeAssetKey: "capital",
    tiers: [
      {
        id: "correct-10",
        tier: "bronze",
        title: "Hauptstadtkenner · Bronze",
        description: "Beantworte 10 Hauptstadtfragen richtig.",
        target: 10
      },
      {
        id: "correct-50",
        tier: "silver",
        title: "Hauptstadtkenner · Silber",
        description: "Beantworte 50 Hauptstadtfragen richtig.",
        target: 50
      }
    ]
  }),
  ...generateCorrectAnswerFamily({
    idPrefix: "cities",
    familyId: "cities-correct",
    skillPrefix: "ranked_city:",
    badgeAssetKey: "city",
    tiers: [
      {
        id: "correct-10",
        tier: "bronze",
        title: "Stadtfinder · Bronze",
        description: "Beantworte 10 Fragen zu großen Städten richtig.",
        target: 10
      },
      {
        id: "correct-100",
        tier: "silver",
        title: "Stadtfinder · Silber",
        description: "Beantworte 100 Fragen zu großen Städten richtig.",
        target: 100
      },
      {
        id: "correct-1000",
        tier: "gold",
        title: "Stadtmarathon",
        description: "Beantworte 1000 Fragen zu großen Städten richtig.",
        target: 1000
      }
    ]
  }),
  ...generateCorrectAnswerFamily({
    idPrefix: "flags",
    familyId: "flags-correct",
    skillPrefix: "country:visual_asset:flag_",
    badgeAssetKey: "flag",
    tiers: [
      {
        id: "correct-10",
        tier: "bronze",
        title: "Flaggenkenner · Bronze",
        description: "Ordne 10 Flaggen richtig zu.",
        target: 10
      }
    ]
  }),
  ...generateCorrectAnswerFamily({
    idPrefix: "shapes",
    familyId: "shapes-correct",
    skillPrefix: "country:visual_asset:country_outline_",
    badgeAssetKey: "shape",
    tiers: [
      {
        id: "correct-10",
        tier: "bronze",
        title: "Formenkenner · Bronze",
        description: "Erkenne 10 Länder an ihrem Umriss.",
        target: 10
      }
    ]
  }),
  ...generateCorrectAnswerFamily({
    idPrefix: "rivers",
    familyId: "rivers-correct",
    skillPrefix: "river:",
    badgeAssetKey: "river",
    tiers: [
      {
        id: "correct-10",
        tier: "bronze",
        title: "Flussfinder · Bronze",
        description: "Beantworte 10 Flussfragen richtig.",
        target: 10
      }
    ]
  }),
  ...generateCorrectAnswerFamily({
    idPrefix: "ranked-rivers",
    familyId: "ranked-rivers-correct",
    skillPrefix: "ranked_river:",
    badgeAssetKey: "river",
    tiers: [
      {
        id: "correct-10",
        tier: "bronze",
        title: "Stromkenner · Bronze",
        description: "Erkenne 10 Flusssysteme an ihren Fakten.",
        target: 10
      }
    ]
  }),
  ...generateCorrectAnswerFamily({
    idPrefix: "lakes",
    familyId: "lakes-correct",
    skillPrefix: "lake:",
    badgeAssetKey: "lake",
    tiers: [
      {
        id: "correct-10",
        tier: "bronze",
        title: "Seenkenner · Bronze",
        description: "Beantworte 10 Seenfragen richtig.",
        target: 10
      }
    ]
  }),
  ...generateCorrectAnswerFamily({
    idPrefix: "seas",
    familyId: "seas-correct",
    skillPrefix: "sea:",
    badgeAssetKey: "sea",
    tiers: [
      {
        id: "correct-10",
        tier: "bronze",
        title: "Meeresblick · Bronze",
        description: "Beantworte 10 Meeresfragen richtig.",
        target: 10
      }
    ]
  }),
  ...generateCorrectAnswerFamily({
    idPrefix: "mountain-ranges",
    familyId: "mountain-ranges-correct",
    skillPrefix: "mountain_range:",
    badgeAssetKey: "mountain",
    tiers: [
      {
        id: "correct-10",
        tier: "bronze",
        title: "Gebirgskenner · Bronze",
        description: "Beantworte 10 Gebirgsfragen richtig.",
        target: 10
      }
    ]
  }),
  ...generateCorrectAnswerFamily({
    idPrefix: "peaks",
    familyId: "peaks-correct",
    skillPrefix: "peak:",
    badgeAssetKey: "peak",
    tiers: [
      {
        id: "correct-10",
        tier: "bronze",
        title: "Gipfelstürmer · Bronze",
        description: "Beantworte 10 Gipfelfragen richtig.",
        target: 10
      }
    ]
  }),
  ...generateCorrectAnswerFamily({
    idPrefix: "ranked-peaks",
    familyId: "ranked-peaks-correct",
    skillPrefix: "ranked_peak:",
    badgeAssetKey: "peak",
    tiers: [
      {
        id: "correct-10",
        tier: "bronze",
        title: "Höhenkenner · Bronze",
        description: "Erkenne 10 Berge an ihren Fakten.",
        target: 10
      }
    ]
  }),
  ...generateCorrectAnswerFamily({
    idPrefix: "knowledge",
    familyId: "knowledge-correct",
    skillPrefix: "knowledge_question:",
    badgeAssetKey: "knowledge",
    tiers: [
      {
        id: "correct-10",
        tier: "bronze",
        title: "Weltverknüpfer · Bronze",
        description: "Löse 10 verknüpfte Wissenspuzzles richtig.",
        target: 10
      }
    ]
  }),
  {
    id: "endurance:answers-100",
    version: 1,
    familyId: "endurance",
    title: "Ausdauer",
    description: "Beantworte insgesamt 100 Fragen.",
    badgeAssetKey: "route",
    tier: "bronze",
    rule: { aggregate: "event_count", target: 100 }
  },
  {
    id: "precision:perfect-10",
    version: 1,
    familyId: "precision",
    title: "Fehlerfreie Runde",
    description: "Löse eine Runde mit mindestens 10 Fragen fehlerfrei.",
    badgeAssetKey: "target",
    tier: "gold",
    rule: {
      aggregate: "perfect_session_count",
      minimumAttempts: 10,
      target: 1
    }
  }
];

const definitionIssues = validateAchievementDefinitions(DEFINITIONS);
if (definitionIssues.length > 0) {
  throw new Error(definitionIssues.join("\n"));
}

export const achievementDefinitions = Object.freeze(DEFINITIONS);

function uniqueEvents(events: readonly ProgressEvent[]): ProgressEvent[] {
  const byId = new Map<string, ProgressEvent>();

  for (const event of events) {
    const existing = byId.get(event.id);
    if (
      !existing ||
      event.occurredAt < existing.occurredAt ||
      (event.occurredAt === existing.occurredAt && event.id < existing.id)
    ) {
      byId.set(event.id, event);
    }
  }

  return [...byId.values()].sort(
    (left, right) =>
      left.occurredAt.localeCompare(right.occurredAt) ||
      left.id.localeCompare(right.id)
  );
}

function matchingEvents(
  events: readonly ProgressEvent[],
  rule: Extract<
    AchievementRule,
    { aggregate: "event_count" | "distinct_entity_count" }
  >
) {
  return events.filter(
    (event) =>
      (rule.outcome === undefined || event.outcome === rule.outcome) &&
      (rule.skillPrefix === undefined ||
        event.skillKey.startsWith(rule.skillPrefix))
  );
}

function sessionsFromEvents(events: readonly ProgressEvent[]) {
  const sessions = new Map<string, ProgressEvent[]>();

  for (const event of events) {
    const session = sessions.get(event.sessionId) ?? [];
    session.push(event);
    sessions.set(event.sessionId, session);
  }

  return sessions;
}

export function evaluateAchievement(
  definition: AchievementDefinition,
  inputEvents: readonly ProgressEvent[]
): { value: number; sourceEventIds: string[] } {
  const events = uniqueEvents(inputEvents);
  const rule = definition.rule;

  if (rule.aggregate === "event_count") {
    const matching = matchingEvents(events, rule);
    return {
      value: matching.length,
      sourceEventIds: matching.map((event) => event.id)
    };
  }

  if (rule.aggregate === "distinct_entity_count") {
    const matching = matchingEvents(events, rule);
    return {
      value: new Set(matching.map((event) => event.entityId)).size,
      sourceEventIds: matching.map((event) => event.id)
    };
  }

  const sessions = sessionsFromEvents(events);

  if (rule.aggregate === "completed_session_count") {
    return {
      value: sessions.size,
      sourceEventIds: events.map((event) => event.id)
    };
  }

  const perfectEvents = [...sessions.values()].filter(
    (session) =>
      session.length >= rule.minimumAttempts &&
      session.every((event) => event.outcome === "correct")
  );

  return {
    value: perfectEvents.length,
    sourceEventIds: perfectEvents.flatMap((session) =>
      session.map((event) => event.id)
    )
  };
}

export function achievementProgress(
  events: readonly ProgressEvent[],
  definitions: readonly AchievementDefinition[] = achievementDefinitions
): AchievementProgress[] {
  return definitions.map((definition) => {
    const result = evaluateAchievement(definition, events);

    return {
      definition,
      value: result.value,
      target: definition.rule.target,
      unlocked: result.value >= definition.rule.target
    };
  });
}

export function deriveAchievementUnlocks(
  events: readonly ProgressEvent[],
  existing: readonly AchievementUnlock[],
  profileId: string,
  unlockedAt: string,
  definitions: readonly AchievementDefinition[] = achievementDefinitions
): AchievementUnlock[] {
  const existingIds = new Set(existing.map((unlock) => unlock.achievementId));

  return definitions.flatMap((definition) => {
    if (existingIds.has(definition.id)) return [];

    const result = evaluateAchievement(definition, events);
    if (result.value < definition.rule.target) return [];

    return [
      {
        schemaVersion: 1,
        achievementId: definition.id,
        definitionVersion: definition.version,
        profileId,
        unlockedAt,
        sourceEventIds: result.sourceEventIds,
        verification: "local"
      }
    ];
  });
}

export function isAchievementUnlock(
  value: unknown
): value is AchievementUnlock {
  return (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    value.schemaVersion === 1 &&
    "achievementId" in value &&
    typeof value.achievementId === "string" &&
    "definitionVersion" in value &&
    typeof value.definitionVersion === "number" &&
    Number.isInteger(value.definitionVersion) &&
    value.definitionVersion > 0 &&
    "profileId" in value &&
    typeof value.profileId === "string" &&
    "unlockedAt" in value &&
    typeof value.unlockedAt === "string" &&
    !Number.isNaN(Date.parse(value.unlockedAt)) &&
    "sourceEventIds" in value &&
    Array.isArray(value.sourceEventIds) &&
    value.sourceEventIds.every((id) => typeof id === "string") &&
    "verification" in value &&
    (value.verification === "local" || value.verification === "server")
  );
}
