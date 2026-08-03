export const DATABASE_NAME = "geoapp";
export const DATABASE_VERSION = 3;

export const SESSION_STORE = "sessions";
export const META_STORE = "meta";
export const PROGRESS_STORE = "progress-events";
export const SETTINGS_STORE = "settings";
export const QUARANTINE_STORE = "quarantine";
export const IDENTITY_STORE = "identity";
export const SYNC_OUTBOX_STORE = "sync-outbox";
export const ACHIEVEMENT_STORE = "achievement-unlocks";
export const SYNC_STATE_STORE = "sync-state";

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true
    });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("IndexedDB request failed.")),
      { once: true }
    );
  });
}

export function transactionComplete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () =>
        reject(
          transaction.error ?? new Error("IndexedDB transaction aborted.")
        ),
      { once: true }
    );
    transaction.addEventListener(
      "error",
      () =>
        reject(
          transaction.error ?? new Error("IndexedDB transaction failed.")
        ),
      { once: true }
    );
  });
}

function createStores(database: IDBDatabase) {
  if (!database.objectStoreNames.contains(SESSION_STORE)) {
    database.createObjectStore(SESSION_STORE, { keyPath: "id" });
  }
  if (!database.objectStoreNames.contains(META_STORE)) {
    database.createObjectStore(META_STORE, { keyPath: "key" });
  }
  if (!database.objectStoreNames.contains(PROGRESS_STORE)) {
    const store = database.createObjectStore(PROGRESS_STORE, {
      keyPath: "id"
    });
    store.createIndex("profileId", "profileId", { unique: false });
    store.createIndex("entityId", "entityId", { unique: false });
    store.createIndex("skillKey", "skillKey", { unique: false });
  }
  if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
    database.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
  }
  if (!database.objectStoreNames.contains(QUARANTINE_STORE)) {
    database.createObjectStore(QUARANTINE_STORE, { keyPath: "id" });
  }
  if (!database.objectStoreNames.contains(IDENTITY_STORE)) {
    database.createObjectStore(IDENTITY_STORE, { keyPath: "key" });
  }
  if (!database.objectStoreNames.contains(SYNC_OUTBOX_STORE)) {
    const store = database.createObjectStore(SYNC_OUTBOX_STORE, {
      keyPath: "id"
    });
    store.createIndex("profileId", "profileId", { unique: false });
  }
  if (!database.objectStoreNames.contains(ACHIEVEMENT_STORE)) {
    const store = database.createObjectStore(ACHIEVEMENT_STORE, {
      keyPath: "achievementId"
    });
    store.createIndex("profileId", "profileId", { unique: false });
  }
  if (!database.objectStoreNames.contains(SYNC_STATE_STORE)) {
    database.createObjectStore(SYNC_STATE_STORE, { keyPath: "key" });
  }
}

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.addEventListener("upgradeneeded", () => {
      createStores(request.result);
    });
    request.addEventListener("success", () => resolve(request.result), {
      once: true
    });
    request.addEventListener(
      "error",
      () =>
        reject(request.error ?? new Error("IndexedDB could not be opened.")),
      { once: true }
    );
  });
}
