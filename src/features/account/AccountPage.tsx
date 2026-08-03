import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Cloud,
  Download,
  KeyRound,
  LogOut,
  RefreshCcw,
  ShieldCheck,
  UserRound
} from "lucide-react";
import {
  loadAccountBackend,
  type AccountBackend
} from "../../account/supabaseAdapter";
import {
  AccountLinkConflictError,
  syncAccount
} from "../../account/sync";
import type { AuthAccount, ProgressExport } from "../../account/types";
import { AppHeader } from "../../app/AppHeader";
import {
  downloadProgressExport,
  getAccountRepository
} from "../../persistence/accountRepository";

type BackendState = AccountBackend | null | undefined;

export function AccountPage() {
  const [backend, setBackend] = useState<BackendState>();
  const [account, setAccount] = useState<AuthAccount>();
  const [progressExport, setProgressExport] = useState<ProgressExport>();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const repository = getAccountRepository();

  const refreshExport = async () => {
    const nextExport = await repository.createExport();
    setProgressExport(nextExport);
    return nextExport;
  };

  useEffect(() => {
    let cancelled = false;
    const backendPromise = loadAccountBackend();
    const accountPromise = backendPromise.then((loadedBackend) =>
      loadedBackend?.auth.getAccount()
    );

    void Promise.all([
      repository.createExport(),
      backendPromise,
      accountPromise
    ])
      .then(([nextExport, loadedBackend, activeAccount]) => {
        if (cancelled) return;
        setProgressExport(nextExport);
        setBackend(loadedBackend ?? null);
        setAccount(activeAccount);
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Kontostatus oder lokaler Lernstand konnten nicht geladen werden."
          );
          setBackend(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [repository]);

  const handleRequestCode = async () => {
    if (!backend || !email.trim()) return;
    setBusy(true);
    setError(undefined);
    setMessage(undefined);

    try {
      await backend.auth.requestEmailCode(email.trim());
      setCodeRequested(true);
      setMessage(
        "Der Einmalcode wurde angefordert. Prüfe dein E-Mail-Postfach."
      );
    } catch {
      setError("Der Einmalcode konnte nicht angefordert werden.");
    } finally {
      setBusy(false);
    }
  };

  const synchronize = async (
    activeAccount: AuthAccount,
    activeBackend: AccountBackend
  ) => {
    const result = await syncAccount(
      activeAccount.id,
      repository,
      activeBackend.sync
    );
    await refreshExport();
    setMessage(
      `${result.acknowledgedEventIds.length} lokale Ereignisse synchronisiert.`
    );
  };

  const handleVerify = async () => {
    if (!backend || !email.trim() || !token.trim()) return;
    setBusy(true);
    setError(undefined);
    setMessage(undefined);

    try {
      const verifiedAccount = await backend.auth.verifyEmailCode(
        email.trim(),
        token.trim()
      );
      setAccount(verifiedAccount);
      await synchronize(verifiedAccount, backend);
      setToken("");
    } catch {
      setError(
        "Anmeldung oder Gastübernahme ist fehlgeschlagen. Lokale Daten wurden nicht gelöscht."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async () => {
    if (!backend || !account) return;
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      await synchronize(account, backend);
    } catch (syncError) {
      setError(
        syncError instanceof AccountLinkConflictError
          ? "Dieser lokale Lernstand gehört bereits zu einem anderen Konto und wurde nicht übertragen."
          : "Die Synchronisierung ist fehlgeschlagen. Die Outbox bleibt erhalten."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (!backend) return;
    setBusy(true);
    setError(undefined);
    try {
      await backend.auth.signOut();
      setAccount(undefined);
      setMessage(
        "Du bist abgemeldet. Der lokale Lernstand bleibt auf diesem Gerät."
      );
    } catch {
      setError("Die Abmeldung ist fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    try {
      downloadProgressExport(progressExport ?? (await refreshExport()));
      setMessage("Der lokale Lernstand wurde als JSON exportiert.");
    } catch {
      setError("Der Export konnte nicht erstellt werden.");
    }
  };

  if (backend === undefined || progressExport === undefined) {
    return (
      <div className="app-page">
        <AppHeader activeRoute="/account" />
        <main className="results-empty" aria-live="polite">
          <span className="loading-dot" aria-hidden="true" />
          <h1>Konto wird vorbereitet</h1>
        </main>
      </div>
    );
  }

  const isLinked =
    account && progressExport.identity.linkedAccountId === account.id;
  const isLinkedElsewhere =
    Boolean(account) &&
    Boolean(progressExport.identity.linkedAccountId) &&
    progressExport.identity.linkedAccountId !== account?.id;

  return (
    <div className="app-page">
      <AppHeader activeRoute="/account" />
      <main className="account-page">
        <section className="account-intro">
          <span className="eyebrow">Local first</span>
          <h1>Dein Lernstand gehört dir.</h1>
          <p>
            Spiele ohne Konto, exportiere jederzeit oder sichere deinen Stand
            später geräteübergreifend.
          </p>

          <dl className="account-local-stats">
            <div>
              <dt>Lokale Ereignisse</dt>
              <dd>{progressExport.progressEvents.length}</dd>
            </div>
            <div>
              <dt>Abzeichen</dt>
              <dd>{progressExport.achievementUnlocks.length}</dd>
            </div>
          </dl>

          <button
            className="button button--secondary"
            type="button"
            onClick={handleExport}
          >
            <Download aria-hidden="true" />
            Lernstand exportieren
          </button>
        </section>

        <section className="account-panel" aria-labelledby="account-heading">
          <div className="account-panel__heading">
            <span>
              {account ? (
                <ShieldCheck aria-hidden="true" />
              ) : (
                <UserRound aria-hidden="true" />
              )}
            </span>
            <div>
              <h2 id="account-heading">
                {account ? "Konto verbunden" : "Anmelden oder Konto erstellen"}
              </h2>
              <p>
                {account
                  ? account.email ?? "Authentifiziertes Profil"
                  : "Passwortlos mit einem Einmalcode per E-Mail."}
              </p>
            </div>
          </div>

          {backend === null ? (
            <div className="account-notice">
              <Cloud aria-hidden="true" />
              <div>
                <strong>Cloud-Sync ist noch nicht konfiguriert</strong>
                <p>
                  Der Gastmodus, lokale Abzeichen und der Export funktionieren.
                  Für Konten fehlen öffentliche Supabase-Buildvariablen.
                </p>
              </div>
            </div>
          ) : account ? (
            <div className="account-actions">
              <div className="account-status">
                <CheckCircle2 aria-hidden="true" />
                <span>
                  <strong>
                    {isLinked
                      ? "Gaststand übernommen"
                      : isLinkedElsewhere
                        ? "Übernahme für dieses Konto gesperrt"
                        : "Bereit zur Übernahme"}
                  </strong>
                  <small>
                    {isLinkedElsewhere
                      ? "Der lokale Stand ist bereits einem anderen Konto zugeordnet."
                      : "Lokale Daten werden nach dem Sync beibehalten."}
                  </small>
                </span>
              </div>
              <button
                className="button button--primary"
                type="button"
                onClick={handleSync}
                disabled={busy || isLinkedElsewhere}
              >
                <RefreshCcw aria-hidden="true" />
                Jetzt synchronisieren
              </button>
              <button
                className="button button--secondary"
                type="button"
                onClick={handleSignOut}
                disabled={busy}
              >
                <LogOut aria-hidden="true" />
                Abmelden
              </button>
            </div>
          ) : (
            <div className="account-form">
              <label htmlFor="account-email">E-Mail-Adresse</label>
              <input
                id="account-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@beispiel.de"
              />
              <button
                className="button button--primary"
                type="button"
                onClick={handleRequestCode}
                disabled={busy || !email.trim()}
              >
                <KeyRound aria-hidden="true" />
                Einmalcode senden
              </button>

              {codeRequested ? (
                <>
                  <label htmlFor="account-token">Sechsstelliger Code</label>
                  <input
                    id="account-token"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    placeholder="123456"
                  />
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={handleVerify}
                    disabled={busy || !token.trim()}
                  >
                    Code bestätigen und Gaststand übernehmen
                  </button>
                </>
              ) : null}
            </div>
          )}

          {message ? (
            <p className="account-message" role="status">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="progress-error" role="alert">
              {error}
            </p>
          ) : null}

          <p className="account-privacy">
            Kontoerstellung ist kein Abzeichen. Öffentliche Profile und
            Ranglisten sind nicht aktiviert.
          </p>
        </section>
      </main>
    </div>
  );
}
