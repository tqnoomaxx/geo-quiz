import type { AccountRepository } from "../persistence/accountRepository";
import type { SyncAdapter, SyncResult } from "./types";

export class AccountLinkConflictError extends Error {
  constructor() {
    super(
      "Dieser lokale Lernstand ist bereits mit einem anderen Konto verknüpft."
    );
    this.name = "AccountLinkConflictError";
  }
}

export async function syncAccount(
  accountId: string,
  repository: AccountRepository,
  adapter: SyncAdapter
): Promise<SyncResult> {
  const identity = await repository.getIdentity();
  if (
    identity.linkedAccountId &&
    identity.linkedAccountId !== accountId
  ) {
    throw new AccountLinkConflictError();
  }

  const input = await repository.prepareSync(accountId);
  const result = await adapter.sync(input);
  await repository.applySync(accountId, result);
  return result;
}
