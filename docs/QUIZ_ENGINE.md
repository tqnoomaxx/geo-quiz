# Modulares Quizsystem

## Grundidee

Eine Quizart ist Datenkonfiguration, nicht eine neue Seite mit eigener
Fachlogik.

```text
QuizDefinition
├── content   Was wird abgefragt?
├── prompt    Wie wird die Frage gezeigt?
├── answer    Wie antwortet die Person?
├── scope     Welcher geographische Umfang gilt?
└── rules     Wie läuft und zählt die Runde?
```

Damit können beispielsweise „Hauptstädte Europas auf der Karte mit 15 Sekunden“
und „Flaggen Südamerikas eintippen ohne Zeitlimit“ dieselbe Engine verwenden.

Ein themenübergreifender Weltmix plant konkrete Fragen aus mehreren
QuizDefinitionen. Zusammengesetzte Wissensfragen werden beim Content-Build
kompiliert und erscheinen zur Laufzeit ebenfalls als normale
`QuestionInstance`. Details stehen in
[`COMPOSITE_QUESTIONS.md`](COMPOSITE_QUESTIONS.md).

## Die fünf Achsen

### 1. Inhalt

| Entität | Erste sinnvolle Relationen |
|---|---|
| `country` | `has_capital`, `in_continent`, `borders` |
| `city` | `located_in`, `is_capital_of` |
| `river` | `flows_through`, `mouth_in`, `source_in` |
| `lake` | `located_in`, `drains_to` |
| `mountain_range` | `located_in`, `contains_peak` |
| `peak` | `located_in`, `part_of_range` |
| `sea` / `ocean` | `borders`, `part_of` |
| `admin_region` | `part_of`, `has_capital` |

Weitere Inhalte werden als Entitäten, Relationen und Fakten ergänzt, nicht als
neue Engine.

### 2. Fragepräsentation

- `name`: Name des Subjekts oder einer verbundenen Entität.
- `visual_asset`: Flagge, Silhouette oder später Foto.
- `map_highlight`: Punkt, Fläche oder Linie wird hervorgehoben.
- `fact`: Fakt wie Bevölkerung, Höhe oder Länge.
- `description`: kurze textliche Beschreibung für spätere Spezialmodi.

### 3. Antwortmodus

- `text_input`
- `single_choice`
- `multi_choice`
- `map_point`
- `map_area`
- `map_line`
- `drag_match`
- `sort_order`

`map_line` bedeutet zunächst „aus hervorgehobenen Linien wählen“. Freies
Nachzeichnen eines Flusses ist eine spätere, eigene Ausbaustufe.

### 4. Gebiet und Auswahl

- Welt, Kontinent, Region, Land oder benutzerdefinierte Liste.
- Ein-/Ausschluss von Entitäten.
- Schwierigkeitsband.
- Anzahl oder „alle“.
- Datensatzversion.

### 5. Rundenregeln

- Kein Timer, Zeit pro Frage oder Gesamtzeit.
- Sofortiges Feedback oder Feedback erst am Ende.
- Ohne Leben oder feste Fehleranzahl.
- Hinweise erlaubt/verboten.
- Fehler erneut einstreuen.
- Zufalls-Seed.
- Bewertungsprofil: Lernen, Prüfung, Sprint oder Marathon.

## Referenzschema

Das Schema ist zunächst eine Zielspezifikation. Es soll beim Bau als
TypeScript-Typ und zur Laufzeit zusätzlich als validiertes Schema umgesetzt
werden.

```ts
type EntityTypeId = string; // gegen die Entity-Type-Registry validiert

type EntityRef =
  | { from: "subject" }
  | {
      from: "subject";
      relation: string;
      direction: "outgoing" | "incoming";
    };

interface QuizDefinition {
  id: string;
  schemaVersion: 1;
  datasetVersion: string;

  content: {
    subjectType: EntityTypeId;
    requiredRelations?: string[];
    filters?: Array<{
      field: string;
      op: "eq" | "in" | "gte" | "lte";
      value: string | number | string[];
    }>;
  };

  prompt: {
    kind: "name" | "visual_asset" | "map_highlight" | "fact" | "description";
    entity: EntityRef;
    field?: string;
    locale: string;
  };

  answer: {
    kind:
      | "text_input"
      | "single_choice"
      | "multi_choice"
      | "map_point"
      | "map_area"
      | "map_line"
      | "drag_match"
      | "sort_order";
    entity: EntityRef;
    field?: string;
    grader: string;
  };

  scope: {
    regionIds: string[];
    includeIds?: string[];
    excludeIds?: string[];
    difficulty?: [number, number];
  };

  rules: {
    questionCount: number | "all";
    randomizer: "mulberry32-v1";
    timer:
      | { kind: "none" }
      | { kind: "per_question"; seconds: number }
      | { kind: "total"; seconds: number };
    feedback: "immediate" | "end";
    retryMistakes: boolean;
    hints: "off" | "one" | "unlimited";
    seed?: string;
  };
}
```

