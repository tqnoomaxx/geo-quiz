import { useEffect, useState } from "react";
import {
  BookOpenCheck,
  BrainCircuit,
  Building2,
  Camera,
  ChevronDown,
  ChevronRight,
  Droplets,
  Flag,
  Globe2,
  GraduationCap,
  Landmark,
  Map as MapIcon,
  Mountain,
  MountainSnow,
  Moon,
  Orbit,
  RotateCcw,
  Shuffle,
  Sparkles,
  Star,
  Waves
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppHeader } from "../../app/AppHeader";
import { navigate } from "../../app/navigation";
import { datasetManifest, geoDataset } from "../../content/dataset";
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
  ZODIAC_OPTIONAL_FIELD_IDS,
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
import { VisualAssetGraphic } from "../quiz/VisualAssetGraphic";
import { requestQuizSession } from "../quiz/sessionIntent";

type Challenge = {
  id: MvpTopic;
  label: string;
  detail: string;
  icon: LucideIcon;
};

const CHALLENGE_GROUPS: Array<{ label: string; challenges: Challenge[] }> = [
  {
    label: "Länder & Menschen",
    challenges: [
      {
        id: "countries",
        label: "Länder finden",
        detail: "Länder auf der Karte finden oder benennen",
        icon: Globe2
      },
      {
        id: "capitals",
        label: "Hauptstädte",
        detail: "Stadt, Land und Lage miteinander verbinden",
        icon: Landmark
      },
      {
        id: "country-profile",
        label: "Länderprofil",
        detail: "Hauptstadt, Amtssprache und Währung",
        icon: BookOpenCheck
      },
      {
        id: "flags",
        label: "Flaggen",
        detail: "Flaggen erkennen und Ländern zuordnen",
        icon: Flag
      },
      {
        id: "shapes",
        label: "Länderformen",
        detail: "Länder an ihrem Umriss erkennen",
        icon: MapIcon
      },
      {
        id: "cities",
        label: "Große Städte",
        detail: "Die größten 100 bis 1000 Städte je Gebiet",
        icon: Building2
      },
      {
        id: "landmarks",
        label: "Sehenswürdigkeiten & Naturhighlights",
        detail: "12 berühmte Orte am Foto erkennen – mit Funfacts",
        icon: Camera
      }
    ]
  },
  {
    label: "Natur",
    challenges: [
      {
        id: "rivers",
        label: "Flüsse auf der Karte",
        detail: "18 wichtige Flussverläufe",
        icon: Waves
      },
      {
        id: "lakes",
        label: "Seen",
        detail: "18 große Seen erkennen und finden",
        icon: Droplets
      },
      {
        id: "seas",
        label: "Meere",
        detail: "18 Meeresräume erkennen und finden",
        icon: Globe2
      },
      {
        id: "mountain-ranges",
        label: "Gebirge",
        detail: "18 Gebirgsräume erkennen und finden",
        icon: Mountain
      },
      {
        id: "peaks",
        label: "Gipfel auf der Karte",
        detail: "16 markante Gipfel",
        icon: MountainSnow
      },
      {
        id: "longest-rivers",
        label: "Die längsten Flüsse",
        detail: "Top 100 mit Länge, Ländern und Mündung",
        icon: Waves
      },
      {
        id: "highest-mountains",
        label: "Die höchsten Berge",
        detail: "Top 100 mit Höhe, Land und Gebirge",
        icon: MountainSnow
      }
    ]
  },
  {
    label: "Weltraum",
    challenges: [
      {
        id: "planets",
        label: "Planeten",
        detail: "Alle 8 Planeten anhand ihrer Merkmale",
        icon: Orbit
      },
      {
        id: "moons",
        label: "Monde",
        detail: "20 bekannte Monde und ihre Planeten",
        icon: Moon
      },
      {
        id: "dwarf-planets",
        label: "Zwergplaneten",
        detail: "Ceres, Pluto, Haumea, Makemake und Eris",
        icon: Sparkles
      },
      {
        id: "zodiac",
        label: "Sternzeichen",
        detail: "12 Sternbilder erkennen und benennen",
        icon: Star
      }
    ]
  },
  {
    label: "Gemischt",
    challenges: [
      {
        id: "knowledge",
        label: "Wissenspuzzle",
        detail: "Fakten kombinieren und die Lösung herleiten",
        icon: BrainCircuit
      },
      {
        id: "world-mix",
        label: "Weltmix",
        detail: "Politik, Natur, Karten und Wissen gemischt",
        icon: Shuffle
      }
    ]
  }
];

