# Phase 6 – Faktengraph und Wissenspuzzles

## Slice-Brief

- **Nutzerziel:** verknüpfte Geographiefragen lösen und nach jeder Antwort
  sehen, aus welchen Werten, Relationen, Definitionen und Quellen sich die
  Lösung ergibt.
- **Phase/Gate:** Phase 6; uneindeutige, unbelegte oder methodisch vermischte
  Fragen müssen vor dem App-Build scheitern.
- **Erster Faktenumfang:** Landfläche und Gesamtbevölkerung für 194 der
  195 MVP-Staaten, jeweils World Bank WDI 2023; neun
  Portugiesisch-Amtssprachenrelationen aus CPLP-Mitgliedstaaten und
  Länderprofilen.
- **Abfragesprache:** deklarative Relationsfilter, feste ID-Mengen,
  numerische Faktenvergleiche, Schnittmengen und auf-/absteigende Ränge.
- **Antwortpfade:** ermitteltes Land direkt oder genau eine anschließende
  Relation, zunächst `has_capital`.
- **Laufzeitmodus:** `knowledge_question × description ×
  single_choice/text_input`; die vorhandenen Grader, Sessions, Timer,
  Spielstände, Fortschrittsereignisse und Reviewqueue bleiben unverändert.
- **Aktueller Umfang:** 62 kuratierte Vorlagen, zwei Einzelmodi, ein
  Bronze-Abzeichen und ein zehnter Weltmix-Pool.
- **Nicht enthalten:** freie KI-Generierung, Live-Abfragen, Nachbar-, Höhen-,
  Währungs- oder Flussdurchquerungsfakten sowie eine Behauptung vollständiger
  globaler Faktabdeckung.

## Daten- und Compilerfluss

```text
expliziter Netzwerkrefresh
  ├── World Bank WDI 2023: Landfläche
  ├── World Bank WDI 2023: Bevölkerung
  └── kuratierte CPLP-Amtssprachenrelationen
                   │
                   ▼
knowledge-core.v1.json
  ├── FactDefinitions
  ├── EntityFacts
  ├── Relationsbelege
  └── DatasetSources
                   │
knowledge-templates.v1.json
  ├── sicherer Filter
  ├── Ranking
  └── Antwortpfad
                   │ Content-Build
                   ▼
Eindeutigkeit + gleiche Quelle/Methode/Datum + aufgelöste Belege
                   │
                   ▼
knowledge_question + has_answer + Erklärung + Faktenkette
                   │
                   ▼
vorhandene Quiz-/Mixed-/Session-/Progress-Engine
```

Der normale Produktionsbuild verwendet nur die lokalen Snapshots. Nur
`npm run content:refresh:knowledge` greift auf die World-Bank-API zu.

## Vergleichsvertrag

Eine Rankingvorlage passiert den Compiler nur, wenn:

1. jeder strukturelle Kandidat genau einen numerischen Filterfakt und jeder
   verbleibende Kandidat genau einen Rankingfakt des geforderten Typs besitzt;
2. alle verglichenen Fakten dieselbe Faktdefinition, Quelle, Methode und
   dasselbe Bezugsjahr verwenden;
3. der geforderte Rang existiert;
4. der Zielwert keinen Gleichstand mit einem anderen Kandidaten besitzt;
5. ein optionaler Antwortpfad genau eine Relation und eine vorhandene Entität
   ergibt;
6. alle zur Herleitung verwendeten Fakten und Relationen bekannte Quellen
   besitzen.

Fehlende Werte werden nicht still aus einer Rangliste entfernt. Eine Vorlage
mit unvollständigem Kandidatenraum scheitert. Vatikanstadt besitzt im
verwendeten WDI-Stand keinen Wert und kommt deshalb in keiner europäischen
oder globalen Rankingvorlage des ersten Slices vor.

## Beispiel

```text
Frage:
Welches ist nach Landfläche das zweitgrößte Land, in dem
Portugiesisch Amtssprache ist?

Filter:
country --has_official_language--> language:pt

Ranking:
fact-type:land-area-km2, absteigend, Stand 2023

Herleitung:
1. Brasilien – 8.358.140 km²
2. Angola – 1.246.700 km²

Antwort:
Angola
```

Die App zeigt nach der Bewertung dieselbe kompilierte Herleitung und verlinkt
World Bank sowie CPLP. Die Frage sagt ausdrücklich „Amtssprache“ und
„Landfläche“; „Muttersprache“ und „Gesamtfläche“ wären andere Definitionen.

## Abnahme

- 388 Fakten, neun Amtssprachenrelationen und 62 Vorlagen werden strukturell
  validiert.
- Fehlender Rankingfakt, Methodenmix, unbekannte Quelle, mehrdeutiger
  Relationspfad und Gleichstand blockieren den Build.
- Compiler und Generator sind mit Datasetversion und Seed reproduzierbar.
- Auswahlantworten mischen keine Länder und Städte als Distraktoren.
- Erklärung und Quelle bleiben Teil der serialisierbaren QuestionInstance.
- Einzelmodus funktioniert mit Auswahl und Eingabe; der Weltmix enthält bei
  Weltscope alle zehn Pools.
- Wissensfehler sind über denselben Skill-Key wiederholbar und zählen für das
  konfigurierbare Wissenspuzzle-Abzeichen.
- Desktop, schmaler Viewport, Tastaturfluss, Quellenlinks und
  Accessibility-Baseline werden im Produktionsbuild geprüft.
