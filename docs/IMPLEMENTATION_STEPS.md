# Detaillierte Umsetzungsschritte

Jeder Schritt liefert einen prüfbaren Zustand. Ein späterer Schritt beginnt erst,
wenn das jeweilige Gate erfüllt ist. Kleine technische Unteraufgaben dürfen
parallel bearbeitet werden, aber die Produkt-Gates bleiben in dieser Reihenfolge.

## 0. Offene Grundentscheidungen

- Standard-Länderset und Territorien.
- Darstellungsregel umstrittener Gebiete.
- Kartenprojektion für Lernfragen.
- Scoring v1.
- Produktname und visueller Charakter.

**Gate:** Entscheidungen sind in `DECISIONS.md` dokumentiert.

## 1. Vollständiges visuelles Konzept

- Start und Navigation.
- Quizkonfigurator.
- Textfrage.
- Kartenpunkt- und Kartenflächenfrage.
- unmittelbares Feedback.
- Ergebnis und Fehlerliste.
- Fortschritt, Profil und Abzeichensammlung.
- Mobile Zustände.

**Gate:** Konzept ist freigegeben; Tokens und Komponentenfamilien sind
extrahiert.

## 2. Repository- und Qualitätsfundament

- React/TypeScript/Vite scaffolden.
- Paketversionen und Lockfile festsetzen.
- Formatting, Lint, Typecheck und Unit-Test-Runner.
- Browser-Test-Setup.
- CI für alle Prüfungen.
- Umgebungs- und Build-Konventionen.

**Gate:** Leere App baut reproduzierbar und alle Qualitätschecks laufen.

## 3. Kleine Content-Pipeline

- Dataset-Manifest-Schema.
- Import-Fixture mit zehn Ländern und Hauptstädten.
- stabile IDs, deutsche Namen, Relationen und Geometrien.
- strukturelle Validatoren.
- reproduzierbarer Artefakt-Build.

**Gate:** Zweimaliger Build aus demselben Snapshot erzeugt identische Inhalte.

## 4. Fachliches Kernmodell

- Entitäten, Namen, Relationen, Fakten und Geometrie-Referenzen.
- TypeScript- und Laufzeitschemas.
- ContentRepository-Schnittstelle.
- kleine Test-Builder und Fixtures.

**Gate:** UI-freie Tests können Länder und Hauptstädte zuverlässig abfragen.

## 5. QuizDefinition und Generator

- Definition validieren.
- Scope und Kandidatenfilter.
- deterministische Zufallsquelle.
- konkrete QuestionInstances.
- Definition-/Dataset-Snapshots.

**Gate:** Feste Seeds erzeugen reproduzierbare, eindeutige Fragen.

## 6. Session-Engine

- serialisierbarer Zustandsautomat.
- Antwort-, Feedback-, Pause-, Timeout- und Abschlussereignisse.
- Timerlogik mit monotoner Zeit.
- Scoring v1.

**Gate:** Engine läuft vollständig ohne React oder Karte.

## 7. Erster Textquiz-Slice

- Setup → Textfrage → Feedback → Ergebnis.
- Textgrader mit deutschen Aliassen.
- Fokusführung, Enter, Skip und Timeout.
- Browser-End-to-End-Test.

**Gate:** Ein kompletter Hauptstadt-Textquiz funktioniert auf Desktop und Mobil.

## 8. MapLibre-Adapter

- lokale Karte und Layer.
- Entity-ID ↔ Feature-ID.
- Kamera, Hover, Auswahl und Lösungszustand.
- Punkt-, Flächen- und Distanzfunktionen.
- Touch-Hit-Zonen.

**Gate:** Zehn Testländer und Hauptstädte sind fair anklickbar.

## 9. Kartenquiz-Slice

- Hauptstadtname → Kartenpunkt.
- Ländername → Kartenfläche.
- Entfernung und richtige Lösung als Feedback.
- kleine Staaten, Inseln und nahe Punkte prüfen.

**Gate:** Text- und Kartenfragen nutzen dieselbe Session-Engine.

## 10. Lokale Spielstände

- IndexedDB-Schema und Migrationen.
- Sessions, Versuche, Einstellungen und lokale Profil-ID.
- aktive Runde fortsetzen.
- Export/Import.
- Recovery nach Tab-/Browserabbruch.

