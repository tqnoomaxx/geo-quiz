import { describe, expect, it, vi } from "vitest";
import type { AccountRepository } from "../persistence/accountRepository";
import type { SyncAdapter } from "./types";
import { AccountLinkConflictError, syncAccount } from "./sync";

describe("Account sync guard", () => {
  it("überträgt einen bereits verknüpften Gaststand nicht in ein anderes Konto", async () => {
    const repository = {
      getIdentity: vi.fn().mockResolvedValue({
        key: "local-identity",
        schemaVersion: 1,
        installationId: "installation",
        deviceId: "device",
        localProfileId: "guest:one",
        linkedAccountId: "account:a"
      }),
      prepareSync: vi.fn(),
      applySync: vi.fn()
    } as unknown as AccountRepository;
    const adapter = { sync: vi.fn() } as unknown as SyncAdapter;

    await expect(
      syncAccount("account:b", repository, adapter)
    ).rejects.toBeInstanceOf(AccountLinkConflictError);
    expect(repository.prepareSync).not.toHaveBeenCalled();
    expect(adapter.sync).not.toHaveBeenCalled();
  });
});
