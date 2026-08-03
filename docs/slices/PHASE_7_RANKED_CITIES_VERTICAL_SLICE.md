# Phase 7 – Große Städte 100 bis 1000

## Slice-Brief

- **Nutzerziel:** große Städte weltweit oder pro Kontinent auf der Karte
  finden, markierte Städte benennen und auch lange Lernrunden sicher
  unterbrechen.
- **Phase/Gate:** Phase 7; Rankingmethode und Datenstand müssen sichtbar sein,
  exakte Top-N-Mengen reproduzierbar bleiben und 1000 Punkte dürfen Start und
  Karteninteraktion nicht unvertretbar beeinträchtigen.
- **Datenumfang:** Vereinigungsmenge aus Welt und sechs kontinentalen
  Top-1000-Listen, insgesamt 6000 GeoNames-Orte.
- **Rangdefinition:** GeoNames-Bevölkerungsfeld absteigend, bei Gleichstand
  numerische GeoNames-ID aufsteigend.
- **Sets:** Top 100, 250, 500 und 1000 für Welt, Afrika, Asien, Europa,
  Nordamerika, Ozeanien und Südamerika.
- **Fragen:** `ranked_city × name × map_point` und
  `ranked_city × map_highlight × text_input`.
- **Laufzeit:** Pack erst bei Stadtmodus oder vorhandenem Stadtlernstand
  laden; vorhandene Generator-, Grader-, Session-, Fortschritts- und
  Achievementverträge weiterverwenden.
- **Nicht enthalten:** Behauptung einer einheitlichen Metropolregionsstatistik,
  GeoNames-Live-Abfragen, vollständiger 1000er-Dauertest auf echtem Android
  oder redaktionell abgeschlossene deutsche Namensabdeckung.

## Datenfluss

```text
expliziter Netzwerkrefresh
  ├── cities1000.zip
  ├── alternateNamesV2.zip
  └── countryInfo.txt
             │
             ▼
Quelle/Bytes/SHA-256 + P-Featurefilter + Kontinent
             │
             ▼
Population absteigend, GeoNames-ID aufsteigend
             │
             ├── world Top 1000
             └── 6 × continent Top 1000
             │
             ▼
ranked-cities.v1.json
  ├── 6000 stabile Entitäten
  ├── rankByScope
  ├── deutsche Namen und Aliasse
  ├── Land-/Kontinentrelationen
  └── Populationsfakten samt Methode
             │ Content-Build
             ▼
kleiner synchroner Index + großer lazy Datenchunk + Manifest
             │
             ▼
vorhandene Quiz-/Mixed-/Session-/Progress-Engine
```

Nur `npm run content:refresh:cities` benötigt Netzwerk. Ein normaler
Produktionsbuild validiert und paketiert den lokalen Snapshot.

## Laufzeitgrenzen

Die Startseite lädt den Pack erst nach Auswahl „Große Städte“. Ihre Übersicht
zeigt höchstens das gewählte 1000er-Set, clustert diese Vorschaupunkte und
bietet eine lokale Alias-Suche. Clustering ist ausschließlich eine
Übersichtshilfe; die Quizkarte bewertet weiterhin die individuelle
Zielkoordinate.

Eine Top-1000-Runde erzeugt denselben serialisierbaren Fragensnapshot wie eine
kurze Runde. „Runde pausieren“ wartet auf den IndexedDB-Schreibabschluss,
bevor die App navigiert. Fortsetzen übernimmt dieselbe Session-ID und den
gleichen Fragenstand. Ein eigener Marathon-Zustandsautomat ist nicht nötig.

Der Weltmix gibt der kurzen 10er-Runde weiterhin ihre zehn garantierten
Kernpools. Die 20er-Runde garantiert zusätzlich mindestens eine Stadtfrage.
Der Scheduler balanciert Poolmengen so, dass
`maxConsecutiveFromPool` tatsächlich planbar ist.

## Abnahme

- Alle sieben Scopes liefern exakt 100/250/500/1000 Entitäten.
- Contenttests prüfen Quellen, Faktdefinition, deutsche Beispielnamen,
  Grenzgleichstand und einen absichtlich ungültigen Quellenverweis.
- Fester Seed erzeugt 1000 reproduzierbare Fragen; ein reiner pausierter
  Snapshot lässt sich validieren und fortsetzen.
- Übersichtssuche findet „München“ als globalen Rang 314; 1000 Punkte werden
  geclustert angezeigt.
- Desktop- und Pixel-7-Browserflow starten die 1000er-Runde, pausieren,
  setzen dieselbe Session fort und beantworten eine Frage.
- Der vollständige Produktions-Browserlauf besteht unter
  `BASE_PATH=/geoapp/`: 19 ausgeführte Flows, sieben absichtliche
  Mobil-Skips.
- Unit-/Content-/Engine-Suite: 108 Tests.
- Reale Android-/Netz-/Speichermessung, redaktionelle Namensabnahme und
  vollständiger 1000er-Langlauf bleiben als offene Gates in `Critics.md`.
