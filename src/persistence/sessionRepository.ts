import {
  isProgressEvent,
  progressEventsFromSession,
  type ProgressEvent
} from "../engine/progress/progress";
import {
  deriveAchievementUnlocks,
  isAchievementUnlock,
  type AchievementUnlock
} from "../engine/achievements/achievement";
import type {
  MvpProfile,
  MvpQuizSetup,
  ZodiacOptionalFieldId
} from "../engine/quiz/presets";
import { ZODIAC_OPTIONAL_FIELD_IDS } from "../engine/quiz/presets";
import type { RankedCitySetSize } from "../content/rankedCities";
import {
  createPersistedSessionSnapshot,
  validateQuizSessionState,
  type QuizSessionState
} from "../engine/session/session";
import {
  ACHIEVEMENT_STORE,
  IDENTITY_STORE,
  META_STORE,
  openDatabase,
  PROGRESS_STORE,
  QUARANTINE_STORE,
  requestResult,
  SESSION_STORE,
  SETTINGS_STORE,
  SYNC_OUTBOX_STORE,
  transactionComplete
} from "./database";
import { ensureLocalIdentity } from "./localIdentity";
const ACTIVE_SESSION_KEY = "active-session";
const LATEST_RESULT_KEY = "latest-result";
const QUIZ_SETUP_KEY = "quiz-setup";

type MetaRecord = {
  key: string;
  value: string;
};

type SettingRecord<T> = {
  key: string;
  value: T;
};

export interface SessionRepository {
  save(state: QuizSessionState, atMs: number): Promise<void>;
  loadActive(): Promise<QuizSessionState | undefined>;
  loadLatestCompleted(): Promise<QuizSessionState | undefined>;
  clearActive(): Promise<void>;
  loadProgressEvents(): Promise<ProgressEvent[]>;
  loadAchievementUnlocks(): Promise<AchievementUnlock[]>;
  saveSetup(setup: MvpQuizSetup): Promise<void>;
  loadSetup(): Promise<MvpQuizSetup | undefined>;
}

type StoredQuizSetup = Omit<
  MvpQuizSetup,
  "profile" | "citySetSize" | "astronomyFieldIds"
> & {
  profile?: MvpProfile;
  citySetSize?: RankedCitySetSize;
  astronomyFieldIds?: ZodiacOptionalFieldId[];
};

function isSetup(value: unknown): value is StoredQuizSetup {
  return (
    typeof value === "object" &&
    value !== null &&
    "topic" in value &&
    [
      "capitals",
      "country-profile",
      "cities",
      "countries",
      "flags",
      "shapes",
      "rivers",
      "lakes",
      "seas",
      "mountain-ranges",
      "peaks",
      "longest-rivers",
      "highest-mountains",
      "planets",
      "moons",
      "dwarf-planets",
      "zodiac",
      "knowledge",
      "world-mix"
    ].includes(String(value.topic)) &&
    "direction" in value &&
    [
      "locate",
      "name",
      "country_to_name",
      "name_to_country",
      "choice",
      "reverse_choice",
      "facts_to_name",
      "profile",
      "mix"
    ].includes(String(value.direction)) &&
    (!("profile" in value) ||
      value.profile === "learn" ||
      value.profile === "practice" ||
      value.profile === "exam") &&
    "regionId" in value &&
    typeof value.regionId === "string" &&
    "questionCount" in value &&
    (value.questionCount === 6 ||
      value.questionCount === 10 ||
      value.questionCount === 20 ||
      value.questionCount === "all") &&
    (!("citySetSize" in value) ||
      value.citySetSize === 100 ||
      value.citySetSize === 250 ||
      value.citySetSize === 500 ||
      value.citySetSize === 1000) &&
    (!("astronomyFieldIds" in value) ||
      (Array.isArray(value.astronomyFieldIds) &&
        value.astronomyFieldIds.every((fieldId) =>
          ZODIAC_OPTIONAL_FIELD_IDS.includes(
            fieldId as ZodiacOptionalFieldId
          )
        ))) &&
    "timerSeconds" in value &&
    (value.timerSeconds === 0 ||
      value.timerSeconds === 15 ||
      value.timerSeconds === 30) &&
    "seed" in value &&
    typeof value.seed === "string"
  );
}

async function quarantineInvalidSession(
  database: IDBDatabase,
  metaKey: string,
  sessionId: string,
  value: unknown,
  issues: string[]
) {
  const transaction = database.transaction(
    [SESSION_STORE, META_STORE, QUARANTINE_STORE],
    "readwrite"
  );
  transaction.objectStore(QUARANTINE_STORE).put({
    id: `session:${sessionId}:${Date.now()}`,
    kind: "session",
    originalId: sessionId,
    quarantinedAt: new Date().toISOString(),
    issues,
    value
  });
  transaction.objectStore(SESSION_STORE).delete(sessionId);
  transaction.objectStore(META_STORE).delete(metaKey);
  await transactionComplete(transaction);
}

async function loadByMetaKey(key: string) {
  const database = await openDatabase();

  try {
    const transaction = database.transaction(
      [SESSION_STORE, META_STORE],
      "readonly"
    );
    const meta = await requestResult(
      transaction.objectStore(META_STORE).get(key)
    );

    if (
      typeof meta !== "object" ||
      meta === null ||
      !("value" in meta) ||
      typeof meta.value !== "string"
    ) {
      await transactionComplete(transaction);
      return undefined;
    }

    const session = await requestResult(
      transaction.objectStore(SESSION_STORE).get(meta.value)
    );
    await transactionComplete(transaction);
    const validation = validateQuizSessionState(session);

    if (validation.success) {
      return session as QuizSessionState;
    }

    await quarantineInvalidSession(
      database,
      key,
      meta.value,
      session,
      validation.issues
    );
    return undefined;
  } finally {
    database.close();
  }
}