Die absichtlich offene `EntityTypeId` ist kein Verzicht auf Typsicherheit:
Dataset- und App-Build validieren sie gegen versionierte
`entity_type_definition`-Einträge. So kann etwa `volcano` oder `language`
hinzukommen, ohne eine zentrale Union und viele Switch-Blöcke zu ändern.

## Registries statt zentraler Switch-Blöcke

```ts
interface AnswerModePlugin {
  id: string;
  payloadSchema: unknown;
  componentKey: string;
  defaultGraderId: string;
  accessibilityContract: string;
}

interface PromptRendererPlugin {
  id: string;
  payloadSchema: unknown;
  componentKey: string;
}
```

Beim App-Start werden Prompt-Renderer, Antwortmodi und Grader in getrennten
Registries registriert. Eine QuizDefinition referenziert nur stabile IDs.

- Neuer Inhalt mit vorhandener Darstellung: nur Daten und Preset.
- Neuer Prompt: ein isolierter Renderer plus Schema.
- Neuer Antwortmodus: Eingabekomponente, Payload-Schema und Grader.
- Neuer Grader: pure Funktion plus Versions-ID.
- Kein wachsender `switch (quizType)` in der Session-Engine.

### Beispiel: Hauptstädte Europas anklicken

```json
{
  "id": "capitals-europe-map-point",
  "schemaVersion": 1,
  "datasetVersion": "geo-core-2026-01",
  "content": {
    "subjectType": "city",
    "requiredRelations": ["is_capital_of"]
  },
  "prompt": {
    "kind": "name",
    "entity": { "from": "subject" },
    "locale": "de"
  },
  "answer": {
    "kind": "map_point",
    "entity": { "from": "subject" },
    "field": "location",
    "grader": "distance-v1"
  },
  "scope": {
    "regionIds": ["continent:europe"]
  },
  "rules": {
    "questionCount": 20,
    "timer": { "kind": "per_question", "seconds": 15 },
    "feedback": "immediate",
    "retryMistakes": false,
    "hints": "off"
  }
}
```

## Laufzeitobjekte

Eine Definition wird vor der Runde in konkrete Fragen übersetzt. Die UI bekommt
nur ein renderbares, unveränderliches `QuestionInstance`.

```ts
interface QuestionInstance {
  id: string;
  sessionId: string;
  ordinal: number;
  subjectId: string;
  promptPayload: unknown;
  answerSpec: {
    kind: QuizDefinition["answer"]["kind"];
    expectedEntityIds: string[];
    graderId: string;
    graderConfig: Record<string, unknown>;
  };
}

interface AnswerResult {
  status: "correct" | "incorrect" | "partial" | "timed_out" | "skipped";
  score: number;
  responseTimeMs: number;
  distanceKm?: number;
  normalizedInput?: string;
  matchedAliasId?: string;
  feedbackEntityIds: string[];
}
```

`QuestionInstance` wird in der gespeicherten Session mitgeführt. Ein späteres
Dataset-Update darf das Ergebnis einer alten Runde nicht nachträglich verändern.

In `Lernen` und `Üben` bietet die Oberfläche für eine freiwillig aufgegebene
Frage „Lösung anzeigen“ an. Der persistierte Status bleibt aus
Kompatibilitätsgründen `skipped`; sichtbar erscheinen die konkrete Auflösung
und anschließend die normale Weiter-Aktion. In `Prüfung` heißt dieselbe
fachliche Null-Antwort „Ohne Antwort weiter“ und legt die Lösung erst in der
Endauswertung offen.

Die Regelkombinationen stammen aus einer zentralen Profilregistry:

