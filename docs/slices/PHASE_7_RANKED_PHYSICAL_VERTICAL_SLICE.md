# Phase 7 – Globale Top-100-Flusssysteme und -Gipfel

## Slice-Brief

- **Nutzerziel:** Längste Flusssysteme und höchste eigenständige Gipfel als
  eigene Themen lernen, ohne sie als „größtes Objekt eines Landes“ zu fragen.
- **Umfang:** weltweit je exakt 100 Entitäten.
- **Flussprofil:** Rang, Systemlänge in Kilometern, Länder des Einzugsgebiets
  und Mündung.
- **Bergprofil:** Rang, Höhe über Meeresspiegel, Land/verwaltete Region und
  Gebirge.
- **Frage:** `ranked_river/ranked_peak × fact × text_input`; die Lösung zeigt
  Name und vollständiges Faktenprofil.
- **Nicht enthalten:** eine gemeinsame Größenrangliste aller Gewässer,
  regionale Toplisten, neue Flussgeometrien, Sortiergrader oder Live-Abfragen.

## Rangdefinition und Quellen

Die Flussliste verwendet Revision `1367222027` der englischen Wikipedia-Liste
„List of river systems by length“. Sortierwert ist der erste Kilometerwert der
Tabellenzeile. Diese Wahl wird sichtbar erklärt, weil Flusslängen je nach
Quelle-Mündung-Definition variieren. Rang 100 besitzt 1490 km, der erste
ausgeschlossene Rang 101 besitzt 1485 km.

Die Bergliste verwendet Revision `1367438324` der Liste „List of highest
mountains on Earth“. Sortierwert ist die gerundete Höhe über Meeresspiegel;
als `S` markierte Untergipfel werden nicht als eigenständiger Rang übernommen.
Rang 100 besitzt 7219 m, Rang 101 besitzt 7213 m.

Beide Seiten-Snapshots werden mit Revision, URL, Abrufdatum, Bytezahl und
SHA-256 unter CC BY-SA 4.0 manifestiert. Deutsche Wikipedia-Titel ergänzen
Anzeigenamen, Länder und Mündungen. Der normale Build arbeitet ausschließlich
mit `content-src/ranked-physical.v1.json` und benötigt kein Netzwerk.

## Datenfluss

```text
npm run content:refresh:ranked-physical
  ├── zwei Wikipedia-Seitenrevisionen
  ├── deutsche Seitentitel und Wikidata-Seiten-IDs
  └── Top-100- und Grenzprüfung
                 │
                 ▼
content-src/ranked-physical.v1.json
  ├── 100 ranked_river + je drei Fakten
  ├── 100 ranked_peak + je drei Fakten
  ├── stabile IDs und deutsche Antwortaliasse
  └── Quelle, Methode, Datum und Ranggrenzen
                 │ npm run content:build
                 ▼
kleiner Methodenindex + lazy Content-Chunk + Manifest
                 │
                 ▼
QuizDefinition → fact-Prompt → text-v1 → Session/Review/Fortschritt
```

## Abnahme

- Der Packparser verlangt je exakt 100 Entitäten und sechs vollständige
  Faktserien mit je 100 methodisch identischen Werten.
- Die eingeschlossene Grenzgröße ist für beide Listen strikt größer als die
  erste ausgeschlossene Größe.
- Ein Faktenprompt enthält exakt drei Angaben und verrät den Namen nicht.
- Richtige, falsche und aufgedeckte Antworten zeigen Name und alle Fakten.
- Beide Themen starten mit je 10, 20 oder allen 100 Fragen und nur im
  Weltscope.
- Desktop-Chromium und Pixel-7-Viewport bestehen den Start-, Prompt- und
  Aufdeckfluss ohne Konsolenfehler.
