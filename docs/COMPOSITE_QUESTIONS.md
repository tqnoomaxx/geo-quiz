# Gemischte Runden und zusammengesetzte Wissensfragen

## Zwei unterschiedliche Modi

### Weltmix

Der Weltmix mischt vorhandene, bereits getestete Quizarten:

1. Hauptstadt auf der Karte.
2. Flagge erkennen.
3. Fluss auswählen.
4. Land eintippen.
5. Gebirge zuordnen.
6. Wissenspuzzle lösen.

Er ist ein Orchestrator über Quizpools, keine eigene Fachengine.

### Wissenspuzzle

Wissenspuzzles kombinieren mehrere Fakten oder Relationen:

> Welches ist nach Landfläche das zweitgrößte Land, in dem Portugiesisch
> Amtssprache ist?

Antwort im zugrunde gelegten Datensatz: **Angola**.

„Amtssprache“ ist hier absichtlich präziser als „Muttersprache“. Eine
Muttersprache ist kein einfacher Länderwert, sondern eine veränderliche
Bevölkerungsstatistik mit Anteil, Erhebungsmethode und Bezugsjahr.

## MixedQuizDefinition

```ts
interface MixedQuizDefinition {
  id: string;
  schemaVersion: 1;
  datasetVersion: string;

  pools: Array<{
    id: string;
    quizDefinitionIds: string[];
    weight: number;
    minQuestions?: number;
    maxQuestions?: number;
  }>;

  schedule: {
    questionCount: number;
    avoidSameSubjectTwice: boolean;
    avoidSameAnswerKindTwice?: boolean;
    maxConsecutiveFromPool: number;
    difficultyCurve: "flat" | "rising" | "adaptive";
    seed?: string;
  };

  rules: {
    timer:
      | { kind: "none" }
      | { kind: "per_question"; seconds: number }
      | { kind: "per_answer_kind"; seconds: Record<string, number> };
    feedback: "immediate" | "end";
    retryMistakes: boolean;
  };
}
```

### Beispiel Weltmix

```json
{
  "id": "world-mix-standard",
  "schemaVersion": 1,
  "datasetVersion": "geo-core-2026-01",
  "pools": [
    {
      "id": "political",
      "quizDefinitionIds": [
        "countries-world-map-area",
        "capitals-world-map-point",
        "flags-world-text"
      ],
      "weight": 4,
      "minQuestions": 6
    },
    {
      "id": "physical",
      "quizDefinitionIds": [
        "rivers-world-map-line",
        "ranges-world-map-highlight"
      ],
      "weight": 3,
      "minQuestions": 4
    },
    {
      "id": "knowledge",
      "quizDefinitionIds": ["knowledge-puzzles-world"],
      "weight": 2,
      "minQuestions": 2
    }
  ],
  "schedule": {
    "questionCount": 20,
    "avoidSameSubjectTwice": true,
    "avoidSameAnswerKindTwice": true,
    "maxConsecutiveFromPool": 2,
    "difficultyCurve": "rising"
  },
  "rules": {
    "timer": { "kind": "none" },
    "feedback": "immediate",
    "retryMistakes": false
  }
}
```

Der Scheduler erfüllt zuerst Mindestanteile, verteilt danach anhand der
Gewichte und mischt deterministisch per Seed. Ein Pool, der wegen Scope oder
fehlender Daten nicht genügend Fragen liefern kann, wird vor Rundenstart
gemeldet und nicht mitten in der Runde still ersetzt.

### Ausführbarer Phase-4-Schnitt

Der erste produktive `MixedQuizDefinition`-Vertrag bettet die vollständigen
Quell-Definitionen in den serialisierbaren Rundensnapshot ein:

```ts
interface MixedQuizDefinition {
  kind: "mixed";
  id: string;
  schemaVersion: 1;
  datasetVersion: string;
  label: string;
  profile: "learn" | "practice" | "exam";
  scope: { regionIds: string[] };
  pools: Array<{
    id: string;
    definition: QuizDefinition;
    weight: number;
    minimum: number;
    maximum: number;
  }>;
  schedule: { maxConsecutiveFromPool: number };
  rules: QuizRules;
}
```

Der Phase-4-Weltmix enthält die Pools `countries`, `capitals`, `flags` und
`shapes`. Der Scheduler:

1. reserviert die Mindestmengen;
2. verteilt den Rest gewichtet bis zu den Maxima;
3. ruft pro Pool den normalen Fragengenerator mit abgeleitetem Seed auf;
4. ordnet die fertigen Fragen mit Wechselregel;
5. vergibt globale IDs und Ordinale.

Bewertung, Timer, Persistenz und Fortschrittsereignisse bleiben unverändert.
Unit- und Produktions-Browsertests prüfen feste Seed-Reproduktion,
Poolmitgliedschaft und den Übergang zwischen Karten-, Text- und visuellen
Fragen.

### Ausführbarer Phase-5-Schnitt

Der Schedulervertrag bleibt unverändert. Der Weltmix ergänzt lediglich fünf
normale Pools: `rivers`, `lakes`, `seas`, `mountain-ranges` und `peaks`.
Eine Zehn-Fragen-Runde reserviert je eine Frage aus allen neun Pools und
verteilt den verbleibenden Platz gewichtet. Eine 20er-Runde verwendet dieselben
Minima, Maxima und die vorhandene Wechselregel.

