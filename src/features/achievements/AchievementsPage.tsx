import { useEffect, useState } from "react";
import {
  Award,
  BrainCircuit,
  Building2,
  Check,
  Droplets,
  Flag,
  Globe2,
  Landmark,
  LockKeyhole,
  Map as MapIcon,
  Mountain,
  MountainSnow,
  Route,
  Target,
  Waves,
  type LucideIcon
} from "lucide-react";
import { AppHeader } from "../../app/AppHeader";
import {
  achievementDefinitions,
  achievementProgress,
  type AchievementProgress,
  type AchievementUnlock
} from "../../engine/achievements/achievement";
import { getSessionRepository } from "../../persistence/sessionRepository";

const BADGE_ICONS: Record<string, LucideIcon> = {
  capital: Landmark,
  city: Building2,
  compass: Award,
  country: Flag,
  flag: Flag,
  lake: Droplets,
  knowledge: BrainCircuit,
  mountain: Mountain,
  peak: MountainSnow,
  river: Waves,
  sea: Globe2,
  shape: MapIcon,
  route: Route,
  target: Target
};

interface AchievementView {
  progress: AchievementProgress;
  unlock?: AchievementUnlock;
}

export function AchievementsPage() {
  const [achievements, setAchievements] = useState<AchievementView[]>();
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const repository = getSessionRepository();

    void Promise.all([
      repository.loadProgressEvents(),
      repository.loadAchievementUnlocks()
    ])
      .then(([events, unlocks]) => {
        if (cancelled) return;
        const unlockById = new Map(
          unlocks.map((unlock) => [unlock.achievementId, unlock])
        );
        setAchievements(
          achievementProgress(events, achievementDefinitions).map(
            (progress) => ({
              progress,
              unlock: unlockById.get(progress.definition.id)
            })
          )
        );
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Die Abzeichen konnten nicht geladen werden.");
          setAchievements([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!achievements) {
    return (
      <div className="app-page">
        <AppHeader activeRoute="/achievements" />
        <main className="results-empty" aria-live="polite">
          <span className="loading-dot" aria-hidden="true" />
          <h1>Abzeichen werden geladen</h1>
        </main>
      </div>
    );
  }

  const unlockedCount = achievements.filter(
    (achievement) => achievement.unlock
  ).length;

  return (
    <div className="app-page">
      <AppHeader activeRoute="/achievements" />
      <main className="collection-page">
        <section className="collection-intro">
          <div>
            <span className="eyebrow">Sammlung</span>
            <h1>Abzeichen aus deinem Lernstand</h1>
            <p>
              Jede Freischaltung wird aus gespeicherten Antworten berechnet.
              Neue Standardabzeichen brauchen nur eine Definition.
            </p>
          </div>
          <div
            className="collection-count"
            aria-label={`${unlockedCount} von ${achievements.length} freigeschaltet`}
          >
            <strong>{unlockedCount}</strong>
            <span>von {achievements.length}</span>
          </div>
        </section>

        {loadError ? <p className="progress-error">{loadError}</p> : null}

        <section className="badge-grid" aria-label="Abzeichensammlung">
          {achievements.map(({ progress, unlock }) => {
            const Icon =
              BADGE_ICONS[progress.definition.badgeAssetKey] ?? Award;
            const percentage = Math.min(
              100,
              Math.round((progress.value / progress.target) * 100)
            );

            return (
              <article
                className={`badge-card${unlock ? " is-unlocked" : ""}`}
                key={progress.definition.id}
              >
                <div
                  className={`badge-emblem badge-emblem--${progress.definition.tier ?? "bronze"}`}
                >
                  <Icon aria-hidden="true" />
                </div>
                <div className="badge-card__copy">
                  <span className="badge-status">
                    {unlock ? (
                      <>
                        <Check aria-hidden="true" />
                        Freigeschaltet
                      </>
                    ) : (
                      <>
                        <LockKeyhole aria-hidden="true" />
                        In Arbeit
                      </>
                    )}
                  </span>
                  <h2>{progress.definition.title}</h2>
                  <p>{progress.definition.description}</p>
                </div>
                <div className="badge-progress">
                  <span>
                    {Math.min(progress.value, progress.target)} /{" "}
                    {progress.target}
                  </span>
                  <div
                    role="progressbar"
                    aria-label={`${progress.definition.title}: ${percentage} Prozent`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentage}
                  >
                    <span style={{ width: `${percentage}%` }} />
                  </div>
                  <small>
                    {unlock?.verification === "server"
                      ? "Vom Server bestätigt"
                      : unlock
                        ? "Lokal geprüft"
                        : "Noch nicht erreicht"}
                  </small>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