| Lernmodus | Timer | Feedback | Lösung | Fehlerwiederholung |
|---|---|---|---|---|
| Lernen | aus | sofort | erlaubt | keine |
| Üben | aus | sofort | erlaubt | einmal am Rundenende |
| Prüfung | optional | am Ende | während der Runde gesperrt | keine |

Beim Üben erhält eine Wiederholungsfrage eine neue Fragen-ID und ein
`retryOfQuestionId`. Dadurch bleiben Versuche und Fortschrittsereignisse
idempotent, während die ursprüngliche Entität und Fähigkeit erhalten bleiben.
Eine korrekt beantwortete Wiederholung schließt den Fehler in der
Ergebnisansicht und in der vorhandenen Reviewqueue.

Ein Katalogvertrag durchläuft jede registrierte Kombination aus Thema und
Fragerichtung mit allen drei Lernmodi, validiert ihre Definition und erzeugt
zehn konkrete Fragen. Neue Fragerichtungen sind damit erst testgrün, wenn
`Lernen`, `Üben` und `Prüfung` ohne eigene UI-Sonderlogik funktionieren.

## Bewertung je Antwortmodus

### Texteingabe

1. Unicode normalisieren (`NFKC`).
2. Außenabstände entfernen, innere Leerzeichen vereinheitlichen.
3. Sprachabhängig kleinschreiben.
4. Typographische Apostrophe und Bindestriche vereinheitlichen.
5. Gegen explizit gepflegte akzeptierte Namen und Aliasse prüfen.
6. Optionale Tippfehlertoleranz nur im Lernmodus anwenden.

Akzente werden nicht global entfernt: `Kongo` und andere Namen dürfen dadurch
nicht versehentlich zusammenfallen. Tolerierte Schreibweisen sind
datengetrieben. Bei mehreren Entitäten mit demselben Alias wird vor der Runde
eine eindeutige Frageform verlangt.

### Kartenpunkt

- Bewertet die geodätische Entfernung zum Zielpunkt.
- Schwellenwert hängt von Zoom, Gerät und Inhalt ab.
- Das Ergebnis zeigt zusätzlich die Entfernung.
- Für sehr nahe Hauptstädte oder Stadtstaaten zoomt die Kamera ausreichend ein.
- Ein transparenter visueller Toleranzkreis macht die Fairness nachvollziehbar.

### Kartenfläche

- Treffer im Zielpolygon ist korrekt.
- Sehr kleine Staaten bekommen eine faire Auswahlhilfe oder einen automatisch
  passenden Zoom, aber keine unsichtbar fachlich falsche Riesenfläche.
- MultiPolygone und Inseln gehören vollständig zur Zielentität.

### Kartenlinie

- Auswahl trifft eine stabile Feature-ID, nicht Linienfarbe oder Layername.
- Nahe oder überlagerte Flüsse erhalten eine vergrößerte Hit-Zone.
- Teilrichtigkeit bei mehrteiligen Aufgaben wird vom Grader berechnet.

### Auswahlfragen

- Ablenkungsantworten stammen aus derselben fachlichen Ebene und dem gewählten
  Gebiet.
- Keine doppeldeutigen oder identischen sichtbaren Namen.
- Die Position der richtigen Antwort ist per Seed reproduzierbar gemischt.

## Kombinationen statt Sonderfälle

| Thema | Frage | Antwort | Ergebnis |
|---|---|---|---|
| Hauptstadt | Name | Kartenpunkt | „Wo liegt Ljubljana?“ |
| Hauptstadt | Kartenpunkt | Texteingabe | „Welche Hauptstadt ist markiert?“ |
| Hauptstadt | Land | Texteingabe | „Wie heißt die Hauptstadt von Deutschland?“ |
| Hauptstadt | Name | Texteingabe | „Zu welchem Land gehört Berlin?“ |
| Land | Name | Kartenfläche | „Klicke Namibia an.“ |
| Land | Flagge | Texteingabe | „Zu welchem Land gehört diese Flagge?“ |
| Fluss | Name | Kartenlinie | „Wähle die Donau.“ |
| Gebirge | Kartenhighlight | Texteingabe | „Welches Gebirge ist markiert?“ |
| Stadt | Name | Land-Auswahl | „In welchem Land liegt Osaka?“ |
| Gipfel | Name | Kartenpunkt | „Wo liegt der Kilimandscharo?“ |