Da jede erzeugte Frage `sourceDefinitionId`, `sourcePoolId`, `entityType` und
ihren normalen Grader trägt, kann eine Runde etwa von Hauptstadtpunkt zu
Flusslinie, Flaggenauswahl und Gebirgsfläche wechseln. Session, Timer,
Persistenz, Fortschritt und Fehlertraining kennen weiterhin keinen
Weltmix-Sonderfall.

## Wissenspuzzle als Faktenabfrage

Wissenspuzzles werden nicht frei von einem Sprachmodell zur Laufzeit erfunden.
Sie entstehen aus geprüften Templates, einem versionierten Faktengraphen und
einem Build-Schritt.

```ts
interface DerivedQuestionDefinition {
  id: string;
  schemaVersion: 1;
  subjectType: EntityTypeId;
  locale: string;

  candidateFilter: Expression;
  ranking?: {
    factType: string;
    direction: "ascending" | "descending";
    rank: number;
    missingValuePolicy: "reject";
  };
  projection: {
    answerEntity: "candidate";
    answerField: "name";
  };

  promptTemplate: string;
  explanationTemplate: string;
  requiredSourceTypes: string[];
  difficulty: number;
}
```

### Beispieldefinition

```json
{
  "id": "country-official-language-area-rank",
  "schemaVersion": 1,
  "subjectType": "country",
  "locale": "de",
  "candidateFilter": {
    "relation": "has_official_language",
    "targetId": "language:pt"
  },
  "ranking": {
    "factType": "land_area_km2",
    "direction": "descending",
    "rank": 2,
    "missingValuePolicy": "reject"
  },
  "projection": {
    "answerEntity": "candidate",
    "answerField": "name"
  },
  "promptTemplate": "Welches ist nach Landfläche das zweitgrößte Land, in dem Portugiesisch Amtssprache ist?",
  "explanationTemplate": "{answer} liegt in dieser Auswahl nach {rank1} an zweiter Stelle: {answerValue} km².",
  "requiredSourceTypes": ["official_language", "land_area"],
  "difficulty": 4
}
```

## Unterstützte Operationen

Die erste sichere Abfragesprache bleibt klein:

- Relation vorhanden/nicht vorhanden.
- Zugehörigkeit zu Gebiet oder Gruppe.
- Vergleich eines numerischen Fakts.
- Rang `n` auf- oder absteigend.
- Maximum/Minimum.
- Schnittmenge mehrerer Relationen.
- Anzahl verbundener Entitäten.
- genau eine oder mehrere erwartete Antworten.

Beliebige Skripte, freie SQL-Fragmente oder dynamisch ausgeführter Code gehören
nicht in Content-Dateien.

## Mögliche Wissenspuzzles

- Welches ist das größte Binnenland nach Fläche?
- Welche Hauptstadt gehört zum flächenmäßig größten Nachbarland Deutschlands?
- Welches Land in Südamerika hat die drittgrößte Bevölkerung?
- Welcher der gezeigten Flüsse fließt durch die meisten Länder?
- Welches Land grenzt sowohl an Land A als auch an Land B?
- Welche Hauptstadt liegt am höchsten, bezogen auf den verwendeten
  Höhendatensatz?
- Welches Land erfüllt zugleich Region, Sprache und Währungsrelation?
- Ordne diese Länder nach Fläche, Bevölkerung oder höchstem Punkt.

Jede sichtbare Formulierung nennt oder erklärt die Vergleichsdefinition:
Landfläche versus Gesamtfläche, Amtssprache versus gesprochene Sprache,
Stadtgebiet versus Agglomeration.

## Build-Zeit-Compiler

Für jedes Template und jeden Dataset-Snapshot:

1. Kandidatenmenge berechnen.
2. Nullwerte nach Regel behandeln.
3. Ranking oder Relationskette ausführen.
4. Eindeutigkeit der erwarteten Antwort beweisen.
5. Gleichstände erkennen und Frage verwerfen oder explizit formulieren.
6. Faktenquellen, Werte und Bezugsdaten in die Erklärung übernehmen.
7. Schwierigkeit und Distraktoren berechnen.
8. Stabile `knowledge_question`-Entitäten, `has_answer` und
   Erklärungsdatensätze ausgeben; der normale Quizgenerator erzeugt daraus
   später konkrete `QuestionInstance`s.

Eine nicht eindeutige oder nicht belegbare Frage blockiert den Content-Build.

Der Phase-6-Compiler setzt davon zunächst Relations- und Faktenfilter,
Schnittmengen, Ranking sowie einen optionalen eindeutigen Relationspfad um.
Auf- und absteigender Rang 1 decken Minimum und Maximum ab. Anzahlfragen und
längere Pfade bleiben eine spätere, explizit versionierte Erweiterung der
sicheren Sprache.

## Erklärbares Feedback

Nach der Antwort zeigt die App:

- richtige Antwort;
- verwendete Definition;
- die entscheidenden Vergleichswerte oder Relationsschritte;
- Datenquelle und Bezugsjahr;
- optional die relevanten Länder/Flüsse/Regionen auf der Karte.

So wird der Modus zu echtem Geographiewissen und nicht zu undurchsichtigem
Trickfragenraten.

## Testmatrix

- erwartete Antwort eindeutig;
- Ranking mit Gleichstand;
- fehlender Fakt;
- Fakten aus unterschiedlichen Bezugsjahren;
- Relationskette ohne Treffer;
- zu viele Treffer;
- übersetzter Name und Alias;
- Dataset-Update verändert Antwort;
- Erklärung stimmt exakt mit den verwendeten Fakten überein;
- feste Seeds liefern dieselbe Mixed-Reihenfolge.
