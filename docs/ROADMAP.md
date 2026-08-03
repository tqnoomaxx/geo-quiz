# Roadmap

Die Reihenfolge optimiert Lernwert und Architekturbeweis, nicht die Anzahl
sichtbarer Themen.

Die vollständige technische Reihenfolge mit 28 einzeln abnehmbaren Schritten
steht in [`IMPLEMENTATION_STEPS.md`](IMPLEMENTATION_STEPS.md). Dieses Dokument
gruppiert sie in größere Produktphasen.

## Phase 0 – Spezifikation und technische Spikes

**Ziel:** Die wichtigsten Risiken vor dem eigentlichen Ausbau testen.

- [x] Produkt-, Quiz-, Daten- und Architekturrahmen festlegen.
- [x] Quellen- und Lizenzstrategie festlegen.
- [ ] Offene Produktentscheidungen aus `DECISIONS.md` klären.
- [ ] Vollständige visuelle Konzepte für Start/Setup, Kartenfrage,
  Texteingabe, Feedback, Ergebnis und Mobilansicht erstellen und abnehmen.
- [ ] Karten-Spike mit 10 Ländern, Punkt- und Flächenauswahl bauen.
- [ ] Textgrader-Spike mit deutschen Namen und Aliassen bauen.
- [ ] Bundle-, Karten- und Mobile-Performance messen und Budgets festlegen.

**Gate:** Karte und Grader sind auf Mobil und Desktop nachweislich fair; das
visuelle Konzept ist freigegeben.

### Arbeitsstand 2026-07-30

- Vier zusammenhängende Phase-0-Konzepte, zentrale Design-Tokens und reale
  Browser-Renderings sind vorhanden; die abschließende Freigabe durch den
  Nutzer steht aus.
- Text-, Kartenpunkt- und Kartenflächen-Grader wurden im Spike bewiesen und
  laufen inzwischen über den vollständigen Phase-2-Snapshot sowie dieselbe
  generische Engine. Unit- und Produktions-Browsertests decken alle vier
  Kombinationen ab.
- Die automatisierte Suite ist mit Phase 2 auf 32 Unit-/Contract-/Datentests
  und sieben ausgeführte Produktions-Browserflüsse für Desktop und Mobile
  gewachsen.
- GitHub-Pages-Workflow und hosting-neutraler Basispfad sind vorbereitet. Ein
  öffentlicher Deploy wartet auf Produkt-/Repositoryname und GitHub-Remote.
- Build-Baseline ist dokumentiert; der Karten-Chunk liegt noch über dem
  vorläufigen Einzelbudget.

## Phase 1 – Engine-Vertical-Slice

**Ziel:** Eine komplette Runde mit echten Daten und lokaler Speicherung.

- [x] App-Shell, Routing, Design Tokens und Basiskomponenten.
- [x] Content-Schema und kleine Fixture-Pipeline.
- [x] QuizDefinition-Validierung.
- [x] Deterministischer, versionierter Fragengenerator.
- [x] Engine-Zustände, Timer und Scoring v1.
- [x] Text-, Kartenpunkt- und Kartenflächen-Grader.
- [x] Eine Hauptstadt-Kartenrunde von Setup bis Ergebnis.
- [x] Persistenz laufender/beendeter Sessions.
- [x] Unit-, Contract- und Browser-Smoke-Tests.

**Gate:** Die Runde funktioniert durchgehend, ein Seed ist reproduzierbar und
die Engine enthält keine Hauptstadt-spezifische UI-Logik.

### Arbeitsstand 2026-07-30

- Die Fixture-Pipeline erzeugt reproduzierbar 21 Entitäten, 40 Relationen,
  Manifest, Prüfsummen und Qualitätsbericht.
- `capitals-europe-map-point-v1` erzeugt mit
  `mulberry32-v1` und festem Seed dieselben zehn Fragen.
- Die serialisierbare Engine übernimmt Bewertung, Feedbackzustand, Scoring,
  Timerereignisse, Pause, Fortsetzung und Abschluss.
- IndexedDB hält aktive und abgeschlossene Sessions; ein Reload nach einer
  bestätigten Antwort setzt exakt denselben Snapshot fort.
- 32 Unit-/Contract-/Datentests sowie die Phase-2-Playwright-Suite bestehen.
- Persistierte Snapshots werden inzwischen tief validiert; ungültige Daten
  landen in Quarantäne. DB-Schema 1 wird auf 2 erweitert.
