import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  RotateCcw,
  Target
} from "lucide-react";
import { AppHeader } from "../../app/AppHeader";
import { navigate } from "../../app/navigation";
import { geoDataset } from "../../content/dataset";
import { loadDatasetForRankedContent } from "../../content/rankedContent";
import { createContentRepository } from "../../content/repository";
import {
  buildReviewQueue,
  summarizeProgress,
  type ProgressSummary,
  type ReviewQueueItem
} from "../../engine/progress/progress";
import { createReviewRoundDefinition } from "../../engine/quiz/presets";
import { getSessionRepository } from "../../persistence/sessionRepository";
import { requestQuizSession } from "../quiz/sessionIntent";

const baseContentRepository = createContentRepository(geoDataset);

const SKILL_LABELS: Record<string, string> = {
  "city:name_to_map_point": "Hauptstadt auf der Karte finden",
  "city:map_highlight_to_text_input": "Markierte Hauptstadt benennen",
  "country:name_to_text_input:capital_name": "Hauptstadt zu einem Land nennen",
  "city:name_to_text_input:country_name": "Land zu einer Hauptstadt nennen",
  "ranked_city:name_to_map_point": "Große Stadt auf der Karte finden",
  "ranked_city:map_highlight_to_text_input": "Markierte große Stadt benennen",
  "ranked_river:fact_to_text_input": "Flusssystem am Faktenprofil erkennen",
  "ranked_peak:fact_to_text_input": "Berg am Faktenprofil erkennen",
  "country:name_to_map_area": "Land auf der Karte finden",
  "country:map_highlight_to_text_input": "Markiertes Land benennen",
  "country:visual_asset:flag_to_text_input": "Flagge frei benennen",
  "country:visual_asset:flag_to_single_choice:name": "Flagge einem Land zuordnen",
  "country:name_to_single_choice:flag": "Flagge zu einem Land wählen",
  "country:visual_asset:country_outline_to_text_input": "Länderumriss benennen"
};