### In Phase 2 ausführbar

`createMvpQuizDefinition(setup)` erzeugt die vier Kartenkombinationen und zwei
relationale Hauptstadtkombinationen aus
derselben Konfiguration:

| Thema | Richtung im Setup | Prompt | Antwort/Grader |
|---|---|---|---|
| Hauptstadt | `locate` | deutscher Stadtname | Kartenpunkt / `distance-v1` |
| Hauptstadt | `name` | markierter Stadtpunkt | Texteingabe / `text-v1` |
| Land | `locate` | deutscher Ländername | Kartenfläche / `area-v1` |
| Land | `name` | markierte Länderfläche | Texteingabe / `text-v1` |
| Hauptstadt | `country_to_name` | deutscher Ländername | Hauptstadtname / `text-v1` |
| Hauptstadt | `name_to_country` | deutscher Hauptstadtname | Ländername / `text-v1` |

Die beiden relationalen Textmodi zeigen im Feedback stets Hauptstadt und Land.
Bei Staaten mit mehreren gepflegten Hauptstadtrollen akzeptiert
`country_to_name` jeden gültigen Sitz und listet die Alternativen in der
Auflösung auf. Die Frage nennt dort bewusst „einen Hauptstadtsitz“, statt eine
eindeutige Singularantwort vorzutäuschen.

Jede Kombination verwendet Welt oder einen von sechs überlappenden
Kontinentscopes, 10/20/alle Kandidaten und keinen beziehungsweise 15/30
Sekunden pro Frage. `includeIds` begrenzt dieselbe Definition für das
Fehlertraining; es gibt dafür keine zweite Engine.

Die Karte bewertet Flächen über stabile Länder-IDs. Kleinstaaten besitzen eine
sichtbare Punktdarstellung mit größerer Touch-Hit-Zone, die dieselbe ID
liefert. Bei markierten Textfragen zentriert die Karte auf das konkrete Ziel,
damit transkontinentale Kandidaten nicht außerhalb des Startausschnitts liegen.

### In Phase 4 zusätzlich ausführbar

| Thema | Richtung im Setup | Prompt | Antwort/Grader |
|---|---|---|---|
| Flagge | `name` | lokales SVG über stabilen Asset-Key | Texteingabe / `text-v1` |
| Flagge | `choice` | lokales SVG über stabilen Asset-Key | vier Ländernamen / `single-choice-v1` |
| Flagge | `reverse_choice` | deutscher Ländername | vier lokale Flaggen / `single-choice-v1` |
| Länderform | `name` | abgeleiteter SVG-Umriss | Texteingabe / `text-v1` |

Der Generator erzeugt Auswahloptionen aus demselben fachlichen Scope,
entfernt doppelte Entitäts-IDs und mischt Distraktoren sowie korrekte Position
mit versioniertem Seed. Der Auswahlgrader erhält nur die stabile Entitäts-ID;
sichtbarer Text oder SVG-Markup entscheiden nie über Korrektheit.

`QuestionInstance` enthält bei visuellen Fragen eine Referenz aus
`kind`, `key` und `entityId`. Die konkrete lokale SVG-Datei wird außerhalb der
Engine aufgelöst und vor Rundenstart für genau den erzeugten Fragensnapshot
geladen.

`QuizRoundDefinition` ist jetzt die Union aus einer normalen
`QuizDefinition` und `MixedQuizDefinition`. Der erste Weltmix plant zehn oder
zwanzig Fragen aus Länderkarte, Hauptstadtmarkierung, Flaggenauswahl und
Länderform. Die Session speichert die gemeinsame Rundendefinition und jede
Frage zusätzlich ihre Quell-Definition und ihren Pool.

### In Phase 5 zusätzlich ausführbar

