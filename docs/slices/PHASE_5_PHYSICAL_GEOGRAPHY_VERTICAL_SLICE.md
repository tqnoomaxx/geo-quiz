# Phase 5 – Physische Geographie und vollständiger Weltmix

## Slice-Brief

- **Nutzerziel:** Flüsse, Seen, Meere, Gebirge und Gipfel erkennen,
  lokalisieren und zusammen mit den bisherigen Themen in einer Weltrunde
  trainieren.
- **Phase/Gate:** Phase 5; Punkt-, Linien- und Flächeninhalte jenseits
  politischer Grenzen müssen über dieselbe Engine funktionieren.
- **Thema und Scope:** kuratierter Weltumfang sowie explizite, überlappende
  Kontinentscopes mit Schwierigkeit 1–5.
- **Prompts:** `name` und `map_highlight`.
- **Antwortmodi:** `map_point`, `map_line`, `map_area` und `text_input`.
- **Regeln:** vorhandene 10/20/alle-, Lern-/Übungs-/Prüfungs- und Timerregeln; bei
  kleinen Regionalpools wird nur eine tragfähige Fragenzahl angeboten.
- **Benötigte Entitäten:** `river`, `lake`, `sea`, `mountain_range`, `peak`
  mit `located_in`, deutscher Anzeige, Aliasen, Zentroid und
  Geometriereferenz.
- **Neue Datenquelle:** gepinnte Natural-Earth-5.1.2-GeoJSON-Layer bei 1:50m,
  Public Domain; normaler Build arbeitet mit dem lokalen kuratierten Snapshot.
- **Geänderte öffentliche Verträge:** Dataset-Schema 3 mit Liniengeometrie,
  `line-v1`, `map_line`-Payload, generische physische Kartenlayer sowie
  `entityType` und Ziel-Linien-ID im Fragensnapshot.
- **Erfolgskriterien:** jede der fünf Themenfamilien läuft in beide
  Fragerichtungen; Linienauswahl ist deterministisch und touchfreundlich;
  Geometrie und Entität sind per Prüfsumme verbunden; der Weltmix enthält alle
  neun Pools ohne neue Bewertungslogik.
- **Größte Risiken:** generalisierte Flussverläufe, überlappende
  Touch-Hit-Zonen, unscharfe Meeres-/Gebirgsgrenzen, transkontinentale
  Zuordnung und zusätzlicher Kartenpayload.
- **Nicht enthalten:** vollständige globale Hydrologie, Nebenflüsse und
  Kleinstseen, Höhen-/Längenvergleiche, frei gezeichnete Linienantworten,
  Geologie oder Relief.

## Vertikaler Ablauf

```text
Natural Earth 5.1.2, 1:50m
  ├── Flusslinien
  ├── See-/Meeresflächen
  ├── Gebirgspolygone
  └── Gipfelpunkte
          │ expliziter Refresh + kuratierte Auswahl
          ▼
physical-core-v1.json
  ├── Entitäten/Namen/Scopes ──► geo-core Dataset
  └── fünf GeoJSON-Themenchunks ► MapLibre Physical Adapter
                                      │
QuizDefinition ── Generator ──► map_point / map_line / map_area / text
                                      │
                         vorhandene Session/Progress/Review-Engine
```

## Erste Themenmatrix

| Thema | Frage | Antwort |
|---|---|---|
| Flüsse | Name | Verlauf auf Karte |
| Flüsse | markierter Verlauf | Texteingabe |
| Seen | Name | Fläche auf Karte |
| Seen | markierte Fläche | Texteingabe |
| Meere | Name | Fläche auf Karte |
| Meere | markierte Fläche | Texteingabe |
| Gebirge | Name | Fläche auf Karte |
| Gebirge | markierte Fläche | Texteingabe |
| Gipfel | Name | Punkt auf Karte |
| Gipfel | markierter Punkt | Texteingabe |

## Linienauswahlvertrag

Der Renderer berechnet die kürzeste Distanz vom Klick zu den projizierten
Segmenten aller aktuell auswählbaren Flüsse. Desktop verwendet 12 px, Touch
18 px. Liegen die beiden nächsten Kandidaten höchstens 3 px auseinander, wird
die Auswahl als mehrdeutig verworfen. Erst eine eindeutige Auswahl sendet
`{ kind: "map_line", lineId, label }`; `line-v1` vergleicht anschließend nur
die ID.

## Abnahme

- Lokaler Snapshot, Dataset, Geometrieartefakt und Manifest validieren.
- Jede Entität besitzt deutschen Namen, Quelle, Scope und passende Geometrie.
- Feste Seeds erzeugen reproduzierbare Fragen und den gleichen Neun-Pool-Mix.
- Nahe Linien, leerer Kartenraum und Mehrdeutigkeit bestehen Unit- und
  Browsertests.
- Fehlertraining behält alle zehn neuen Fähigkeiten.
- Desktop- und schmaler Touch-Viewport bestehen ohne Konsolen-/Assetfehler.
- GitHub-Pages-Unterpfad und vorbereitete physische Runde funktionieren
  offline.