export function createIndexedDbSessionRepository(): SessionRepository {
  return {
    async save(state, atMs) {
      const database = await openDatabase();

      try {
        const storeNames = [SESSION_STORE, META_STORE];
        if (state.status === "completed") {
          storeNames.push(
            PROGRESS_STORE,
            IDENTITY_STORE,
            SYNC_OUTBOX_STORE,
            ACHIEVEMENT_STORE
          );
        }
        const transaction = database.transaction(storeNames, "readwrite");
        const sessions = transaction.objectStore(SESSION_STORE);
        const meta = transaction.objectStore(META_STORE);
        const snapshot = createPersistedSessionSnapshot(state, atMs);

        sessions.put(snapshot);

        if (snapshot.status === "completed") {
          meta.delete(ACTIVE_SESSION_KEY);
          meta.put({
            key: LATEST_RESULT_KEY,
            value: snapshot.id
          } satisfies MetaRecord);
          const identity = await ensureLocalIdentity(
            transaction.objectStore(IDENTITY_STORE),
            meta
          );
          const progressStore = transaction.objectStore(PROGRESS_STORE);
          const outboxStore = transaction.objectStore(SYNC_OUTBOX_STORE);
          const achievementStore =
            transaction.objectStore(ACHIEVEMENT_STORE);
          const [storedEvents, storedUnlocks] = await Promise.all([
            requestResult(progressStore.getAll()),
            requestResult(achievementStore.getAll())
          ]);
          const newEvents = progressEventsFromSession(
            snapshot,
            identity.localProfileId
          );

          for (const event of newEvents) {
            progressStore.put(event);
            outboxStore.put(event);
          }

          const allEvents = [
            ...(Array.isArray(storedEvents)
              ? storedEvents.filter(isProgressEvent)
              : []),
            ...newEvents
          ];
          const existingUnlocks = Array.isArray(storedUnlocks)
            ? storedUnlocks.filter(isAchievementUnlock)
            : [];
          const newUnlocks = deriveAchievementUnlocks(
            allEvents,
            existingUnlocks,
            identity.localProfileId,
            snapshot.completedAt ?? new Date().toISOString()
          );

          for (const unlock of newUnlocks) {
            achievementStore.put(unlock);
          }
        } else if (snapshot.status !== "abandoned") {
          meta.put({
            key: ACTIVE_SESSION_KEY,
            value: snapshot.id
          } satisfies MetaRecord);
        }

        await transactionComplete(transaction);
      } finally {
        database.close();
      }
    },
    loadActive: () => loadByMetaKey(ACTIVE_SESSION_KEY),
    loadLatestCompleted: () => loadByMetaKey(LATEST_RESULT_KEY),
    async clearActive() {
      const database = await openDatabase();

      try {
        const transaction = database.transaction(
          [SESSION_STORE, META_STORE],
          "readwrite"
        );
        const metaStore = transaction.objectStore(META_STORE);
        const active = await requestResult(metaStore.get(ACTIVE_SESSION_KEY));

        if (
          typeof active === "object" &&
          active !== null &&
          "value" in active &&
          typeof active.value === "string"
        ) {
          transaction.objectStore(SESSION_STORE).delete(active.value);
        }

        metaStore.delete(ACTIVE_SESSION_KEY);
        await transactionComplete(transaction);
      } finally {
        database.close();
      }
    },
    async loadProgressEvents() {
      const database = await openDatabase();

      try {
        const transaction = database.transaction(PROGRESS_STORE, "readonly");
        const values = await requestResult(
          transaction.objectStore(PROGRESS_STORE).getAll()
        );
        await transactionComplete(transaction);
        return Array.isArray(values) ? values.filter(isProgressEvent) : [];
      } finally {
        database.close();
      }
    },
    async loadAchievementUnlocks() {
      const database = await openDatabase();

      try {
        const transaction = database.transaction(
          ACHIEVEMENT_STORE,
          "readonly"
        );
        const values = await requestResult(
          transaction.objectStore(ACHIEVEMENT_STORE).getAll()
        );
        await transactionComplete(transaction);
        return Array.isArray(values)
          ? values.filter(isAchievementUnlock)
          : [];
      } finally {
        database.close();
      }
    },
    async saveSetup(setup) {
      const database = await openDatabase();

      try {
        const transaction = database.transaction(SETTINGS_STORE, "readwrite");
        transaction.objectStore(SETTINGS_STORE).put({
          key: QUIZ_SETUP_KEY,
          value: setup
        } satisfies SettingRecord<MvpQuizSetup>);
        await transactionComplete(transaction);
      } finally {
        database.close();
      }
    },
    async loadSetup() {
      const database = await openDatabase();

      try {
        const transaction = database.transaction(SETTINGS_STORE, "readonly");
        const record = await requestResult(
          transaction.objectStore(SETTINGS_STORE).get(QUIZ_SETUP_KEY)
        );
        await transactionComplete(transaction);

        return (
          typeof record === "object" &&
          record !== null &&
          "value" in record &&
          isSetup(record.value)
        )
          ? {
              ...record.value,
              profile: record.value.profile ?? "learn",
              citySetSize: record.value.citySetSize ?? 100,
              astronomyFieldIds: record.value.astronomyFieldIds ?? []
            }
          : undefined;
      } finally {
        database.close();
      }
    }
  };
}

let repository: SessionRepository | undefined;

export function getSessionRepository() {
  repository ??= createIndexedDbSessionRepository();
  return repository;
}