**Gate:** Neuladen und Offline-Unterbrechung verlieren keinen bestätigten
Fortschritt.

## 11. Vollständiger MVP-Content

- freigegebenes Länderset.
- Hauptstädte und deutsche Aliasse.
- Welt und Kontinente.
- Qualitätsbericht und politisch sensible Reviewliste.
- Attribution und Datenstand in der UI.

**Gate:** Alle MVP-Presets haben vollständige, gültige Kandidaten.

## 12. Ergebnisse und Lernstand

- Ergebnisübersicht und Fehlerliste.
- Mastery pro Entität und Skill.
- gezieltes Fehlertraining.
- lokale Gesamtstatistiken.
- Algorithmusversion speichern.

**Gate:** Eine falsche Antwort beeinflusst nur den passenden Lernskill und kann
gezielt wiederholt werden.

## 13. PWA, Barrierefreiheit und Performance

- App-Shell und Content-Caching.
- Offline-Runde.
- Tastatur und Screenreader-Grundfluss.
- Reduced Motion.
- Mobile- und schwächere-Geräte-Messungen.
- feste Performancebudgets.

**Gate:** MVP besteht Funktions-, Offline-, A11y- und Performance-Checks.

## 14. Account-Backend

- Supabase-Projekt und Migrationen.
- AuthAdapter.
- Profile, Devices, ProgressEvents und RLS.
- Account erstellen, anmelden, abmelden und löschen.
- Sicherheits- und Policy-Tests.

**Gate:** Zwei Testkonten können niemals Daten des jeweils anderen lesen oder
schreiben.

## 15. Gastübernahme und Sync

- Import-Batches und idempotenter Event-Upload.
- Gastfortschritt einem Konto zuordnen.
- Mehrgeräte-Sync.
- Konfliktregeln für Einstellungen und aktive Sessions.
- Offline-Outbox und Retry.

**Gate:** Derselbe Gastimport und derselbe Event-Upload können mehrfach ohne
Duplikate ausgeführt werden.

## 16. Achievement Engine

- AchievementDefinition und Regelvalidierung.
- inkrementelle Auswertung von ProgressEvents.
- lokale vorläufige und serverbestätigte Freischaltungen.
- Wiederaufbau aus Ereignishistorie.
- Tier- und Familiengenerator.

**Gate:** Neue Zähl-/Streak-/Distinct-Abzeichen benötigen nur Datenkonfiguration.

## 17. Abzeichenkatalog und Sammlung

- erste Familien für Länder, Hauptstädte, Regionen, Präzision und Serien.
- visuelles Badgesystem und Assets.
- Sammlung, Detailansicht und Freischaltfeedback.
- geheime Abzeichen.
- Erreichbarkeits- und Duplikatvalidator.

**Gate:** Alle veröffentlichten Abzeichen sind erreichbar, erklärt und haben ein
gültiges Asset.

## 18. Mixed-Mode-Scheduler

- gewichtete Quizpools.
- Mindest-/Höchstmengen.
- Wechsel von Thema und Antwortmodus.
- Schwierigkeitskurve.
- deterministischer Seed.
- Starter-Weltmix aus Ländern und Hauptstädten.

**Gate:** Eine feste Mixed-Definition erzeugt dieselbe abwechslungsreiche
Reihenfolge und verletzt keine Poolregeln.

## 19. Flaggen und Länderumrisse

- lokale SVG-Assetpipeline.
- Visual-Asset-Prompt.
- Flagge ↔ Land und Umriss → Land.
- passende Achievement-Familien.
- Flaggen in den Weltmix aufnehmen.

**Gate:** Neue visuelle Quizarten erfordern keine Engineänderung.

## 20. Physische Geographie

- Flüsse, Seen, Meere, Gebirge und Gipfel.
- Liniengrader und Kartenstile.
- Daten- und Geometrie-Review.
- physische Presets und Abzeichen.
- Weltmix um physische Fragen erweitern.

**Gate:** Der Weltmix kann fair zwischen Hauptstadt, Land, Flagge, Fluss,
Gebirge und Gipfel wechseln.

## 21. Faktengraph

- FactDefinitions mit Einheit, Methode, Bezugsdatum und Quelle.
- offizielle Sprachen, Fläche, Bevölkerung, Höhe und weitere erste Fakten.
- vergleichbare Werte normalisieren.
- Relations- und Quellenvalidatoren.

