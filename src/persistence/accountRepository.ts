import type {
  LocalIdentity,
  ProgressExport,
  SyncInput,
  SyncResult
} from "../account/types";
import {
  isAchievementUnlock,
  type AchievementUnlock
} from "../engine/achievements/achievement";
import {
  isProgressEvent,
  type ProgressEvent
} from "../engine/progress/progress";
import {
  mergeAchievementUnlocks,
  mergeProgressEvents
} from "../account/merge";
import {
  ACHIEVEMENT_STORE,
  IDENTITY_STORE,
  META_STORE,
  openDatabase,
  PROGRESS_STORE,
  requestResult,
  SYNC_OUTBOX_STORE,
  SYNC_STATE_STORE,
  transactionComplete
} from "./database";
import {
  ensureLocalIdentity,
  isLocalIdentity,
  LOCAL_IDENTITY_KEY
} from "./localIdentity";

interface SyncStateRecord {
  key: string;
  value: string;
}

export interface AccountRepository {
  getIdentity(): Promise<LocalIdentity>;
  createExport(): Promise<ProgressExport>;
  prepareSync(accountId: string): Promise<SyncInput>;
  applySync(accountId: string, result: SyncResult): Promise<void>;
}

const batchKey = (accountId: string) => `import-batch:${accountId}`;
const backfillKey = (accountId: string) => `outbox-backfill:${accountId}`;

function stringRecordValue(value: unknown): string | undefined {
  return typeof value === "object" &&
    value !== null &&
    "value" in value &&
    typeof value.value === "string"
    ? value.value
    : undefined;
}