- **Gate noch offen:** eine allgemeine Migrationsmatrix für künftige
  Sessionversionen sowie die Fairness-/Gerätemessungen aus Phase 0.

## Phase 2 – MVP Länder und Hauptstädte

**Ziel:** Öffentlich testbare Kern-App.

- [x] Technisch vollständiger 195-Staaten-/202-Hauptstadtsitze-Snapshot.
- [x] Vier in `PRODUCT.md` definierte Frage-Antwort-Kombinationen.
- [x] Welt und sechs Kontinentscopes.
- [x] 10/20/alle, Timer aus/15/30 Sekunden.
- [x] Erklärendes Feedback für Punkt, Fläche und Text.
- [x] Fehlerliste, gezieltes Fehlertraining und lokaler Rohlernstand.
- [ ] Tastatur- und Screenreader-Grundfluss sowie Touch auf realen Geräten
  manuell abnehmen; responsive Chromium- und Axe-Baseline besteht.
- [x] Produktions-App und vorbereitete Runde funktionieren nach Online-Start
  offline.
- [x] Attribution, Datenstand und Darstellungsregeln sind sichtbar.

**Gate:** Alle MVP-Abnahmekriterien aus `PRODUCT.md` bestehen automatisiert oder
mit dokumentierter manueller Prüfung.

### Arbeitsstand 2026-07-30

- Der Offline-Content-Build erzeugt 403 Entitäten, 809 Relationen, Manifest,
  Qualitätsbericht und eine fehlende Tuvalu-Geometrie.
- Alle vier Modi laufen aus derselben Setup-/Generatorstruktur auf Desktop und
  im Pixel-7-Viewport. Reload, Timeranzeige, Fortschrittsereignisse,
  Fehlertraining, Offline-Start und Accessibility-Baseline sind automatisiert.
- 32 Unit-/Contract-/Datentests und sieben ausgeführte
  Produktions-Browserflüsse bestehen; drei Desktop-spezifische Flüsse werden
  im Mobile-Projekt bewusst nicht doppelt ausgeführt.
- **Gate noch offen:** fachliche Einzelprüfung politisch/zeitlich sensibler
  Hauptstädte, ODbL-Releaseprüfung, reale Screenreader-/Touchtests,
  Kartenpunkt-Fairnessmessung und das überschrittene Kartenbudget.
- Ein öffentlicher Pages-Deploy bleibt bis zu Git-Repository, Remote,
  Produkt-/Repositoryname und den offenen Releaseprüfungen blockiert.

## Phase 3 – Accounts, Sync und Abzeichenfundament

**Ziel:** Spielstände zuverlässig sichern und Fortschritt systematisch belohnen.

- [x] Auth-/Sync-Adapter und versionierte Supabase-Migration für Profile,
  Geräte, Ereignisse, Import-Batches, Freischaltungen und Row Level Security.
- [x] stabile lokale Gastidentität, JSON-Export und verlustfreie
  Übernahmelogik mit Offline-Outbox.
- [x] idempotenter, transaktionaler Eventimport und lokaler/entfernter Merge
  nach stabilen IDs.
- [x] generische Achievement Engine aus versionierten Definitionen und
  Aggregaten.
- [x] Sammlung, Ergebnisfeedback und erste Länder-/Hauptstadt-Abzeichen.
- [x] Account- und Abzeichenflächen bleiben auf GitHub Pages lazy geladen und
  ohne Backend im Gastmodus nutzbar.
- [ ] Migration in einem echten Supabase-Projekt anwenden und OTP/SMTP
  abnehmen.
- [ ] Zwei-Konten-RLS-Test und Mehrgeräte-Retry gegen das echte Backend.
- [ ] serverseitige Achievement-Neuberechnung und privilegierter
  Kontolöschpfad.

**Gate:** Wiederholter Sync erzeugt keine Duplikate; Konten sind strikt
voneinander isoliert; neue Standardabzeichen benötigen nur Konfiguration.

### Arbeitsstand 2026-07-30

- IndexedDB v3 übernimmt das Phase-2-Gastprofil und ergänzt Identität,
  Outbox, Syncstatus und Achievement-Freischaltungen.
- 54 Unit-/Content-/SQL-Contract-Tests sowie acht ausgeführte
  Produktions-Browserflüsse bestehen. Vier Desktop-spezifische Flüsse werden
  im Mobile-Projekt bewusst nicht doppelt ausgeführt.
