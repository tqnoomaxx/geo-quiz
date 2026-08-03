import type { LocalIdentity } from "../account/types";
import { requestResult } from "./database";

export const LOCAL_IDENTITY_KEY = "local-identity";
export const LEGACY_LOCAL_PROFILE_KEY = "local-profile-id";

interface LegacyMetaRecord {
  key: string;
  value: string;
}

export function isLocalIdentity(value: unknown): value is LocalIdentity {
  return (
    typeof value === "object" &&
    value !== null &&
    "key" in value &&
    value.key === LOCAL_IDENTITY_KEY &&
    "schemaVersion" in value &&
    value.schemaVersion === 1 &&
    "installationId" in value &&
    typeof value.installationId === "string" &&
    "deviceId" in value &&
    typeof value.deviceId === "string" &&
    "localProfileId" in value &&
    typeof value.localProfileId === "string" &&
    (!("linkedAccountId" in value) ||
      value.linkedAccountId === undefined ||
      typeof value.linkedAccountId === "string") &&
    (!("linkedAt" in value) ||
      value.linkedAt === undefined ||
      (typeof value.linkedAt === "string" &&
        !Number.isNaN(Date.parse(value.linkedAt))))
  );
}

export async function ensureLocalIdentity(
  identityStore: IDBObjectStore,
  metaStore: IDBObjectStore
): Promise<LocalIdentity> {
  const existing = await requestResult(identityStore.get(LOCAL_IDENTITY_KEY));
  if (isLocalIdentity(existing)) return existing;

  const legacy = await requestResult(metaStore.get(LEGACY_LOCAL_PROFILE_KEY));
  const localProfileId =
    typeof legacy === "object" &&
    legacy !== null &&
    "value" in legacy &&
    typeof legacy.value === "string"
      ? legacy.value
      : `guest:${crypto.randomUUID()}`;
  const identity: LocalIdentity = {
    key: LOCAL_IDENTITY_KEY,
    schemaVersion: 1,
    installationId: crypto.randomUUID(),
    deviceId: crypto.randomUUID(),
    localProfileId
  };

  identityStore.put(identity);
  metaStore.put({
    key: LEGACY_LOCAL_PROFILE_KEY,
    value: localProfileId
  } satisfies LegacyMetaRecord);

  return identity;
}
