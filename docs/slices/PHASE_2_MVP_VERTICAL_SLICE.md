# Phase 2 – MVP-Vertikalscheibe

Stand: 2026-07-30

## Ziel

Phase 2 erweitert die generische Phase-1-Engine zu einem lokal nutzbaren
Länder-/Hauptstadt-MVP. Der Slice bleibt statisch hostbar und benötigt während
einer Runde keine externe API.

## Enthaltener Umfang

- Standardset aus 193 UN-Mitgliedern sowie Palästina und Vatikanstadt;
- Welt und sechs Kontinentscopes;
- vier Kombinationen über dieselbe Engine:
  - Hauptstadtname → Kartenpunkt;
  - markierter Hauptstadtpunkt → Texteingabe;
  - Ländername → Kartenfläche;
  - markierte Länderfläche → Texteingabe;
- 10, 20 oder alle Kandidaten, soweit der Scope genügend Inhalt besitzt;
- ohne Timer oder 15/30 Sekunden pro Frage;
- sofortiges Feedback, Fehlerliste und gezieltes Fehlertraining;
- lokale Fortschrittsereignisse und daraus berechnete Lernübersicht;
- statischer App-Shell-/Content-Cache für vorbereitete Offline-Runden.

## Nicht enthalten

- abhängige Gebiete, De-facto-Staaten und ein erweitertes Territorienset;
- Accounts, Cloud-Sync und serverbestätigte Abzeichen;
- Flaggen, Flüsse, Gebirge und Weltmix;
- freies Zoomen zu einer automatisch verratenen Lösung;
- ein endgültiger Spaced-Repetition-Algorithmus.

## Datenfluss

```text
world-countries@5.1.0 + Wikidata-Snapshot
                  ↓ expliziter Refresh
       content-src/geo-core-mvp.v1.json
                  ↓ lokaler deterministischer Build
 Dataset + Manifest + Qualitätsbericht + Karten-Ergänzung
                  ↓
 QuizDefinition → QuestionInstances → Session → ProgressEvents
```

Der explizite Refresh ist vom normalen Build getrennt. `npm run
content:build` bleibt dadurch ohne Netzwerk reproduzierbar.

## Designinventar

Phase 2 übernimmt das bestehende Atlas-Design aus
[`../design/DESIGN_SYSTEM.md`](../design/DESIGN_SYSTEM.md):

- echtes Weiß, Navy/Petrol, Salbei/Ozean und feine Trennlinien;
- offene Zweispaltenstruktur statt Dashboard-Kartenraster;
- zentrale CSS-Tokens und bestehende Outline-Icons;
- neue Setup-Felder als Varianten der vorhandenen `SelectField`-Familie;
- Fortschritt als ruhige Liste mit Zahlen und Balken, nicht als dekoratives
  Gamification-Dashboard.

Neue sichtbare Assets sind für diesen Slice nicht nötig. Karte, Marker, Text,
Status und Controls bleiben code-native.

## Abnahme

- [x] Alle vier Presetfamilien validieren und erzeugen reproduzierbare Fragen.
- [x] Jeder freigegebene Scope besitzt gültige Länder- und
  Hauptstadtkandidaten.
- [x] Desktop und Mobil schließen Karten- und Textflüsse ab.
- [x] Ein Reload erhält bestätigte Antwort und aktive Definition; Timerstände
  werden gefaltet gespeichert und separat getestet.
- [x] Ein Fehler erzeugt genau ein idempotentes Fortschrittsereignis und kann
  als Fehlertraining erneut gestartet werden.
- [x] Die nach Online-Start vorbereitete App lässt sich offline neu laden und
  startet eine Runde.
- [x] Datenstand, Standardset und Attribution sind sichtbar.
- [ ] Manuelle Freigaben für reale Touchgeräte, Screenreader, politische
  Reviewliste und ODbL-Veröffentlichungspflichten abschließen.