const CHALLENGES = CHALLENGE_GROUPS.flatMap((group) => group.challenges);
const HOME_DEFAULT_SETUP: MvpQuizSetup = {
  ...DEFAULT_MVP_SETUP,
  topic: "country-profile",
  direction: "profile",
  regionId: "world",
  profile: "learn"
};

const MODE_COPY = {
  learn: "Lösung jederzeit ansehen",
  practice: "Direktes Feedback ohne Wiederholungen",
  exam: "Auswertung erst nach der letzten Frage"
} as const;

const MODE_ICONS = {
  learn: BookOpenCheck,
  practice: RotateCcw,
  exam: GraduationCap
} as const;

const DIRECTION_COPY: Partial<Record<MvpQuizSetup["direction"], string>> = {
  locate: "Du siehst einen Namen und wählst den Ort auf der Karte.",
  name: "Du siehst die Karte oder ein Bild und gibst den Namen ein.",
  country_to_name: "Du siehst ein Land und nennst seine Hauptstadt.",
  name_to_country: "Du siehst eine Hauptstadt und nennst das Land.",
  choice: "Du wählst aus vier gut unterscheidbaren Antworten.",
  reverse_choice: "Du siehst ein Land und wählst seine Flagge.",
  facts_to_name: "Du leitest den Namen aus einem kurzen Faktenprofil ab.",
  profile: "Du ergänzt drei wichtige Fakten zu einem vorgegebenen Land.",
  mix: "Verschiedene vorhandene Challenges wechseln sich ab."
};

function randomSeed() {
  return crypto.randomUUID();
}

function setupCandidateCount(value: MvpQuizSetup) {
  return candidateCountForSetup(
    value.topic,
    value.regionId,
    value.citySetSize,
    value.direction
  );
}

const ASTRONOMY_TOPICS = new Set<MvpTopic>([
  "planets",
  "moons",
  "dwarf-planets",
  "zodiac"
]);

export function questionCountOptions(
  topic: MvpTopic,
  candidateCount: number
): MvpQuestionCount[] {
  if (topic === "world-mix") return [10, 20];
  if (topic === "planets" || topic === "zodiac") return [6, "all"];
  if (topic === "moons") return [10, "all"];
  if (topic === "dwarf-planets" || candidateCount < 6) return ["all"];

  const counts: MvpQuestionCount[] = [6];
  if (candidateCount > 10) counts.push(10);
  if (candidateCount > 20) counts.push(20);
  counts.push("all");
  return counts;
}

