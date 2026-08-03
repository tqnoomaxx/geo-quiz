import { lazy, Suspense, useEffect, useState } from "react";
import {
  Building2,
  BookOpenCheck,
  BrainCircuit,
  ChevronRight,
  Droplets,
  Flag,
  GraduationCap,
  Globe2,
  Landmark,
  Map as MapIcon,
  Mountain,
  MountainSnow,
  RotateCcw,
  Shuffle,
  Waves
} from "lucide-react";
import { AppHeader } from "../../app/AppHeader";
import { navigate } from "../../app/navigation";
import { geoDataset, datasetManifest } from "../../content/dataset";
import {
  rankedCityIndex,
  type RankedCitySetSize
} from "../../content/rankedCities";
import { rankedPhysicalIndex } from "../../content/rankedPhysical";
import {
  candidateCountForSetup,
  createQuizRoundDefinition,
  DEFAULT_MVP_SETUP,
  describeQuizDefinition,
  MVP_DIRECTIONS,
  MVP_REGIONS,
  type MvpQuestionCount,
  type MvpQuizSetup,
  type MvpRegionId,
  type MvpTimerSeconds,
  type MvpTopic
} from "../../engine/quiz/presets";
import {
  getLearningProfile,
  LEARNING_PROFILES
} from "../../engine/quiz/learningProfiles";
import type { QuizSessionState } from "../../engine/session/session";
import { getSessionRepository } from "../../persistence/sessionRepository";
import { requestQuizSession } from "../quiz/sessionIntent";

const MapPreview = lazy(() =>
  import("../../geo/GeoMap").then((module) => ({
    default: module.MapPreview
  }))
);
const CityExplorer = lazy(() => import("./CityExplorer"));
const CANDIDATE_COUNTS = new Map<string, number>(
  (
    [
      "capitals",
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
      "knowledge",
      "world-mix"
    ] as const
  ).flatMap((topic) =>
    MVP_DIRECTIONS[topic].flatMap((direction) =>
      MVP_REGIONS.map(
        (region) =>
          [
            `${topic}:${direction.id}:${region.id}`,
            candidateCountForSetup(
              topic,
              region.id,
              1000,
              direction.id
            )
          ] as const
      )
    )
  )
);
const PHYSICAL_TYPE_BY_TOPIC = {
  rivers: "river",
  lakes: "lake",
  seas: "sea",
  "mountain-ranges": "mountain_range",
  peaks: "peak"
} as const;

const topics = [
  {
    id: "countries",
    label: "Länder",
    detail: "195 Staaten",
    icon: Globe2,
    available: true
  },
  {
    id: "capitals",
    label: "Hauptstädte",
    detail: "202 Hauptstadtsitze",
    icon: Landmark,
    available: true
  },
  {
    id: "cities",
    label: "Große Städte",
    detail: "Top 100 bis 1000 je Gebiet",
    icon: Building2,
    available: true
  },
  {
    id: "flags",
    label: "Flaggen",
    detail: "195 lokale SVGs",
    icon: Flag,
    available: true
  },
  {
    id: "shapes",
    label: "Länderformen",
    detail: "195 Umrisse",
    icon: MapIcon,
    available: true
  },
  {
    id: "rivers",
    label: "Flüsse · Karte",
    detail: "18 kuratierte Verläufe",
    icon: Waves,
    available: true
  },
  {
    id: "lakes",
    label: "Seen",
    detail: "18 große Seen",
    icon: Droplets,
    available: true
  },
  {
    id: "seas",
    label: "Meere",
    detail: "18 Meeresräume",
    icon: Globe2,
    available: true
  },
  {
    id: "mountain-ranges",
    label: "Gebirge",
    detail: "18 Gebirgsräume",
    icon: Mountain,
    available: true
  },
  {
    id: "peaks",
    label: "Gipfel · Karte",
    detail: "16 markante Gipfel",
    icon: MountainSnow,
    available: true
  },
  {
    id: "longest-rivers",
    label: "Längste Flüsse",
    detail: "Top 100 · Länge, Länder, Mündung",
    icon: Waves,
    available: true
  },
  {
    id: "highest-mountains",
    label: "Höchste Berge",
    detail: "Top 100 · Höhe, Land, Gebirge",
    icon: MountainSnow,
    available: true
  },
  {
    id: "knowledge",
    label: "Wissenspuzzle",
    detail: "20 erklärbare Fragen",
    icon: BrainCircuit,
    available: true
  }
] as const;