export function createIndexedDbAccountRepository(): AccountRepository {
  return {
    async getIdentity() {
      const database = await openDatabase();

      try {
        const transaction = database.transaction(
          [IDENTITY_STORE, META_STORE],
          "readwrite"
        );
        const identity = await ensureLocalIdentity(
          transaction.objectStore(IDENTITY_STORE),
          transaction.objectStore(META_STORE)
        );
        await transactionComplete(transaction);
        return identity;
      } finally {
        database.close();
      }
    },

    async createExport() {
      const database = await openDatabase();

      try {
        const transaction = database.transaction(
          [
            IDENTITY_STORE,
            META_STORE,
            PROGRESS_STORE,
            ACHIEVEMENT_STORE
          ],
          "readwrite"
        );
        const [identity, progressValues, unlockValues] = await Promise.all([
          ensureLocalIdentity(
            transaction.objectStore(IDENTITY_STORE),
            transaction.objectStore(META_STORE)
          ),
          requestResult(transaction.objectStore(PROGRESS_STORE).getAll()),
          requestResult(transaction.objectStore(ACHIEVEMENT_STORE).getAll())
        ]);
        await transactionComplete(transaction);

        return {
          schemaVersion: 1,
          exportedAt: new Date().toISOString(),
          identity,
          progressEvents: Array.isArray(progressValues)
            ? progressValues.filter(isProgressEvent)
            : [],
          achievementUnlocks: Array.isArray(unlockValues)
            ? unlockValues.filter(isAchievementUnlock)
            : []
        };
      } finally {
        database.close();
      }
    },

    async prepareSync(accountId) {
      const database = await openDatabase();

      try {
        const transaction = database.transaction(
          [
            IDENTITY_STORE,
            META_STORE,
            PROGRESS_STORE,
            SYNC_OUTBOX_STORE,
            ACHIEVEMENT_STORE,
            SYNC_STATE_STORE
          ],
          "readwrite"
        );
        const identityStore = transaction.objectStore(IDENTITY_STORE);
        const metaStore = transaction.objectStore(META_STORE);
        const progressStore = transaction.objectStore(PROGRESS_STORE);
        const outboxStore = transaction.objectStore(SYNC_OUTBOX_STORE);
        const achievementStore =
          transaction.objectStore(ACHIEVEMENT_STORE);
        const syncStateStore = transaction.objectStore(SYNC_STATE_STORE);
        const [identity, progressValues, outboxValues, unlockValues, batch, backfill] =
          await Promise.all([
            ensureLocalIdentity(identityStore, metaStore),
            requestResult(progressStore.getAll()),
            requestResult(outboxStore.getAll()),
            requestResult(achievementStore.getAll()),
            requestResult(syncStateStore.get(batchKey(accountId))),
            requestResult(syncStateStore.get(backfillKey(accountId)))
          ]);
        const progressEvents = Array.isArray(progressValues)
          ? progressValues.filter(isProgressEvent)
          : [];
        const outboxEvents = Array.isArray(outboxValues)
          ? outboxValues.filter(isProgressEvent)
          : [];
        const pendingById = new Map(
          outboxEvents.map((event) => [event.id, event])
        );

        if (stringRecordValue(backfill) !== "complete") {
          for (const event of progressEvents) {
            outboxStore.put(event);
            pendingById.set(event.id, event);
          }
          syncStateStore.put({
            key: backfillKey(accountId),
            value: "complete"
          } satisfies SyncStateRecord);
        }

        const importBatchId =
          stringRecordValue(batch) ?? crypto.randomUUID();
        if (!stringRecordValue(batch)) {
          syncStateStore.put({
            key: batchKey(accountId),
            value: importBatchId
          } satisfies SyncStateRecord);
        }

        await transactionComplete(transaction);

        return {
          importBatchId,
          identity,
          progressEvents: [...pendingById.values()],
          achievementUnlocks: Array.isArray(unlockValues)
            ? unlockValues.filter(isAchievementUnlock)
            : []
        };
      } finally {
        database.close();
      }
    },

    async applySync(accountId, result) {
      const database = await openDatabase();

      try {
        const transaction = database.transaction(
          [
            IDENTITY_STORE,
            PROGRESS_STORE,
            SYNC_OUTBOX_STORE,
            ACHIEVEMENT_STORE,
            SYNC_STATE_STORE
          ],
          "readwrite"
        );
        const identityStore = transaction.objectStore(IDENTITY_STORE);
        const progressStore = transaction.objectStore(PROGRESS_STORE);
        const achievementStore =
          transaction.objectStore(ACHIEVEMENT_STORE);
        const [identityValue, progressValues, unlockValues] = await Promise.all([
          requestResult(identityStore.get(LOCAL_IDENTITY_KEY)),
          requestResult(progressStore.getAll()),
          requestResult(achievementStore.getAll())
        ]);

        if (!isLocalIdentity(identityValue)) {
          throw new Error("Die lokale Identität fehlt beim Syncabschluss.");
        }

        const localEvents = Array.isArray(progressValues)
          ? progressValues.filter(isProgressEvent)
          : [];
        const localUnlocks = Array.isArray(unlockValues)
          ? unlockValues.filter(isAchievementUnlock)
          : [];
        const mergedEvents = mergeProgressEvents(
          localEvents,
          result.progressEvents,
          identityValue.localProfileId
        );
        const mergedUnlocks = mergeAchievementUnlocks(
          localUnlocks,
          result.achievementUnlocks,
          identityValue.localProfileId
        );

        for (const event of mergedEvents) progressStore.put(event);
        for (const unlock of mergedUnlocks) achievementStore.put(unlock);
        for (const eventId of result.acknowledgedEventIds) {
          transaction.objectStore(SYNC_OUTBOX_STORE).delete(eventId);
        }

        identityStore.put({
          ...identityValue,
          linkedAccountId: accountId,
          linkedAt: result.syncedAt
        } satisfies LocalIdentity);
        transaction.objectStore(SYNC_STATE_STORE).delete(batchKey(accountId));
        await transactionComplete(transaction);
      } finally {
        database.close();
      }
    }
  };
}

let accountRepository: AccountRepository | undefined;

export function getAccountRepository() {
  accountRepository ??= createIndexedDbAccountRepository();
  return accountRepository;
}

export function downloadProgressExport(progressExport: ProgressExport) {
  const blob = new Blob([JSON.stringify(progressExport, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `geoapp-fortschritt-${progressExport.exportedAt.slice(0, 10)}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