- Der unkonfigurierte Pages-Build entfernt Supabase vollständig; bei gesetzten
  öffentlichen Variablen liegt der Client in einem eigenen dynamischen Chunk.
- **Gate noch offen:** Es existieren in diesem Workspace weder Supabase-Projekt
  noch Zugangsdaten. RLS-Isolation, OTP-Zustellung, echter Wiederholungssync,
  serverseitige Achievement-Prüfung und Kontolöschung sind deshalb nicht als
  produktiv abgenommen markiert.
- Der öffentliche Pages-Deploy bleibt zusätzlich durch `C-001`, `C-007` und
  die offenen Phase-2-Releaseprüfungen blockiert.

## Phase 4 – Flaggen, Formen und erster Weltmix

**Ziel:** Beweisen, dass visuelle Prompts ohne Engine-Umbau hinzukommen.

- [x] Lokale SVG-Flaggenpipeline.
- [x] `visual_asset`-Prompt.
- [x] Flagge → Text, Flagge → Auswahl, Land → Flagge.
- [x] Länderumriss → Text.
- [x] Zentrale Lern-/Übungs-/Prüfungsprofile mit echten Regelabläufen.
- [x] Besseres Fehlertraining und erste Wiederholungsqueue.
- [x] gewichteter Mixed-Mode-Scheduler.
- [x] erster Weltmix aus Ländern, Hauptstädten, Flaggen und Formen.

**Gate:** Neue Modi bestehen überwiegend aus Presets, Assets und einer
Prompt-Komponente. Der Weltmix ist mit Seed reproduzierbar.

### Arbeitsstand 2026-07-30

- Der vertikale Slice, seine Asset-/Round-Verträge und die Grenze zur späteren
  Spaced-Repetition wurden in
  `slices/PHASE_4_VISUAL_MIX_VERTICAL_SLICE.md` und D-031 bis D-033
  festgelegt.
- Der Offline-Build erzeugt und prüft 195 Flaggen sowie 195 Länderumrisse als
  einzelne lokale SVGs. Eine Runde lädt nur ihre tatsächlich referenzierten
  Motive vor; Fragen speichern weiterhin ausschließlich stabile Asset-Keys.
- Vier visuelle Presets, `single-choice-v1`, Lern-/Übungs-/Prüfungsprofile und die erste
  Rohereignis-Wiederholungsqueue laufen durch dieselbe Session-/Progress-Engine.
- Der gewichtete Scheduler orchestriert vier vorhandene Definitionen und
  erzeugt mit gleichem Seed identische Poolfolge, Subjekte und
  Auswahlpositionen.
- 59 Unit-/Content-/Engine-Tests sowie zwölf ausgeführte Produktions-Browserflüsse
  bestehen. Sechs Desktop-spezifische Flüsse werden im Mobile-Projekt bewusst
  nicht doppelt ausgeführt; die vier visuellen Modi laufen auf beiden
  Viewports. Eine vorbereitete visuelle Runde wurde zusätzlich unter dem
  GitHub-Pages-Unterpfad offline wiederhergestellt.
- **Technisches Phase-4-Gate erreicht:** neue Modi bestehen aus Presets,
  Asset-Pipeline, einem visuellen Renderer und dem isolierten Auswahlgrader.
  Die weiterhin offenen Release- und Backend-Gates aus Phase 0–3 bleiben durch
  C-044 sichtbar und blockieren eine öffentliche Gesamtfreigabe.

## Phase 5 – Physische Geographie und vollständiger Weltmix

**Ziel:** Punkt-, Linien- und Flächeninhalte jenseits politischer Grenzen.

- [x] Flüsse, Seen, Meere, Gebirge und Gipfel als versionierte Entitäten.
- [x] Linienauswahl-Grader und robuste Hit-Zonen.
- [x] Kartenstile für physische Layer.
- [x] Kuratierte Umfänge nach Welt/Region/Schwierigkeit.
- [x] Automatisierte fachliche Contracts und Regressionstests.
- [x] Weltmix um Flüsse, Seen, Meere, Gebirge und Gipfel erweitern.
- [x] Abzeichenfamilien für alle neuen Themen.
- [ ] Redaktionelle Vollsichtung und echte Touchgeräte-Abnahme.

