# GeoApp – verbindlicher Projektkontext

Diese Datei ist der Einstieg für jede spätere Arbeit am Projekt. Vor Planung,
Implementierung oder Review sind mindestens diese Dokumente zu lesen:

1. [`docs/PRODUCT.md`](docs/PRODUCT.md)
2. [`docs/DECISIONS.md`](docs/DECISIONS.md)
3. Danach die für die Aufgabe relevanten Spezifikationen aus
   [`docs/INDEX.md`](docs/INDEX.md)

## Nicht verhandelbare Leitplanken

- Die App ist eine modulare Geographie-Lernplattform, keine Sammlung separat
  programmierter Minispiele.
- Ein Quiz entsteht aus `Thema × Fragerichtung × Antwortmodus × Gebiet × Regeln`.
- Fachlogik bleibt in purem TypeScript und darf nicht von React oder MapLibre
  abhängen.
- React besitzt App-Shell, Navigation und DOM-Oberflächen. MapLibre rendert nur
  die interaktive Karte.
- Lerninhalte werden vorab in versionierte, validierte App-Datensätze gebaut.
  Quizrunden hängen nicht von Live-APIs ab.
- Stabile interne IDs dürfen sich nicht ändern, wenn Namen, Übersetzungen oder
  Quelldaten aktualisiert werden.
- Jede Antwort wird durch einen zum Antwortmodus passenden Grader bewertet.
  UI-Komponenten entscheiden niemals selbst, was fachlich korrekt ist.
- Gemischte Runden orchestrieren vorhandene QuizDefinitionen; sie duplizieren
  keine Fragengeneratoren.
- Zusammengesetzte Wissensfragen werden aus versionierten Fakten und Relationen
  vorab kompiliert, auf Eindeutigkeit geprüft und mit einer Herleitung
  ausgeliefert.
- Accounts speichern Ereignisse und serialisierbare Spielstände, keine
  Renderer-Objekte. Gastfortschritt muss verlustfrei in ein Konto überführbar
  sein.
- Abzeichen werden durch versionierte Regeln ausgewertet. Neue Themen oder Modi
  dürfen nicht für jedes Abzeichen neue `if`-Sonderlogik benötigen.
- Der erste vertikale Schnitt bleibt klein: Länder und Hauptstädte, Karte und
  Texteingabe, optionaler Timer, Welt und Kontinente, lokaler Fortschritt.
- Barrierefreiheit, Tastaturbedienung, Mobilansicht und deterministische Tests
  gehören zur Definition of Done.

## Arbeitsregeln

- Vor einer neuen Quizart zuerst prüfen, ob nur eine neue Konfiguration nötig
  ist. Neue Sonderlogik ist die letzte Option.
- Vor einem neuen Inhaltstyp zuerst das Entitäten- und Relationsmodell aus
  `docs/DATA_MODEL.md` verwenden oder bewusst per Entscheidungseintrag erweitern.
- Neue Datenquellen benötigen Lizenz, Attribution, Snapshot-Datum,
  Transformationsschritte und Qualitätsprüfungen im Dataset-Manifest.
- Neue vergleichende oder zusammengesetzte Frage benötigt Definition der
  Vergleichsgröße, Bezugsdatum/Methode, eindeutige Antwort und erklärbare
  Faktenkette.
- Architekturänderungen werden vor der Umsetzung in `docs/DECISIONS.md`
  festgehalten. Ersetzte Entscheidungen bleiben als „superseded“ sichtbar.
- Nach einem umgesetzten Slice werden Roadmap-Status und offene Risiken
  aktualisiert.
- Keine großflächige Umsetzung von Phase 2+, solange die Abnahmekriterien der
  vorherigen Phase nicht erfüllt sind.

## Wiederkehrender Ablauf

`Entscheiden → vertikalen Slice definieren → Daten vorbereiten → Engine bauen →
UI anbinden → fachlich testen → visuell und responsiv prüfen → dokumentieren`

Die ausführlichen Checklisten stehen in [`docs/WORKFLOW.md`](docs/WORKFLOW.md).
