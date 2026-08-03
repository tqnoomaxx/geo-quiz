# Slice: Engine-Vertical-Slice

- **Nutzerziel:** Eine vollständige Europa-Hauptstadtrunde starten, zehn
  Kartenpunkte beantworten, sofort Feedback erhalten, neu laden und die Runde
  fortsetzen sowie ein dauerhaft gespeichertes Ergebnis sehen.
- **Phase/Gate:** Phase 1 – reproduzierbare Runde ohne
  hauptstadtspezifische Session-Logik.
- **Thema und Scope:** Hauptstädte, Europa, zehn kuratierte Fixture-Einträge.
- **Prompt:** Name einer Entität.
- **Antwortmodus:** `map_point`.
- **Regeln:** zehn Fragen, sofortiges Feedback, kein Timer, fester Seed.
- **Benötigte Daten:** Länder, Hauptstädte, Europa, deutsche Namen,
  `has_capital`-/`is_capital_of`-/`located_in`-Relationen und Koordinaten.
- **Neue Datenquelle:** lokale, ausdrücklich nicht produktive
  Phase-1-Fixture; Natural Earth bleibt nur Darstellungsgeometrie.
- **Geänderte öffentliche Schemas:** Content-Artefakt v1, QuizDefinition v1,
  QuestionInstance v1, QuizSession v1 und persistierter Session-Datensatz v1.
- **Erfolgskriterien:** gleicher Seed erzeugt gleiche Reihenfolge; alle zehn
  Fragen laufen durch dieselbe Engine; Reload setzt die aktive Runde fort;
  Ergebnis wird in IndexedDB gespeichert; Desktop- und Mobile-Smoke-Test
  bestehen ohne Konsolenfehler.
- **Größte Risiken:** Fixture wird mit Produktionscontent verwechselt;
  IndexedDB ist nicht überall verfügbar; monotone Laufzeit kann nicht roh über
  einen Reload hinweg gespeichert werden; Kartenpunkt-Toleranz bleibt vorläufig.
- **Explizit nicht enthalten:** vollständiger MVP-Content, echte
  Setup-Kombinatorik, Accounts, Sync, Lernalgorithmus, Flüsse, Flaggen oder
  Mixed-Scheduler.