**Gate:** Linienfragen funktionieren auch bei nahen Verläufen auf Touchgeräten
fair; Quellen und Geometrien sind rückverfolgbar; Themenwechsel in einer Runde
funktionieren ohne Sonderlogik.

### Arbeitsstand 2026-07-30

- Der gepinnte Natural-Earth-5.1.2-Snapshot enthält 18 Flüsse, 18 Seen,
  18 Meere, 18 Gebirge und 16 Gipfel. Dataset-Schema 3 verbindet alle
  88 Entitäten, Namen, überlappenden Kontinentscopes und fünf getrennten
  Geometrieartefakte per Prüfsumme.
- Zehn neue Presets kombinieren `name`/`map_highlight` mit `map_line`,
  `map_area`, `map_point` oder `text_input`. `line-v1` bewertet stabile IDs;
  der Kartenadapter wählt Flüsse in Bildschirmkoordinaten mit 12/18-px-Toleranz
  und bricht mehrdeutige Treffer ab.
- Der Weltmix orchestriert jetzt neun bestehende Pools. Session, Timer,
  Fortschritt, Fehlertraining und Bewertung benötigten dafür keine
  themenspezifische Sonderlogik.
- Fünf neue Bronze-Abzeichenfamilien werden aus denselben
  Fortschrittsereignissen berechnet.
- 69 Unit-/Content-/Engine-Tests bestehen. Der Produktions-Browserlauf prüft
  alle zehn neuen Kombinationen auf Desktop und im Pixel-7-Viewport sowie
  Neun-Pool-Mix, Offline-Wiederaufnahme und Accessibility.
- Die physische Geometrie wird pro Thema lazy geladen. Der Kartenchunk bleibt
  dennoch über dem Phase-0-Budget; C-054 dokumentiert Messung und Aufteilung.
- **Technischer Slice erreicht:** Datenrückverfolgung, Modi, Themenwechsel und
  responsive Browserregressionen bestehen. **Gate noch offen:** fachliche
  Vollsichtung und Fairness auf echten Touchgeräten gemäß C-051; C-056 hält den
  behobenen mobilen Weltkamera-Fund fest. Die früheren Release-Gates bleiben
  ebenfalls offen.

## Phase 6 – Faktengraph und Wissenspuzzles

**Ziel:** Mehrstufige, erklärbare Geographiefragen aus geprüften Fakten.

- [x] Facts mit Quelle, Definition, Einheit und Bezugsdatum.
- [x] sichere Abfragesprache für Filter, Relationen, Rang und Schnittmengen.
- [x] Build-Zeit-Compiler mit Eindeutigkeitsprüfung.
- [x] erklärendes Feedback mit Faktenkette.
- [x] 20 kuratierte Vorlagen, Einzelmodus, Abzeichen und Integration in
  Weltmix.
- [ ] Quellen- und Formulierungsreview durch eine zweite fachliche Person.
- [ ] Faktenumfang um Höhe und weitere Relationsfamilien erweitern.

**Gate:** Nicht eindeutige, unbelegte oder methodisch vermischte Fragen
blockieren den Content-Build.

### Arbeitsstand 2026-07-30

- Dataset-Schema 4 enthält zwei FactDefinitions, 388 World-Bank-Fakten für
  Landfläche und Bevölkerung im gemeinsamen Bezugsjahr 2023, neun
  Portugiesisch-Amtssprachenrelationen, Quellenmetadaten und 20 fertig
  kompilierte Wissensfragen.
- Die kleine deklarative Sprache unterstützt Relations- und Faktenfilter,
  Schnittmengen sowie auf- und absteigende Ränge. Vorlagen können die
  ermittelte Entität direkt oder über genau eine geprüfte Relation beantworten.
- Der Content-Build verwirft fehlende Filter- oder Rankingwerte, gemischte
  Quelle/Methode/Bezugszeit, Gleichstände, unbekannte Quellen und
  mehrdeutige Antwortpfade. Erklärung, Evidenzzeilen und Quellen werden in den
  serialisierbaren Fragensnapshot übernommen.
- Zwei Presets verwenden `description` mit `single_choice` oder `text_input`.
  Ein zehnter Pool erweitert den Weltmix ohne neuen Sessiontyp oder Grader;
  Fortschritt, Fehlertraining und Bronze-Abzeichen verwenden normale
  Skill-Ereignisse.