export function ProgressPage() {
  const [summary, setSummary] = useState<ProgressSummary>();
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [entityNames, setEntityNames] = useState<Map<string, string>>(
    () => new Map()
  );
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    void getSessionRepository()
      .loadProgressEvents()
      .then(async (events) => {
        const nextSummary = summarizeProgress(events);
        const hasRankedCityEvents = events.some(
          (event) =>
            event.entityId.startsWith("geonames:") ||
            event.skillKey.startsWith("ranked_city:")
        );
        const hasRankedPhysicalEvents = events.some(
          (event) =>
            event.skillKey.startsWith("ranked_river:") ||
            event.skillKey.startsWith("ranked_peak:")
        );
        let displayRepository = baseContentRepository;
        let rankedNamesUnavailable = false;

        if (hasRankedCityEvents || hasRankedPhysicalEvents) {
          try {
            displayRepository = createContentRepository(
              await loadDatasetForRankedContent({
                cities: hasRankedCityEvents,
                physical: hasRankedPhysicalEvents
              })
            );
          } catch {
            rankedNamesUnavailable = true;
          }
        }

        if (!cancelled) {
          setSummary(nextSummary);
          setReviewQueue(buildReviewQueue(events));
          setEntityNames(
            new Map(
              nextSummary.weakEntities.flatMap((entity) => {
                const name = displayRepository.getDisplayName(
                  entity.entityId,
                  "de"
                );
                return name ? [[entity.entityId, name] as const] : [];
              })
            )
          );
          if (rankedNamesUnavailable) {
            setLoadError(
              "Namen aus einem Ranglistenpaket konnten nicht geladen werden; der übrige Lernstand ist verfügbar."
            );
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Der lokale Lernstand konnte nicht geladen werden.");
          setSummary(summarizeProgress([]));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!summary) {
    return (
      <div className="app-page">
        <AppHeader activeRoute="/progress" />
        <main className="results-empty" aria-live="polite">
          <span className="loading-dot" aria-hidden="true" />
          <h1>Lernstand wird geladen</h1>
        </main>
      </div>
    );
  }

  const startReview = () => {
    const definition = createReviewRoundDefinition(
      reviewQueue,
      `review:${crypto.randomUUID()}`
    );
    requestQuizSession(definition);
    navigate("/quiz");
  };

  return (
    <div className="app-page">
      <AppHeader activeRoute="/progress" />
      <main className="progress-page">
        <section className="progress-summary">
          <div>
            <h1>Dein lokaler Lernstand</h1>
            <p>
              Rohversuche werden nur auf diesem Gerät gespeichert. Es wird noch
              kein endgültiger Mastery-Wert behauptet.
            </p>
          </div>

          <dl className="progress-stats">
            <div>
              <dt>Antworten</dt>
              <dd>{summary.attempts}</dd>
            </div>
            <div>
              <dt>Genauigkeit</dt>
              <dd>{summary.accuracy} %</dd>
            </div>
            <div>
              <dt>Runden</dt>
              <dd>{summary.completedSessions}</dd>
            </div>
          </dl>

          {loadError ? <p className="progress-error">{loadError}</p> : null}

          <div className="progress-actions">
            {reviewQueue.length ? (
              <button
                className="button button--primary"
                type="button"
                onClick={startReview}
              >
                {reviewQueue.length} offene Fehler wiederholen
                <RotateCcw aria-hidden="true" />
              </button>
            ) : null}
            <button
              className={
                reviewQueue.length
                  ? "button button--secondary"
                  : "button button--primary"
              }
              type="button"
              onClick={() => navigate("/")}
            >
              Neue Runde
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="progress-details">
          <div className="progress-section-heading">
            <BarChart3 aria-hidden="true" />
            <div>
              <h2>Nach Fähigkeit</h2>
              <p>Jede Frage beeinflusst nur ihre konkrete Kombination.</p>
            </div>
          </div>

          <div className="skill-progress-list">
            {summary.skills.length ? (
              summary.skills.map((skill) => (
                <div className="skill-progress-row" key={skill.skillKey}>
                  <span>
                    <strong>
                      {SKILL_LABELS[skill.skillKey] ?? skill.skillKey}
                    </strong>
                    <small>{skill.correct} von {skill.attempts} richtig</small>
                  </span>
                  <div
                    className="skill-progress-track"
                    role="progressbar"
                    aria-label={`${SKILL_LABELS[skill.skillKey] ?? skill.skillKey}: ${skill.accuracy} Prozent`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={skill.accuracy}
                  >
                    <span style={{ width: `${skill.accuracy}%` }} />
                  </div>
                  <strong>{skill.accuracy} %</strong>
                </div>
              ))
            ) : (
              <div className="progress-empty-row">
                <BookOpenCheck aria-hidden="true" />
                Schließe eine Runde ab, um deine Fähigkeiten zu vergleichen.
              </div>
            )}
          </div>

          <div className="progress-section-heading">
            <Target aria-hidden="true" />
            <div>
              <h2>Noch unsicher</h2>
              <p>Objekte mit mindestens einer falschen Antwort.</p>
            </div>
          </div>

          <div className="weak-entity-list">
            {summary.weakEntities.length ? (
              summary.weakEntities.map((entity) => (
                <div className="weak-entity-row" key={entity.entityId}>
                  <RotateCcw aria-hidden="true" />
                  <span>
                    <strong>
                      {entityNames.get(entity.entityId) ?? entity.entityId}
                    </strong>
                    <small>{entity.correct} von {entity.attempts} richtig</small>
                  </span>
                  <strong>{entity.accuracy} %</strong>
                </div>
              ))
            ) : (
              <div className="progress-empty-row">
                <Target aria-hidden="true" />
                Noch keine gespeicherten Fehler.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