| Thema | Richtung im Setup | Prompt | Antwort/Grader |
|---|---|---|---|
| Fluss | `locate` | deutscher Flussname | Kartenlinie / `line-v1` |
| Fluss | `name` | markierter Verlauf | Texteingabe / `text-v1` |
| See | `locate` | deutscher Seename | Kartenfläche / `area-v1` |
| See | `name` | markierte Fläche | Texteingabe / `text-v1` |
| Meer | `locate` | deutscher Meeresname | Kartenfläche / `area-v1` |
| Meer | `name` | markierte Fläche | Texteingabe / `text-v1` |
| Gebirge | `locate` | deutscher Gebirgsname | Kartenfläche / `area-v1` |
| Gebirge | `name` | markierte Fläche | Texteingabe / `text-v1` |
| Gipfel | `locate` | deutscher Gipfelname | Kartenpunkt / `distance-v1` |
| Gipfel | `name` | markierter Punkt | Texteingabe / `text-v1` |

`map_line` sendet `{ kind: "map_line", lineId, label }`. Der Renderer sucht
in Bildschirmkoordinaten innerhalb von 12 px auf Desktop beziehungsweise
18 px auf schmalen Viewports. Liegen die zwei nächsten Flüsse weniger als
3 px auseinander, gibt er einen Zoomhinweis aus und noch keine Antwort ab.
Der Grader vergleicht danach nur die stabile Linien-ID.

Der Phase-5-Weltmix verwendet dieselbe `MixedQuizDefinition` mit den neun Pools
`countries`, `capitals`, `flags`, `shapes`, `rivers`, `lakes`, `seas`,
`mountain-ranges` und `peaks`. Jeder Pool erhält mindestens eine Frage; weitere
Plätze werden gewichtet und deterministisch verteilt.

### Im Phase-7-Physikranglisten-Slice zusätzlich ausführbar

| Thema | Richtung im Setup | Prompt | Antwort/Grader |
|---|---|---|---|
| Längste Flusssysteme | `facts_to_name` | Rang, Länge, Länder, Mündung | Name / `text-v1` |
| Höchste Berge | `facts_to_name` | Rang, Höhe, Land/Region, Gebirge | Name / `text-v1` |

Der generische `fact`-Prompt referenziert eine geordnete Liste registrierter
`FactDefinition`-IDs. Der Generator löst die Fakten im Content-Repository auf,
formatiert Zahl und Einheit und schreibt nur das konkrete Faktenprofil in den
serialisierbaren `QuestionInstance`. Der Entitätsname bleibt aus dem Prompt
ausgeschlossen. Im Feedback werden Name und dieselben Fakten gemeinsam
angezeigt; der Textgrader bewertet weiterhin ausschließlich gepflegte Namen
und Aliasse.

Die beiden Rangquizze sind globale, eigenständige Themen und vorerst keine
Pools des Weltmixes. Die bestehenden Kartenquizze für Flussverläufe, Gebirge
und Gipfel bleiben unverändert.

## Deterministische Fragengenerierung

- Dataset-Version + Quiz-ID + Scope + Seed bestimmen die Kandidaten.
- Der Randomizer besitzt eine Versions-ID; ein Algorithmuswechsel verändert
  bestehende Seed-Verträge nicht stillschweigend.
- Keine Entität doppelt, außer die Regel fordert Fehlerwiederholung.
- Der Generator prüft vor Start, ob genügend gültige Kandidaten existieren.
- Auswahlfragen erzeugen Ablenker vor Beginn der Runde.
- Die Session speichert Kandidatenreihenfolge und Grader-Konfiguration.
- Tests verwenden feste Seeds und kleine Fixtures.

## Engine-Zustände

```text
idle → preparing → asking → evaluating → feedback → asking
                              │                    │
                              └─────── timed_out ──┘
                                                   ↓
                                               completed
```

`paused` ist nur in Modi ohne laufenden Prüfungs-Timer erlaubt. Navigation weg
von einer aktiven Runde löst eine bestätigte Pause oder Aufgabe aus.

## Erweiterungsregel

Eine neue Quizidee wird in dieser Reihenfolge geprüft:

1. Reicht eine neue `QuizDefinition`?
2. Reicht ein neuer Grader für einen vorhandenen Antwortmodus?
3. Reicht eine neue Prompt- oder Antwortkomponente?
4. Erst dann darf die Engine selbst erweitert werden.

Für Mixed-Modi gilt zusätzlich: Der Scheduler wählt und ordnet Fragen, bewertet
sie aber nicht selbst. Für Wissenspuzzles gilt: Filter-, Rang- und
Relationslogik läuft beim Content-Build; die Session erhält eine fertige,
belegte Frage samt Grader-Konfiguration und Erklärung.