- 76 Unit-/Content-/Engine-Tests und der Produktionsbuild bestehen. Der
  Produktions-Browserlauf führt 17 Flows aus (7 mobile Doppelungen bewusst
  übersprungen), darunter beide Wissensmodi auf Desktop und Pixel 7, die
  Quellen-/Herleitungsansicht, Accessibility sowie den vollständigen
  Zehn-Pool-Mix.
- **Technisches Phase-6-Gate erreicht:** die automatisierten Sperren für
  Uneindeutigkeit, Beleglosigkeit und Methodenmix sind aktiv. **Redaktionell
  offen:** CPLP-Mitgliedschaft/Länderprofile müssen vor öffentlicher Freigabe
  auf Verfassungsebene gegengeprüft werden; weitere Faktenfamilien sind noch
  nicht Teil dieses Slices. Frühere Release-, Backend- und echte
  Geräte-Gates bleiben offen.

## Phase 7 – Große Ranglistenpakete

**Ziel:** Große Mengen ohne unübersichtliche oder unehrliche Rangliste.

### Städte 100 bis 1000

- [x] GeoNames-Snapshot-Pipeline und deutsche/alternative Namen.
- [x] Modi Top 100, 250, 500 und 1000.
- [x] Gebietsspezifische Stadtsets.
- [x] Clustering nur in Lernübersichten, nicht als Antwortziel.
- [x] Suche, Wiederaufnahme und Marathon-Zwischenstände.
- [x] Daten-Lazy-Loading und synthetische Performanceprüfung.
- [x] Städte-Abzeichen, Fehlertraining und Integration in den Weltmix.
- [ ] Redaktionelle Prüfung der deutschen Namensabdeckung.
- [ ] Vollständigen 1000er-Langlauf auf einem echten mittleren Android-Gerät
  und unter gedrosseltem Netz profilieren.

### Globale physische Top-100-Listen

- [x] Flusssysteme nach versionierter Systemlänge statt „größter Fluss je
  Land“.
- [x] Eigenständige Gipfel nach Höhe über Meeresspiegel.
- [x] Faktenprofile mit Länge/Höhe, Ländern und Mündung beziehungsweise
  Gebirge.
- [x] Eindeutige Ranggrenze, Quellenrevision, Lizenz und Methode im Manifest.
- [x] Eigene Quizthemen mit `fact → text_input`, Lösung und Fehlertraining.

### Länderprofile

- [x] Amtssprachen und Währungen für alle 195 Länder als stabile Entitäten und
  Relationen bauen.
- [x] Land → Hauptstadt, Amtssprache und Währung als gemeinsamen
  Mehrfeldmodus umsetzen.
- [x] Mehrfachwerte fair akzeptieren und in der Lösung vollständig zeigen.
- [x] Lernen, Üben und Prüfung über dieselben zentralen Regelprofile anbieten.
- [x] Vereinfachte Challenge-Auswahl mit direkt sichtbaren Einstellungen auf
  Desktop und Mobil umsetzen.

**Gate:** Definition und Datenstand sind in der UI sichtbar; 1000 Punkte
beeinträchtigen Karteninteraktion und Startzeit nicht unvertretbar.

### Arbeitsstand 2026-08-04

- Der explizite Netzwerkrefresh pinnt `cities1000.zip`,
  `alternateNamesV2.zip` und `countryInfo.txt` samt Bytezahl und SHA-256.
  Der normale Content-Build bleibt offline und reproduzierbar.
- Der Lazy-Pack enthält die Vereinigungsmenge aus globalen und sechs
  kontinentalen Top-1000-Listen: 6000 stabile GeoNames-Entitäten, 3100
  bevorzugte deutsche Anzeigenamen und 1527 deutsche Antwortaliasse.
- Ranking und UI sagen ausdrücklich „GeoNames-Bevölkerungsfeld“,
  Snapshotdatum und Tie-Break nach numerischer GeoNames-ID. Top 100, 250, 500
  und 1000 liefern in jedem der sieben Scopes exakt die gewählte Anzahl.
- Karten- und Texteingabefragen nutzen vorhandene Generatoren und Grader.
  Die Übersicht clustert 1000 Punkte und bietet Alias-Suche; die eigentliche
  Kartenfrage bleibt ein einzelnes, unclustered Antwortziel.
- 1000-Fragen-Snapshots sind pausier- und mit identischer Session-ID
  fortsetzbar. Fortschritt, Fehlertraining, drei Stadt-Abzeichen und der
  Weltmix verarbeiten `ranked_city` über vorhandene Ereignisverträge.