function randomSeed() {
  return crypto.randomUUID();
}

export function HomePage() {
  const [setup, setSetup] = useState<MvpQuizSetup>(DEFAULT_MVP_SETUP);
  const [activeSession, setActiveSession] = useState<QuizSessionState>();
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const repository = getSessionRepository();

    void Promise.all([repository.loadActive(), repository.loadSetup()])
      .then(([active, savedSetup]) => {
        if (cancelled) return;

        if (
          active &&
          active.status !== "completed" &&
          active.status !== "abandoned" &&
          active.datasetVersion === geoDataset.version
        ) {
          setActiveSession(active);
        }
        if (savedSetup) {
          const restoredSetup = {
            ...DEFAULT_MVP_SETUP,
            ...savedSetup,
            seed: DEFAULT_MVP_SETUP.seed
          };
          setSetup(
            getLearningProfile(restoredSetup.profile).timerPolicy ===
              "disabled"
              ? { ...restoredSetup, timerSeconds: 0 }
              : restoredSetup
          );
        }
      })
      .catch(() => {
        // Der Quiz-Screen bleibt spielbar und meldet Speicherausfälle.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const countForSetup = (value: MvpQuizSetup) =>
    value.topic === "cities"
      ? candidateCountForSetup(
          value.topic,
          value.regionId,
          value.citySetSize,
          value.direction
        )
      : CANDIDATE_COUNTS.get(
          `${value.topic}:${value.direction}:${value.regionId}`
        ) ?? 0;
  const candidateCount = countForSetup(setup);
  const learningProfile = getLearningProfile(setup.profile);
  const activeDescription = activeSession
    ? describeQuizDefinition(activeSession.definitionSnapshot)
    : undefined;

  const updateSetup = (patch: Partial<MvpQuizSetup>) => {
    setSetup((current) => {
      const next = { ...current, ...patch };
      if (patch.topic && patch.topic !== current.topic) {
        next.direction = MVP_DIRECTIONS[patch.topic][0].id;
        if (patch.topic === "world-mix" && next.questionCount === "all") {
          next.questionCount = 10;
        }
        if (
          countForSetup(next) === 0
        ) {
          next.regionId = "world";
        }
      }
      const count = countForSetup(next);

      if (
        next.topic !== "world-mix" &&
        next.questionCount !== "all" &&
        count < next.questionCount
      ) {
        next.questionCount = count >= 10 ? 10 : "all";
      }
      return next;
    });
  };

  const startQuiz = () => {
    setStarting(true);
    const nextSetup = { ...setup, seed: randomSeed(), includeIds: undefined };
    const definition = createQuizRoundDefinition(nextSetup);
    requestQuizSession(definition);
    void getSessionRepository().saveSetup(nextSetup).catch(() => {
      // Die Auswahl ist Komfortzustand; der Quiz-Intent liegt zusätzlich im RAM.
    });
    navigate("/quiz");
  };

  const resumeQuiz = () => {
    setStarting(true);
    navigate("/quiz");
  };

  return (
    <div className="app-page">
      <AppHeader activeRoute="/" />
      <main className="home-layout">
        <section className="home-intro">
          <div>
            <h1>Die Welt Schritt für Schritt lernen.</h1>
            <p>Wähle ein Thema und starte eine kurze Runde.</p>
          </div>

          <div className="topic-picker">
            <h2>Thema wählen</h2>
            <div className="topic-list">
              {topics.map(({ id, label, detail, icon: Icon, available }) => {
                const selected = id === setup.topic;
                return (
                  <button
                    className={`topic-row${selected ? " is-selected" : ""}`}
                    key={id}
                    type="button"
                    aria-pressed={selected}
                    disabled={!available}
                    onClick={
                      available
                        ? () => updateSetup({ topic: id as MvpTopic })
                        : undefined
                    }
                  >
                    <Icon aria-hidden="true" />
                    <span>
                      {label}
                      <small>{detail}</small>
                    </span>
                    <ChevronRight aria-hidden="true" />
                  </button>
                );
              })}
            </div>

            <button
              className={`topic-row topic-row--mix${setup.topic === "world-mix" ? " is-selected" : ""}`}
              type="button"
              aria-pressed={setup.topic === "world-mix"}
              onClick={() => updateSetup({ topic: "world-mix" })}
            >
              <Shuffle aria-hidden="true" />
              <span>
                Weltmix
                <small>Politische, physische und verknüpfte Fragen</small>
              </span>
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="quiz-setup" aria-labelledby="quiz-setup-title">
          <div className="setup-bar">
            <h2 id="quiz-setup-title">Quiz einrichten</h2>
            <div className="setup-controls">
              <label>
                Fragerichtung
                <span className="select-control">
                  <MapIcon aria-hidden="true" />
                  <select
                    aria-label="Fragerichtung"
                    value={setup.direction}
                    onChange={(event) =>
                      updateSetup({
                        direction: event.target.value as MvpQuizSetup["direction"]
                      })
                    }
                  >
                    {MVP_DIRECTIONS[setup.topic].map((direction) => (
                      <option key={direction.id} value={direction.id}>
                        {direction.label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
              <label>
                Lernmodus
                <span className="select-control">
                  {setup.profile === "learn" ? (
                    <BookOpenCheck aria-hidden="true" />
                  ) : setup.profile === "practice" ? (
                    <RotateCcw aria-hidden="true" />
                  ) : (
                    <GraduationCap aria-hidden="true" />
                  )}
                  <select
                    aria-label="Lernmodus"
                    value={setup.profile}
                    onChange={(event) => {
                      const profile =
                        event.target.value as MvpQuizSetup["profile"];
                      updateSetup({
                        profile,
                        timerSeconds:
                          getLearningProfile(profile).timerPolicy === "disabled"
                            ? 0
                            : setup.timerSeconds
                      });
                    }}
                  >
                    {LEARNING_PROFILES.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.optionLabel}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
              <label>
                Gebiet
                <span className="select-control">
                  <Globe2 aria-hidden="true" />
                  <select
                    aria-label="Gebiet"
                    value={setup.regionId}
                    onChange={(event) =>
                      updateSetup({
                        regionId: event.target.value as MvpRegionId
                      })
                    }
                  >
                    {MVP_REGIONS.map((region) => (
                      <option
                        key={region.id}
                        value={region.id}
                        disabled={
                          setup.topic === "cities"
                            ? candidateCountForSetup(
                                setup.topic,
                                region.id,
                                setup.citySetSize,
                                setup.direction
                              ) === 0
                            : (CANDIDATE_COUNTS.get(
                                `${setup.topic}:${setup.direction}:${region.id}`
                              ) ?? 0) === 0
                        }
                      >
                        {region.label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
              {setup.topic === "cities" ? (
                <label>
                  Stadtset
                  <span className="select-control select-control--plain">
                    <select
                      aria-label="Stadtset"
                      value={setup.citySetSize}
                      onChange={(event) =>
                        updateSetup({
                          citySetSize: Number(
                            event.target.value
                          ) as RankedCitySetSize
                        })
                      }
                    >
                      <option value="100">Top 100</option>
                      <option value="250">Top 250</option>
                      <option value="500">Top 500</option>
                      <option value="1000">Top 1000</option>
                    </select>
                  </span>
                </label>
              ) : null}
              <label>
                Fragen
                <span className="select-control select-control--plain">
                  <select
                    aria-label="Fragen"
                    value={setup.questionCount}
                    onChange={(event) =>
                      updateSetup({
                        questionCount:
                          event.target.value === "all"
                            ? "all"
                            : (Number(event.target.value) as MvpQuestionCount)
                      })
                    }
                  >
                    <option value="10" disabled={candidateCount < 10}>10</option>
                    <option value="20" disabled={candidateCount < 20}>20</option>
                    <option
                      value="all"
                      disabled={setup.topic === "world-mix"}
                    >
                      Alle ({candidateCount})
                    </option>
                  </select>
                </span>
              </label>
              <label>
                Zeitlimit
                <span className="select-control select-control--plain">
                  <select
                    aria-label="Zeit pro Frage"
                    value={setup.timerSeconds}
                    disabled={learningProfile.timerPolicy === "disabled"}
                    onChange={(event) =>
                      updateSetup({
                        timerSeconds: Number(
                          event.target.value
                        ) as MvpTimerSeconds
                      })
                    }
                  >
                    <option value="0">Ohne</option>
                    <option value="15">15 Sekunden</option>
                    <option value="30">30 Sekunden</option>
                  </select>
                </span>
              </label>
              <aside className="learning-mode-note" aria-live="polite">
                <strong>{learningProfile.label}</strong>
                <span>{learningProfile.description}</span>
              </aside>
            </div>
            {setup.topic === "cities" ? (
              <aside className="city-method-note">
                <strong>
                  Top {setup.citySetSize} in{" "}
                  {MVP_REGIONS.find(
                    (region) => region.id === setup.regionId
                  )?.label ?? "Welt"}
                </strong>
                <span>
                  {rankedCityIndex.ranking.labelDe} · Snapshot{" "}
                  {rankedCityIndex.ranking.snapshotDate}
                </span>
                <small>
                  Keine Metropolregionsrangliste.{" "}
                  {rankedCityIndex.ranking.tieBreakDe}.
                </small>
              </aside>
            ) : null}
            {setup.topic === "longest-rivers" ||
            setup.topic === "highest-mountains" ? (
              <aside className="city-method-note">
                <strong>
                  {setup.topic === "longest-rivers"
                    ? "Top 100 Flusssysteme weltweit"
                    : "Top 100 eigenständige Gipfel weltweit"}
                </strong>
                <span>
                  {setup.topic === "longest-rivers"
                    ? rankedPhysicalIndex.rankings.rivers.labelDe
                    : rankedPhysicalIndex.rankings.peaks.labelDe} · Snapshot{" "}
                  {rankedPhysicalIndex.sources.find(
                    (source) =>
                      source.id ===
                      (setup.topic === "longest-rivers"
                        ? rankedPhysicalIndex.rankings.rivers.sourceId
                        : rankedPhysicalIndex.rankings.peaks.sourceId)
                  )?.retrievedAt}
                </span>
                <small>
                  {setup.topic === "longest-rivers"
                    ? rankedPhysicalIndex.rankings.rivers.definitionDe
                    : rankedPhysicalIndex.rankings.peaks.definitionDe}
                </small>
              </aside>
            ) : null}
            <div className="setup-actions">
              <button
                className="button button--primary setup-submit"
                type="button"
                onClick={startQuiz}
                disabled={starting || candidateCount === 0}
              >
                {starting ? "Wird vorbereitet …" : "Quiz starten"}
                <ChevronRight aria-hidden="true" />
              </button>
              {activeDescription ? (
                <button
                  className="button button--secondary resume-button"
                  type="button"
                  onClick={resumeQuiz}
                  disabled={starting}
                >
                  Gespeicherte Runde fortsetzen
                  <small>
                    {activeDescription.mode} · {activeDescription.region}
                  </small>
                </button>
              ) : null}
            </div>
          </div>

          <div className="home-map-frame" aria-label="Vorschau der gewählten Karte">
            <Suspense fallback={<div className="map-skeleton">Karte wird vorbereitet …</div>}>
              {setup.topic === "cities" ? (
                <CityExplorer
                  key={`${setup.regionId}:${setup.citySetSize}`}
                  regionId={setup.regionId}
                  setSize={setup.citySetSize}
                />
              ) : (
                <MapPreview
                  key={`${setup.regionId}:${setup.topic}`}
                  regionId={setup.regionId}
                  physicalEntityType={
                    PHYSICAL_TYPE_BY_TOPIC[
                      setup.topic as keyof typeof PHYSICAL_TYPE_BY_TOPIC
                    ]
                  }
                />
              )}
            </Suspense>
          </div>
          <div className="map-credit map-credit--split">
            <span>
              <Building2 aria-hidden="true" />
              {geoDataset.scopePolicy.labelDe}
            </span>
            <span>
              {setup.topic === "cities"
                ? `GeoNames ${rankedCityIndex.ranking.snapshotDate} · CC BY 4.0`
                : setup.topic === "longest-rivers" ||
                    setup.topic === "highest-mountains"
                  ? `Wikipedia-Listensnapshot ${rankedPhysicalIndex.builtAt.slice(0, 10)} · CC BY-SA 4.0`
                : `Datenstand ${datasetManifest.builtAt.slice(0, 10)} · ODbL/CC0 · Natural Earth`}
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
