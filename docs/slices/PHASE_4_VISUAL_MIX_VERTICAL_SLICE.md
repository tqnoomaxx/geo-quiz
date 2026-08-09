# Phase 4 – Visual- und Weltmix-Slice

## Slice-Brief

- **Nutzerziel:** Flaggen und Länderformen in mehreren Richtungen lernen und
  erstmals eine abwechslungsreiche, reproduzierbare Weltrunde spielen.
- **Phase/Gate:** Phase 4; neue Modi sollen überwiegend aus Presets, Assets und
  einer Prompt-/Antwortkomponente entstehen.
- **Thema und Scope:** Länder, Hauptstadtsitze, Flaggen und Länderumrisse in
  Welt oder den sechs vorhandenen Kontinentscopes.
- **Prompts:** `name`, `map_highlight`, `visual_asset`.
- **Antwortmodi:** `text_input`, `single_choice`, `map_point`, `map_area`.
- **Regeln:** 10/20/alle; zentral definierte Lern-, Übungs- und
  Prüfungsprofile. Nur die Prüfung erlaubt optional 15/30 Sekunden je Frage.
- **Assets:** `flag-icons@7.5.0` (MIT) sowie aus dem vorhandenen
  Natural-Earth-Snapshot abgeleitete SVG-Umrisse.
- **Geänderte öffentliche Verträge:** visuelles Prompt-Payload,
  Auswahloptionen und `single-choice-v1`; `QuizRoundDefinition` mit
  `MixedQuizDefinition`; optionale Poolherkunft in Fragenmetadaten.
- **Erfolgskriterien:** vier visuelle Kombinationen laufen durch dieselbe
  Session-Engine; Auswahlpositionen und Weltmix sind mit Seed reproduzierbar;
  Assets sind lokal, versioniert und im Manifest geprüft; offene Fehler werden
  als separate Fehlertrainingsqueue nutzbar.
- **Größte Risiken:** politische/zeitliche Aktualität von Flaggen,
  erkennbare Umrisse kleiner oder stark fragmentierter Staaten,
  zusätzlicher Asset-Download sowie bestehende offene Mobile-/Release-Gates.
- **Nicht enthalten:** physische Geographie, persönlicher
  Spaced-Repetition-Algorithmus, frei konfigurierbare Mixed-Gewichte,
  Wissenspuzzles und serverbestätigte Weltmix-Abzeichen.

## Vertikaler Ablauf

```text
Content-Snapshot
  ├── ISO-2 → lokale Flaggen-SVGs
  └── Natural-Earth-Geometrie → normalisierte Umriss-SVGs
                         │
                         ▼
                 visual-asset-v1
                         │
QuizDefinition ── Generator ── QuestionInstance
                         │
                         ├── text-v1
                         └── single-choice-v1

MixedQuizDefinition
  └── gewichtete Poolplanung ── vorhandene Generatoren ── globale Reihenfolge
```

## Erste Presets

| Thema | Prompt | Antwort |
|---|---|---|
| Flaggen | Flagge | Text |
| Flaggen | Flagge | Auswahl mit Ländernamen |
| Flaggen | Ländername | Auswahl mit Flaggen |
| Formen | Länderumriss | Text |
| Weltmix | Ländername, Hauptstadtpunkt, Flagge, Umriss | vorhandene passende Modi |

Der erste Weltmix verwendet vier gleich gewichtete Pools mit garantierter
Mindestmenge. Ein Pool darf nicht beliebig oft direkt hintereinander
erscheinen. Bei zu kleinen Scopes scheitert die Vorbereitung mit einer
verständlichen Fehlermeldung statt die Regeln still zu verändern.

## Fehlerqueue v1

Die Queue betrachtet `(entityId, skillKey)` als Lernobjekt. Das jüngste
Ereignis entscheidet:

- `incorrect`, `timed_out` oder `skipped` → offen;
- ein späteres `correct` → erledigt;
- älteste offene Einträge werden zuerst wiederholt.

Sie ist absichtlich nur eine belastbare Fehlerqueue. Fehler werden nicht mehr
in derselben Runde erneut angehängt, sondern erst in einer ausdrücklich
gestarteten Fehlertrainingsrunde verwendet. Intervalle, Stärke und persönliche
Gewichte bleiben Phase 8.

## Abnahme

- Content-Build prüft 195 Flaggen und 195 Umrisse mit stabilen Schlüsseln.
- Alle visuellen Presets validieren und erzeugen Fragen für Welt und
  Kontinente.
- `single-choice-v1` bewertet ausschließlich stabile Entitäts-IDs.
- Gleicher Weltmix-Seed erzeugt Poolfolge, Subjekte und Auswahlpositionen
  identisch.
- Lern-, Übungs- und Prüfungsprofil durchlaufen ihre vollständigen,
  voneinander getrennten Regelabläufe.
- Fehlertraining und Fehlerqueue behalten den ursprünglichen Skill.
- Root- und GitHub-Pages-Unterpfad laden visuelle Assets ohne externe Anfrage.
- Desktop- und Mobile-Browserfluss sowie Accessibility-Baseline bestehen.
