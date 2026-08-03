# GeoApp

Eine geplante Geographie-Lern-App, in der sich sehr viele Quizarten aus wenigen
Bausteinen zusammensetzen lassen: Länder, Hauptstädte, Flaggen, Städte, Flüsse,
Gebirge und später weitere geographische Themen – auf der Karte, per
Texteingabe, als Auswahlaufgabe, mit oder ohne Zeitdruck.

Phase 0 enthält die belastbare Produkt-, Daten- und Architekturplanung. Phase 1
hat die generische Quiz- und Session-Engine bewiesen. Phase 2 macht daraus
einen lokalen MVP mit 195 Staaten,
202 Hauptstadtsitzen, vier Frage-/Antwortkombinationen, sieben Gebieten,
Timer, Fehlertraining, lokalem Lernstand und vorbereitetem Offline-Betrieb.
Phase 3 ergänzt Gastidentität, Export, Offline-Outbox, optionalen
Supabase-Sync und konfigurierbare Abzeichen. Phase 4 ergänzt 195 lokale
Flaggen, 195 Länderumrisse, Auswahlfragen, Lern-/Übungs-/Prüfungsprofile, eine erste
Wiederholungsqueue und einen deterministischen Weltmix. Phase 5 ergänzt
kuratierte Flüsse, Seen, Meere, Gebirge und Gipfel mit Punkt-, Linien- und
Flächenfragen, fünf neue Abzeichenfamilien und den vollständigen Neun-Pool-Mix.
Phase 6 ergänzt einen belegten Faktengraphen, 20 kompilierte Wissenspuzzles und
den zehnten Weltmix-Pool. Phase 7 ergänzt einen lazy geladenen
GeoNames-Snapshot mit globalen und kontinentalen Top-100/250/500/1000-Sets,
beiden Stadt-Fragerichtungen, Suche, Clustering, pausierbaren Marathons,
Abzeichen und Weltmixintegration. Ein zweiter Phase-7-Pack ergänzt je 100
globale Flusssysteme und eigenständige Gipfel als Faktenquiz mit Länge/Höhe,
Ländern und Mündung beziehungsweise Gebirge.

## Einstieg

- [Dokumentenübersicht](docs/INDEX.md)
- [Produktbild und MVP](docs/PRODUCT.md)
- [Langfristiger Quizkatalog](docs/QUIZ_CATALOG.md)
- [Quizsystem](docs/QUIZ_ENGINE.md)
- [Gemischte und zusammengesetzte Fragen](docs/COMPOSITE_QUESTIONS.md)
- [Datenmodell](docs/DATA_MODEL.md)
- [Accounts, Spielstände und Abzeichen](docs/ACCOUNTS_AND_ACHIEVEMENTS.md)
- [Technische Architektur](docs/ARCHITECTURE.md)
- [Zentrales Designsystem](docs/design/DESIGN_SYSTEM.md)
- [Roadmap](docs/ROADMAP.md)
- [Detaillierte Umsetzungsschritte](docs/IMPLEMENTATION_STEPS.md)
- [Deployment über GitHub Pages](docs/DEPLOYMENT.md)
- [Performance-Baseline](docs/PERFORMANCE.md)
- [Visueller Konzept-/Render-Abgleich](docs/design/REVIEW.md)
- [Probleme und Risiken](Critics.md)
- [Phase-2-MVP-Slice](docs/slices/PHASE_2_MVP_VERTICAL_SLICE.md)
- [Phase-3-Slice](docs/slices/PHASE_3_ACCOUNT_SYNC_VERTICAL_SLICE.md)
- [Phase-4-Slice](docs/slices/PHASE_4_VISUAL_MIX_VERTICAL_SLICE.md)
- [Phase-5-Slice](docs/slices/PHASE_5_PHYSICAL_GEOGRAPHY_VERTICAL_SLICE.md)
- [Aktiver Phase-7-Slice](docs/slices/PHASE_7_RANKED_CITIES_VERTICAL_SLICE.md)
- [Phase-7-Physikranglisten](docs/slices/PHASE_7_RANKED_PHYSICAL_VERTICAL_SLICE.md)
- [Content-Pipeline einschließlich Phase 7](docs/CONTENT_PIPELINE.md)

## Lokal starten

```sh
npm install
npm run dev
```

Typecheck, Unit-/Datentests und Produktionsbuild:

```sh
npm run check
```

Browser-Smoke-Test für Desktop und Mobile:

```sh
npx playwright install chromium
npm run test:browser
```

Die App bietet Länder und Hauptstädte jeweils als Name → Karte und
Kartenmarkierung → Texteingabe sowie Flagge/Form → Text, Flagge → Auswahl und
Land → Flagge. Flüsse, Seen, Meere, Gebirge und Gipfel sind jeweils als
Name → Karte und Kartenmarkierung → Text verfügbar. Einzel- und Weltmixrunden
entstehen aus validierten `QuizRoundDefinitionen`, sind per Seed reproduzierbar
und können nach einem Reload fortgesetzt werden. Der normale Build arbeitet
ausschließlich mit dem versionierten lokalen Snapshot.

Große Städte stehen für Welt und Kontinente als exakte Top
100/250/500/1000 nach dem sichtbaren GeoNames-Bevölkerungsfeld zur Verfügung.
Der 6000-Städte-Pack wird erst beim Stadtmodus oder vorhandenem Stadtlernstand
geladen.

„Längste Flüsse“ und „Höchste Berge“ sind globale Top-100-Faktenquizze. Die
Frage zeigt ein Faktenprofil, die Lösung den Namen zusammen mit allen Angaben.
Die vorhandenen Kartenquizze für Flussverläufe, Gebirge und Gipfel bleiben
eigene Themen.

Ein bewusster Datenrefresh benötigt Netzwerkzugriff:

```sh
npm run content:refresh
npm run content:refresh:physical
npm run content:refresh:knowledge
npm run content:refresh:cities
npm run content:refresh:ranked-physical
```

Er ist kein Teil eines normalen Builds oder einer Quizrunde.

Konten sind optional. Eine Beispielkonfiguration steht in `.env.example`; ohne
beide öffentlichen Supabase-Variablen bleibt die App vollständig im Gastmodus.

## Kurzform der Strategie

```text
Thema       Hauptstadt
Frage       Name → Position
Antwort     Kartenklick
Gebiet      Europa
Regeln      20 Fragen, 15 s pro Frage
                 ↓
          eine QuizDefinition
```

Andere Kombinationen verwenden dieselbe Engine. Dadurch ist „alles“ ein
erweiterbares Ziel und kein unwartbarer Berg einzelner Sonderfälle.