function ChallengePreview({
  challenge,
  setup
}: {
  challenge: Challenge;
  setup: MvpQuizSetup;
}) {
  const Icon = challenge.icon;
  if (challenge.id === "country-profile") {
    return (
      <aside className="challenge-preview challenge-preview--profile">
        <div className="challenge-preview__heading">
          <div className="challenge-preview__flag">
            <VisualAssetGraphic
              asset={{
                kind: "flag",
                key: "visual:flag:country:de",
                entityId: "country:de"
              }}
              accessibleLabel="Flagge von Deutschland"
              compact
            />
          </div>
          <div>
            <span>Beispiel</span>
            <strong>Deutschland</strong>
          </div>
        </div>
        <dl>
          <div><dt>Hauptstadt</dt><dd>Berlin</dd></div>
          <div><dt>Amtssprache</dt><dd>Deutsch</dd></div>
          <div><dt>Währung</dt><dd>Euro</dd></div>
        </dl>
      </aside>
    );
  }

  if (challenge.id === "zodiac") {
    const selectedFields = [
      { id: "name", label: "Name", value: "Löwe" },
      { id: "iau-abbreviation", label: "IAU-Kürzel", value: "Leo" },
      { id: "best-visibility", label: "Beste Sichtbarkeit", value: "April" },
      { id: "sky-position", label: "Himmelslage", value: "Nordhimmel" }
    ].filter(
      (field) =>
        field.id === "name" ||
        setup.astronomyFieldIds.includes(
          field.id as (typeof ZODIAC_OPTIONAL_FIELD_IDS)[number]
        )
    );
    return (
      <aside className="challenge-preview challenge-preview--zodiac">
        <div className="challenge-preview__constellation">
          <VisualAssetGraphic
            asset={{
              kind: "constellation_chart",
              key: "visual:constellation_chart:constellation:leo",
              entityId: "constellation:leo"
            }}
            accessibleLabel="Beispiel einer vereinfachten Sternbildkarte"
          />
        </div>
        <div>
          <span>Vorschau</span>
          <strong>Du bestimmst den Umfang</strong>
          <dl>
            {selectedFields.map((field) => (
              <div key={field.id}>
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    );
  }

  return (
    <aside className="challenge-preview">
      <Icon aria-hidden="true" />
      <span>So läuft die Challenge</span>
      <strong>{challenge.label}</strong>
      <p>{challenge.detail}</p>
    </aside>
  );
}

export function HomePage() {
  const [setup, setSetup] = useState<MvpQuizSetup>(HOME_DEFAULT_SETUP);
  const [activeSession, setActiveSession] = useState<QuizSessionState>();
  const [starting, setStarting] = useState(false);
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false);

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
            ...HOME_DEFAULT_SETUP,
            ...savedSetup,
            seed: HOME_DEFAULT_SETUP.seed
          };
          setSetup(
            getLearningProfile(restoredSetup.profile).timerPolicy === "disabled"
              ? { ...restoredSetup, timerSeconds: 0 }
              : restoredSetup
          );
        }
      })
      .catch(() => {
        // Die Runde bleibt ohne gespeicherte Komfortauswahl spielbar.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const candidateCount = setupCandidateCount(setup);
  const selectedChallenge =
    CHALLENGES.find((challenge) => challenge.id === setup.topic) ??
    CHALLENGES[0];
  const selectedDirections = MVP_DIRECTIONS[setup.topic];
  const activeDescription = activeSession
    ? describeQuizDefinition(activeSession.definitionSnapshot)
    : undefined;

  const updateSetup = (patch: Partial<MvpQuizSetup>) => {
    setSetup((current) => {
      const next = { ...current, ...patch };
      if (patch.topic && patch.topic !== current.topic) {
        next.direction = MVP_DIRECTIONS[patch.topic][0].id;
        if (ASTRONOMY_TOPICS.has(patch.topic)) next.regionId = "world";
        if (patch.topic === "world-mix" && next.questionCount === "all") {
          next.questionCount = 10;
        }
        if (setupCandidateCount(next) === 0) next.regionId = "world";
      }
      const count = setupCandidateCount(next);
      const availableCounts = questionCountOptions(next.topic, count);
      if (!availableCounts.includes(next.questionCount)) {
        next.questionCount = availableCounts[0] ?? "all";
      }
      return next;
    });
  };

  const chooseChallenge = (topic: MvpTopic) => {
    updateSetup({ topic });
    setMobilePickerOpen(false);
  };

  const startQuiz = () => {
    setStarting(true);
    const nextSetup = { ...setup, seed: randomSeed(), includeIds: undefined };
    requestQuizSession(createQuizRoundDefinition(nextSetup));
    void getSessionRepository().saveSetup(nextSetup).catch(() => undefined);
    navigate("/quiz");
  };

  const startLabel =
    setup.questionCount === "all"
      ? `Alle ${candidateCount} Fragen starten`
      : `${setup.questionCount} Fragen starten`;
  const availableQuestionCounts = questionCountOptions(
    setup.topic,
    candidateCount
  );
  const availableRegions = MVP_REGIONS.filter(
    (region) => setupCandidateCount({ ...setup, regionId: region.id }) > 0
  );
  const showsRegionSelection =
    !ASTRONOMY_TOPICS.has(setup.topic) && availableRegions.length > 1;

  return (
    <div className="app-page">
      <AppHeader activeRoute="/" />
      <main className="challenge-home">
        <header className="challenge-home__intro">
          <p className="eyebrow">Deine nächste Runde</p>
          <h1>Was möchtest du heute üben?</h1>
          <p>Wähle eine Challenge. Den Rest stellst du in wenigen Klicks ein.</p>
        </header>

        <div className="challenge-workspace">
          <aside
            className={`challenge-index${mobilePickerOpen ? " is-mobile-open" : ""}`}
            aria-label="Challenges"
          >
            {CHALLENGE_GROUPS.map((group) => (
              <section key={group.label}>
                <h2>{group.label}</h2>
                <div>
                  {group.challenges.map((challenge) => {
                    const Icon = challenge.icon;
                    const selected = challenge.id === setup.topic;
                    return (
                      <button
                        key={challenge.id}
                        type="button"
                        data-topic-id={challenge.id}
                        className={`challenge-row${selected ? " is-selected" : ""}`}
                        aria-pressed={selected}
                        onClick={() => chooseChallenge(challenge.id)}
                      >
                        <Icon aria-hidden="true" />
                        <span>
                          <strong>{challenge.label}</strong>
                          <small>{challenge.detail}</small>
                        </span>
                        <ChevronRight aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </aside>

          <section className="challenge-config" aria-labelledby="challenge-title">
            <div className="challenge-config__header">
              <div>
                <button
                  className="challenge-switch"
                  type="button"
                  aria-expanded={mobilePickerOpen}
                  onClick={() => setMobilePickerOpen((open) => !open)}
                >
                  Challenge wechseln
                  <ChevronDown aria-hidden="true" />
                </button>
                <h2 id="challenge-title">{selectedChallenge.label}</h2>
                <p>{selectedChallenge.detail}</p>
              </div>
              {activeDescription ? (
                <button
                  className="resume-compact"
                  type="button"
                  onClick={() => navigate("/quiz")}
                  disabled={starting}
                >
                  Runde fortsetzen
                  <small>{activeDescription.mode} · {activeDescription.region}</small>
                </button>
              ) : null}
            </div>

            <div className="challenge-settings">
              <fieldset className="setting-group setting-group--modes">
                <legend>Wie möchtest du lernen?</legend>
                <div className="mode-options">
                  {LEARNING_PROFILES.map((profile) => {
                    const Icon = MODE_ICONS[profile.id];
                    const selected = setup.profile === profile.id;
                    return (
                      <button
                        key={profile.id}
                        type="button"
                        data-profile-id={profile.id}
                        className={selected ? "is-selected" : ""}
                        aria-pressed={selected}
                        onClick={() =>
                          updateSetup({
                            profile: profile.id,
                            timerSeconds:
                              profile.timerPolicy === "disabled"
                                ? 0
                                : setup.timerSeconds
                          })
                        }
                      >
                        <Icon aria-hidden="true" />
                        <span><strong>{profile.label}</strong><small>{MODE_COPY[profile.id]}</small></span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {selectedDirections.length > 1 ? (
                <fieldset className="setting-group">
                  <legend>Wie wird gefragt?</legend>
                  <div className="direction-options">
                    {selectedDirections.map((direction) => (
                      <button
                        key={direction.id}
                        type="button"
                        data-direction-id={direction.id}
                        className={setup.direction === direction.id ? "is-selected" : ""}
                        aria-pressed={setup.direction === direction.id}
                        onClick={() => updateSetup({ direction: direction.id })}
                      >
                        <strong>{direction.label}</strong>
                        <small>{DIRECTION_COPY[direction.id]}</small>
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {showsRegionSelection ? (
                <fieldset className="setting-group">
                  <legend>Welches Gebiet?</legend>
                  <div className="choice-pills choice-pills--regions">
                    {MVP_REGIONS.map((region) => {
                      const available =
                        setupCandidateCount({ ...setup, regionId: region.id }) > 0;
                      return (
                        <button
                          key={region.id}
                          type="button"
                          data-region-id={region.id}
                          className={setup.regionId === region.id ? "is-selected" : ""}
                          aria-pressed={setup.regionId === region.id}
                          disabled={!available}
                          onClick={() => updateSetup({ regionId: region.id as MvpRegionId })}
                        >
                          {region.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}

              <fieldset className="setting-group">
                <legend>Wie lang?</legend>
                <div className="choice-pills">
                  {availableQuestionCounts.map((count) => {
                    return (
                      <button
                        key={count}
                        type="button"
                        data-question-count={count}
                        className={setup.questionCount === count ? "is-selected" : ""}
                        aria-pressed={setup.questionCount === count}
                        onClick={() => updateSetup({ questionCount: count as MvpQuestionCount })}
                      >
                        {count === "all" ? `Alle (${candidateCount})` : count}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {setup.topic === "zodiac" ? (
                <fieldset className="setting-group zodiac-field-settings">
                  <legend>Was möchtest du eingeben?</legend>
                  <div className="profile-field-options">
                    <label>
                      <input type="checkbox" checked disabled />
                      <span><strong>Name</strong><small>Der deutsche Name ist immer dabei.</small></span>
                      <em>Pflicht</em>
                    </label>
                    {[
                      {
                        id: "iau-abbreviation",
                        label: "IAU-Kürzel",
                        detail: "Das offizielle Kürzel, zum Beispiel Leo."
                      },
                      {
                        id: "best-visibility",
                        label: "Beste Sichtbarkeit",
                        detail: "Der Monat gegen 22 Uhr in Mitteleuropa."
                      },
                      {
                        id: "sky-position",
                        label: "Himmelslage",
                        detail: "Nordhimmel, äquatornah oder Südhimmel."
                      }
                    ].map((field) => {
                      const fieldId = field.id as (typeof ZODIAC_OPTIONAL_FIELD_IDS)[number];
                      const checked = setup.astronomyFieldIds.includes(fieldId);
                      return (
                        <label key={field.id}>
                          <input
                            type="checkbox"
                            data-zodiac-field-id={field.id}
                            checked={checked}
                            onChange={() =>
                              updateSetup({
                                astronomyFieldIds: checked
                                  ? setup.astronomyFieldIds.filter((id) => id !== fieldId)
                                  : [...setup.astronomyFieldIds, fieldId]
                              })
                            }
                          />
                          <span><strong>{field.label}</strong><small>{field.detail}</small></span>
                          <em>Optional</em>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}

              <details className="advanced-settings">
                <summary>Weitere Einstellungen <ChevronDown aria-hidden="true" /></summary>
                <div>
                  {setup.topic === "cities" ? (
                    <fieldset className="setting-group">
                      <legend>Wie viele Städte gehören zum Lernset?</legend>
                      <div className="choice-pills">
                        {([100, 250, 500, 1000] as const).map((size) => (
                          <button
                            key={size}
                            type="button"
                            data-city-set-size={size}
                            className={setup.citySetSize === size ? "is-selected" : ""}
                            aria-pressed={setup.citySetSize === size}
                            onClick={() => updateSetup({ citySetSize: size as RankedCitySetSize })}
                          >
                            Top {size}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  ) : null}
                  <fieldset className="setting-group">
                    <legend>Zeit pro Frage</legend>
                    <div className="choice-pills">
                      {([0, 15, 30] as const).map((seconds) => (
                        <button
                          key={seconds}
                          type="button"
                          data-timer-seconds={seconds}
                          className={setup.timerSeconds === seconds ? "is-selected" : ""}
                          aria-pressed={setup.timerSeconds === seconds}
                          disabled={setup.profile !== "exam" && seconds > 0}
                          onClick={() => updateSetup({ timerSeconds: seconds as MvpTimerSeconds })}
                        >
                          {seconds === 0 ? "Ohne Zeitlimit" : `${seconds} Sekunden`}
                        </button>
                      ))}
                    </div>
                    {setup.profile !== "exam" ? (
                      <small>Ein Zeitlimit gibt es nur im Prüfungsmodus.</small>
                    ) : null}
                  </fieldset>
                  <p className="source-note">
                    {setup.topic === "cities"
                      ? `${rankedCityIndex.ranking.labelDe} · Snapshot ${rankedCityIndex.ranking.snapshotDate}`
                      : setup.topic === "longest-rivers"
                        ? rankedPhysicalIndex.rankings.rivers.definitionDe
                      : setup.topic === "highest-mountains"
                          ? rankedPhysicalIndex.rankings.peaks.definitionDe
                          : ASTRONOMY_TOPICS.has(setup.topic)
                            ? setup.topic === "zodiac"
                              ? "IAU-Sternbilder · lokale Lernkarten · keine Horoskope"
                              : "NASA Solar System Exploration · kuratierter Offline-Snapshot"
                          : `${geoDataset.scopePolicy.labelDe} · Datenstand ${datasetManifest.builtAt.slice(0, 10)}`}
                  </p>
                </div>
              </details>
            </div>

            <ChallengePreview challenge={selectedChallenge} setup={setup} />

            <div className="challenge-start">
              <div>
                <strong>{startLabel}</strong>
                <span>{getLearningProfile(setup.profile).description}</span>
              </div>
              <button
                className="button button--primary"
                type="button"
                onClick={startQuiz}
                disabled={starting || candidateCount === 0}
              >
                {starting ? "Wird vorbereitet …" : startLabel}
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