- Ein zweiter lazy Pack enthält 100 globale Flusssysteme und 100 eigenständige
  Gipfel. Flüsse zeigen Systemlänge, Länder im Einzugsgebiet und Mündung;
  Berge zeigen Höhe, Land/Region und Gebirge. Die Lösung wiederholt Name und
  vollständiges Faktenprofil.
- Die fest versionierten Wikipedia-Revisionen werden nur durch einen
  expliziten Refresh aktualisiert. Der Build sperrt unvollständige Faktserien,
  gemischte Methoden und einen Gleichstand an der Top-100-Grenze.
- Der Kerndatensatz ergänzt 139 Sprachen, 146 Währungen und vollständige
  relationale Profile für alle 195 Länder. `country-profile-v1` speichert
  richtige, teilweise richtige und aufgedeckte Dreifeldantworten.
- 126 Unit-/Content-/Engine-Tests sowie 30 Produktions-Browsertests auf
  Desktop und Pixel 7 bestehen; acht redundante Mobil-Doppelungen werden
  bewusst übersprungen.
  Der Browserlauf prüft unter anderem Länderprofil-Eingabe und -Auflösung,
  Top-1000-Start, Pause/Fortsetzen, Offline-Start sowie Desktop und
  Pixel-7-Viewport.
- Das Städtepaket liegt in einem separaten Chunk von 404,21 kB gzip und wird
  nur bei Stadtmodus oder vorhandenem Stadtlernstand geladen. Lokale,
  ungedrosselte Chromium-Messungen lagen bei 386–408 ms bis zur
  Stadtübersicht und 78–81 ms von dort bis zur Marathonrunde.
- **Technischer und synthetischer Phase-7-Slice erreicht:** Datenvertrag,
  Lazy-Loading, exakte Sets und Browserflüsse bestehen. **Gate noch offen:**
  echte Geräte-/Netzmessung, vollständiger 1000er-Dauertest und redaktionelle
  Namenssichtung. Frühere Release-Gates bleiben ebenfalls offen.

## Phase 8 – Lernsystem und Personalisierung

### Astronomie-Grundwissen

- [x] Acht Planeten, zwanzig bekannte Monde und fünf Zwergplaneten als
  versionierten, von NASA belegten Offline-Snapshot integrieren.
- [x] Zwölf Tierkreis-Sternbilder mit lokalen, vereinfachten SVG-Lernkarten
  und offiziellen IAU-Kürzeln integrieren.
- [x] Sternzeichenname verpflichtend und IAU-Kürzel, Sichtbarkeitsmonat sowie
  Himmelslage einzeln konfigurierbar machen.
- [x] Einen generischen `fact-profile-v1`-Grader statt astronomischer
  Session-Sonderlogik verwenden.
- [x] Lernen, Üben, Prüfung, Lösung, Persistenz und Fehlertraining für alle
  vier Themen durch dieselben zentralen Verträge führen.

**Astronomie-Slice-Gate erreicht:** Content- und Engine-Verträge sowie der
Produktionsfluss auf Desktop und Pixel-7-Viewport bestehen. Eine fachliche
Sichtung aller zwölf vereinfachten Linienbilder bleibt redaktionelle QA.

- Spaced-Repetition-Algorithmus mit Versionierung.
- Eigene Lernlisten und gezieltes Fehlertraining.
- Fortschrittsansichten pro Thema, Gebiet und Skill.
- Datenexport/-löschung und Datenschutzfluss.
- persönliche Mixed-Gewichte anhand der Lernschwächen.

## Phase 9 – Soziale und redaktionelle Funktionen

Nur nach nachgewiesenem Kernnutzen:

- Geteilte Challenges mit signierter QuizDefinition und Seed.
- Ranglisten mit Betrugsschutz und klaren Regeln.
- Klassen-/Lehrkraftfunktionen.
- Redaktionsoberfläche für kuratierte Datensätze.
- Nutzerinhalte mit Moderation und Versionierung.

## Bewusst nicht parallelisieren

- Kein Multiplayer vor stabiler Singleplayer-Engine.
- Kein Backend vor belastbarer lokaler Daten- und Sessionstruktur.
- Keine 1000 Städte vor Lazy-Loading und Datenqualitätsbericht.
- Kein freies Flusszeichnen vor funktionierender Linienauswahl.
- Keine Gamification-Metawährung vor belastbarem Lernfortschritt.