**Gate:** Jede vergleichbare Zahl und Relation ist rückverfolgbar und
definitionsklar.

**Stand 2026-07-30:** Für Landfläche und Gesamtbevölkerung ist das Gate im
ersten 2023-Snapshot umgesetzt. Offizielle portugiesische Sprache ist als
belegte Relation vorhanden. Höhe und weitere Faktfamilien bleiben eine
Erweiterung, nicht Teil des ersten Phase-6-Slices.

## 22. Wissenspuzzle-Compiler

- sichere Expression-Sprache.
- Filter, Schnittmenge, Ranking, Minimum/Maximum und Anzahl.
- Eindeutigkeits- und Gleichstandsprüfung.
- Erklärung und Quellenkette.
- 20–50 kuratierte Templatefamilien.
- Wissenspuzzle-Abzeichen und Integration in Weltmix.

**Gate:** Nicht eindeutige oder unbelegte Fragen können den Content-Build nicht
passieren.

**Stand 2026-07-30:** 20 kuratierte Vorlagen, sichere Filter/Schnittmengen,
Ranking, Faktenfilter, ein einstufiger Relationspfad, Erklärungen,
Quellenlinks, Wissenspuzzle-Abzeichen und der zehnte Weltmix-Pool sind
umgesetzt. Minimum/Maximum sind durch Rang 1 auf-/absteigend abgedeckt;
Anzahlfragen und längere Relationspfade bleiben spätere Sprachversionen.

## 23. Städte 100/250/500/1000

- [x] GeoNames-Snapshot und Rangdefinition.
- [x] alternative Namen und Regionssets.
- [x] Lazy-Loading und synthetische Kartenperformance.
- [x] Marathon-Spielstände.
- [x] Städte-Abzeichen und Mixed-Pools.
- [ ] echte Android-/Netzmessung und vollständiger 1000er-Dauertest.
- [ ] redaktionelle Sichtung der deutschen Namen.

**Gate:** Top-1000-Modus startet und läuft flüssig, ist pausierbar und nennt
Quelle, Datum und Rankingmethode.

**Stand 2026-07-30:** Der technische Slice ist mit 6000 lazy geladenen
GeoNames-Städten, sieben exakten Top-1000-Scopes, beiden Fragerichtungen,
Suche/Clustering, pausierbarem Marathon, Fehlertraining, Abzeichen und
Weltmixintegration umgesetzt. Automatisierte Desktop-/Pixel-7-Flows und
synthetische Zeitmessungen bestehen; echtes Mittelklasse-Android,
Netzdrosselung, vollständiger 1000er-Langlauf und redaktionelle
Namensabnahme bleiben für das endgültige Gate offen.

## 24. Adaptives Lernen

- echte Wiederholungsqueue.
- Algorithmus aus Ereignissen berechenbar.
- persönliche Mixed-Gewichte nach Schwächen.
- Schwierigkeitsanpassung ohne unfaire Überraschungen.
- Fortschrittsvisualisierung.

**Gate:** Personalisierung ist erklärbar und kann deaktiviert werden.

## 25. Challenges und soziale Funktionen

- teilbare Definition + Dataset-Version + Seed.
- serverbestätigte Ergebnisse.
- Ranglistenregeln und Betrugsschutz.
- Freunde/Klassen nur mit eigenem Datenschutzkonzept.

**Gate:** Persönliche Spielstände bleiben privat, solange sie nicht bewusst
geteilt werden.

## 26. Redaktions- und Content-Skalierung

- kuratierte Content-Packs.
- Review-Queues und Freigabestatus.
- Preview von Fragen und Erklärungen.
- Dataset-Diff und Rollback.
- Übersetzungsworkflow.

**Gate:** Neue Content-Packs können ohne App-Release validiert und versioniert
veröffentlicht werden.

## 27. Produktionshärtung

- Monitoring ohne unnötige persönliche Daten.
- Backup-/Restore-Probe.
- Account-Export und Löschung.
- Lasttests für Sync und Achievement-Auswertung.
- Cross-Browser- und Gerätematrix.
- Incident- und Datenrollback-Prozess.

**Gate:** Öffentlicher Release erfüllt Sicherheit, Datenschutz, Performance,
Barrierefreiheit und Wiederherstellbarkeit.
