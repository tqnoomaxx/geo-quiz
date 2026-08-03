# Critics – Probleme, Risiken und offene Schwächen

Hier werden während Planung und Umsetzung konkrete Probleme festgehalten. Ein
Eintrag bleibt sichtbar, auch wenn er gelöst wurde.

## Status

- `open`: noch ungelöst.
- `mitigated`: vorläufig beherrscht, endgültige Lösung folgt später.
- `resolved`: überprüfbar gelöst.

## C-001 – Git-Repository und GitHub-Remote fehlten

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Der Projektordner besaß zunächst kein `.git` und kein
  GitHub-Remote. Ein echter Pages-Deploy war deshalb nicht möglich.
- **Auswirkung:** Workflow und Build konnten vorbereitet und lokal geprüft, aber
  noch nicht veröffentlicht werden.
- **Maßnahme:** Der Ordner ist seit 2026-08-04 mit
  `tqnoomaxx/geographie` verbunden. Pushes nach `main` starten den vorhandenen
  GitHub-Pages-Workflow.

## C-002 – GitHub Pages läuft unter einem Repository-Unterpfad

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Assets und SPA-Routen brechen leicht unter
  `https://<owner>.github.io/<repo>/`.
- **Auswirkung:** Lokal funktionierende absolute `/assets/...`-Pfade könnten
  online 404 liefern.
- **Maßnahme:** Vite-Base über `BASE_PATH` setzen, Hash-Routing verwenden und
  Pages-Workflow den Repositorynamen automatisch übergeben. Später kann
  `PUBLIC_BASE_PATH=/` für eine eigene Domain gesetzt werden.

## C-003 – GitHub Pages bietet kein Account-Backend

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Pages hostet nur statische Dateien.
- **Auswirkung:** Konten, Sync und serverbestätigte Abzeichen können dort nicht
  selbst laufen.
- **Maßnahme:** MVP local-first. Phase 3 ergänzt Supabase als getrennten,
  optionalen Adapter samt SQL-Migration; Hosting der Oberfläche kann bis zum
  Umzug auf Pages bleiben.

## C-004 – Designkonzepte enthalten gerasterten Beispieltext

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Generierte UI-Mockups können Text oder Details ungenau darstellen.
- **Auswirkung:** Ein Screenshot darf niemals direkt als Oberfläche oder
  fachliche Quelle verwendet werden.
- **Maßnahme:** Konzepte dienen nur als visuelle Spezifikation. Texte, Icons,
  Karte, Fokuszustände und Controls werden vollständig code-native umgesetzt.

## C-005 – Karten-Demodaten sind nicht der finale Content-Build

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Der Phase-0-Spike verwendet niedrig aufgelöste
  Natural-Earth-Geometrie aus `world-atlas`. Namen und Feature-IDs entsprechen
  noch nicht dem geplanten internen Content-Schema.
- **Auswirkung:** Nicht als Produktionsdatensatz oder politische Definition
  verwendbar.
- **Maßnahme:** Phase 2 ersetzt die Fixture durch den versionierten
  195-Staaten-/202-Hauptstadtsitze-Snapshot aus world-countries, Wikidata und
  Natural Earth. Schema, Quellen, Relationen, Prüfsummen, Scopezahlen und
  Reviewlisten werden im normalen Offline-Build validiert.

## C-006 – Faire Kartenpunkt-Toleranz ist noch nicht gemessen

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Ein fester Kilometerradius kann je Zoom, Gerät und Stadt unfair
  sein.
- **Auswirkung:** Richtige grobe Kenntnisse könnten als falsch bewertet werden.
- **Maßnahme:** Spike zeigt Distanz transparent. Mobile Tests und eine
  zoom-/inhaltsabhängige Regel sind Teil des Phase-0-Gates. Phase 2 verwendet
  vorläufig 220 km in Kontinentscopes und 400 km auf der Weltkarte; responsive
  Browserflüsse bestehen, reale Fairnessmessungen fehlen weiterhin.

## C-007 – Produktname ist weiterhin ein Platzhalter

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** `GeoApp` ist noch kein freigegebener Markenname.
- **Auswirkung:** Repositoryname, öffentliche URL, Logo und spätere Domain
  könnten sich ändern.
- **Maßnahme:** Architektur und Tokens nicht an den Namen koppeln. Vor dem
  ersten öffentlichen Deploy Namen und GitHub-Repository festlegen.

## C-008 – MapLibre 6 erhöht die Browseranforderung

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** MapLibre GL JS 6.0 ist gerade erschienen, ESM-only und verlangt
  WebGL 2; WebGL 1 wurde entfernt.
- **Auswirkung:** Ein sofortiges Upgrade könnte ältere oder eingeschränkte
  Geräte ausschließen und verändert Import/API-Verhalten.
- **Maßnahme:** Phase-0-Spike pinnt `maplibre-gl` auf 5.24.x. Vor Upgrade
  Zielbrowserdaten prüfen und die v5→v6-Migration bewusst testen.

## C-009 – Erste Dependency-Pins enthielten bekannte Schwachstellen

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Der erste Installationslauf meldete bekannte Schwachstellen in
  den gepinnten Vite-/Vitest-Versionen und einer transitiven
  `esbuild`-Abhängigkeit.
- **Auswirkung:** Der Stand darf so weder als Baseline noch im
  GitHub-Pages-Workflow verwendet werden.
- **Maßnahme:** Vite und Vitest wurden auf kompatible Patchversionen,
  `esbuild` auf 0.28.1 aktualisiert und das Lockfile neu erzeugt. Die erneute
  Prüfung meldet 0 bekannte Schwachstellen.

## C-010 – Karten-Chunk überschreitet das vorläufige Einzelbudget

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Der Phase-2-Produktionsbuild erzeugt für MapLibre,
  Natural-Earth-50m-Geometrien und Adapter einen separaten Chunk von rund
  522 kB gzip. Der App-Chunk liegt zusätzlich bei rund 125 kB gzip. Beide
  überschreiten ihre vorläufigen Budgets.
- **Auswirkung:** Auf schwachen Mobilgeräten kann die erste Karte trotz
  Code-Splitting merklich später interaktiv werden.
- **Maßnahme:** Vorläufiges Budget und Messstand stehen in
  `docs/PERFORMANCE.md`. Vor dem Release statische Startvorschau, regionale
  Geometrie-Splits, stärkere Vereinfachung und ein schlankerer Kartenladepfad
  messen. Das Vite-Warnlimit wird nicht angehoben, um den Befund zu verstecken.

## C-011 – TopoJSON-Geometrien erzeugten Kartenartefakte

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** `world-atlas` liefert für D3 geeignete Ringe. Beim direkten
  GeoJSON-Rendern in MapLibre entstanden an Antimeridian und Ringrichtung
  großflächige Rechtecke.
- **Auswirkung:** Europa- und Weltkarte waren fachlich und visuell falsch.
- **Maßnahme:** Der Adapter entwirrt Längengrade am Antimeridian, normalisiert
  Außen-/Innenringe nach RFC 7946 und entfernt eine degenerierte Teilfläche.
  Datentests prüfen Ländernamen, Ringrichtung und Längengrad-Sprünge.

## C-012 – Setup-Optionen sind im Spike noch nicht fachlich verdrahtet

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Themen-, Regions-, Fragenzahl- und Timer-Steuerung zeigen die
  geplante Bedienung, starten in Phase 0 aber immer dieselben drei Demofragen.
- **Auswirkung:** Der Spike darf nicht als fertiger Quizkonfigurator
  missverstanden werden.
- **Maßnahme:** Die Oberfläche verdrahtet jetzt Länder/Hauptstädte,
  Name/Kartenmarkierung, Welt/sechs Kontinente, 10/20/alle und aus/15/30
  Sekunden vollständig über eine validierte `QuizDefinition`. Spätere Themen
  bleiben sichtbar als „Später verfügbar“ deaktiviert.

## C-013 – Phase 0 hat sein vollständiges Gate noch nicht erreicht

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Phase 1 startet auf ausdrücklichen Wunsch, obwohl Produktname,
  Standard-Länderset, reale Gerätemessungen und abschließende Designfreigabe aus
  Phase 0 offen sind.
- **Auswirkung:** Der Engine-Slice kann technisch wachsen, darf aber noch nicht
  als freigegebener MVP oder Produktionscontent gelten.
- **Maßnahme:** Phase 1 blieb zunächst auf eine kleine Fixture begrenzt. Der
  spätere ausdrückliche Start von Phase 2 trotz offener Gatepunkte wird
  getrennt in C-018 dokumentiert; die alten Lücken bleiben sichtbar.

## C-014 – Feste Desktop-Kamera versteckte Lissabon auf Mobil

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Mit Zentrum `[15, 53]` und Zoom 3 lag Lissabon im
  390-Pixel-Viewport außerhalb der anfänglichen Kartenfläche.
- **Auswirkung:** Eine Frage konnte mobil nicht ohne eigenes Verschieben der
  Karte beantwortet werden und der Browser-Smoke-Test blockierte.
- **Maßnahme:** Interaktive Europakarten verwenden eine viewportabhängige
  Kamera; markierte Textfragen zentrieren ihr Ziel. Antwortkarten bleiben
  verschieb-/zoombar, und die Browsertests zoomen für außerhalb liegende
  transkontinentale Zentren automatisiert heraus.

## C-015 – Persistierte Sessions werden erst oberflächlich validiert

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Beim Lesen aus IndexedDB prüft `isQuizSessionState` bisher nur
  Schema-ID und zentrale Containerfelder, nicht jeden Question-/Attempt-Snapshot.
- **Auswirkung:** Manuell beschädigte oder später inkompatible Browserdaten
  könnten erst beim Rendern oder Fortsetzen scheitern.
- **Maßnahme:** `validateQuizSessionState` prüft Definition, Fragen,
  Antwortpayloads, Resultate, Timing, Ordinale und Sessionreferenzen tief.
  Ungültige Sessions werden beim Lesen aus den aktiven/letzten Verweisen
  entfernt und mit Problemliste im Object Store `quarantine` bewahrt.
  Unit- und Produktions-Reloadtests decken gültige und beschädigte Snapshots ab.

## C-016 – IndexedDB kann in restriktiven Browsern ausfallen

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Private Modi, Quoten oder Browserrichtlinien können Öffnen oder
  Schreiben von IndexedDB verhindern.
- **Auswirkung:** Wiederaufnahme und Ergebnisverlauf sind dann nicht dauerhaft.
- **Maßnahme:** Der Quizfluss startet trotzdem und zeigt eine Speicherwarnung.
  Ein automatisierter Test für echten Quoten-/Berechtigungsfehler sowie eine
  Export- oder Fallbackstrategie fehlen noch.

## C-017 – Alte Session-Versionen besitzen noch keine Migration

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Bei geänderter Dataset-, Quiz- oder Session-Version ignoriert der
  aktuelle Hook die alte aktive Session und beginnt neu; eine Migration oder
  sichtbare Recovery gibt es noch nicht.
- **Auswirkung:** Entwicklungsupdates können eine angefangene Runde unzugänglich
  machen und verwaiste Sessiondatensätze behalten.
- **Maßnahme:** Das IndexedDB-Upgrade 1 → 2 erhält Sessions und ergänzt
  Fortschritt, Einstellungen und Quarantäne. Eine inkompatible aktive Session
  wird sicher entfernt und mit verständlichem Hinweis gemeldet. Eine allgemeine
  Migrationsmatrix für künftige Session-/Dataset-Schemaänderungen bleibt offen.

## C-018 – Phase 2 startet vor Abschluss aller früheren Gates

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Der Nutzer startet Phase 2 ausdrücklich, obwohl reale
  Gerätemessungen, Designfreigabe, vollständige Sessionmigration und
  Kartenpunkt-Fairness aus Phase 0/1 noch offen sind.
- **Auswirkung:** Der MVP-Slice kann funktional wachsen, ist aber noch keine
  öffentliche fachliche Freigabe.
- **Maßnahme:** Phase 2 wird als abnehmbarer Länder-/Hauptstadt-Slice begrenzt.
  Frühere Gate-Lücken bleiben sichtbar und werden nicht durch neue
  Roadmap-Häkchen verdeckt.

## C-019 – Der Länder-Snapshot bringt ODbL-Pflichten mit

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** `world-countries@5.1.0` steht unter ODbL 1.0. Ein öffentlich
  ausgelieferter abgeleiteter Datensatz benötigt Attribution,
  Lizenzinformation und Zugang zur maschinenlesbaren Ableitung.
- **Auswirkung:** Fehlende Hinweise könnten den späteren Pages-Release
  lizenzrechtlich unvollständig machen.
- **Maßnahme:** Paket exakt pinnen, Quelle und Lizenz im Manifest dokumentieren,
  Attribution sichtbar anzeigen und vor öffentlichem Deploy einen
  Lizenzreview des erzeugten Datensatzes durchführen.

## C-020 – Hauptstädte sind zeitlich und politisch veränderlich

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Datensätze widersprechen sich bei neuen, beanspruchten oder
  funktional geteilten Hauptstädten. Beispiele sind Ciudad de la Paz,
  Jerusalem/Ostjerusalem, Ramallah, Sanaa/Aden und mehrere südafrikanische
  Sitze.
- **Auswirkung:** Eine technisch gültige Frage kann fachlich veraltet,
  unvollständig oder politisch irreführend sein.
- **Maßnahme:** Datierter Wikidata-Snapshot, Rollenqualifikatoren und
  Reviewliste. Politisch sensible Datensätze benötigen vor Phase-2-Gate eine
  fachliche Einzelprüfung mit Primärquellen.

## C-021 – Kontinentszuordnungen sind nicht eindeutig

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Transkontinentale Staaten passen nicht widerspruchsfrei in genau
  einen Europas-/Asiens-/Afrikascope.
- **Auswirkung:** Nutzer können andere Kandidatenzahlen erwarten und die Summe
  aller Kontinente ist größer als das Weltset.
- **Maßnahme:** D-024 erlaubt kuratierte Mehrfachzuordnungen. Die UI nennt
  „Zuordnung im Datensatz“; Welt bleibt das eindeutige 195er-Set.

## C-022 – Kleinstaaten sind als echte Fläche auf Touch schwer auswählbar

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Selbst Natural-Earth-10m-Flächen sind für Vatikanstadt, Monaco,
  Nauru, Tuvalu und weitere Staaten auf einer Kontinent- oder Weltkarte nur
  wenige Pixel groß.
- **Auswirkung:** Wissen würde durch motorische Präzision statt Geographie
  bewertet.
- **Maßnahme:** D-025 ergänzt sichtbare kartographische Punkte und größere
  Touch-Hit-Zonen, die auf dieselbe Länder-ID zeigen. Reale Gerätetests bleiben
  Teil des Gates.

## C-023 – Gepinnte Übersetzungen können fachlich veraltet sein

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** `world-countries@5.1.0` liefert beispielsweise „Swasiland“ als
  deutschen Namen, während der aktuelle Name Eswatini lautet.
- **Auswirkung:** Ein reproduzierbarer Snapshot ist nicht automatisch aktuell
  oder redaktionell richtig.
- **Maßnahme:** Der Refresh bevorzugt datierte deutsche Wikidata-Labels und
  behält abweichende Paketnamen nur als Antwortalias. Der Qualitätsbericht
  führt Namensabweichungen für die redaktionelle Prüfung auf.

## C-024 – Service-Worker-Cache verfehlte Assets mit `Vary: Origin`

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Die erste Offline-Implementierung hatte Hauptbundle und CSS zwar
  im Cache, traf sie beim Reload wegen unterschiedlicher `Origin`-Header und
  `Vary: Origin` aber nicht.
- **Auswirkung:** Das gecachte HTML lud offline ohne JavaScript und blieb leer.
- **Maßnahme:** Vite erzeugt ein Assetmanifest; der Worker speichert alle
  Runtime-Artefakte beim Installieren und gleicht ausschließlich
  Same-Origin-Releaseassets mit `ignoreVary` ab. Ein echter
  Chromium-Offline-Reload samt anschließendem Quizstart ist Teil der
  Produktionssuite.

## C-025 – Pages-Browsertest überschrieb den Unterpfad-Build

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** `npm run check` baute mit `BASE_PATH=/<repo>/`, der nachfolgende
  Playwright-Webserver jedoch erneut ohne Variable und überschrieb `dist/` als
  Root-Build.
- **Auswirkung:** Die Tests waren grün, aber das hochgeladene Pages-Artefakt
  hätte unter dem Repository-Unterpfad falsche Asset-URLs enthalten.
- **Maßnahme:** Build und Browserlauf erhalten denselben `BASE_PATH`;
  Playwrights Base-URL folgt dem Unterpfad und alle Navigationen starten relativ.
  Der Unterpfadlauf wird lokal und im Workflow geprüft.

## C-026 – Offline-Vorbereitung lädt den großen Kartenblock vollständig

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Für eine verlässlich offline startbare Runde speichert der
  Assetmanifest-Worker derzeit auch den 522-kB-gzip-Kartenchunk sofort.
- **Auswirkung:** Der erste Besuch benötigt mehr Bandbreite und Cacheplatz,
  selbst wenn zunächst nur Textfragen gespielt werden.
- **Maßnahme:** Gemeinsam mit C-010 regionale/lazy Offline-Pakete und eine
  statische Startvorschau untersuchen. Bis dahin nennt die
  Performance-Dokumentation den vollständigen Download offen.

## C-027 – Markierte transkontinentale Ziele lagen außerhalb der Kamera

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Europa enthält laut D-024 auch transkontinentale Lernkandidaten.
  Eine markierte Hauptstadt oder Länderfläche konnte deshalb außerhalb des
  anfänglichen Europa-Ausschnitts liegen.
- **Auswirkung:** Die Texteingabefrage zeigte scheinbar keine Markierung und war
  ohne eigenes Verschieben nicht lösbar.
- **Maßnahme:** `map_highlight`-Ansichten zentrieren auf die Zielkoordinate,
  behalten aber den Gebietszoom. Antwortkarten verraten das Ziel weiterhin
  nicht und lassen sich über Zoom/Pan vollständig bedienen.

## C-028 – Automatisierte Mobile-/Axe-Tests ersetzen keine realen Hilfsmittel

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Pixel-7-Viewport, Touch-Events und Axe finden viele
  Regressionen, bilden aber weder reale Motorik noch VoiceOver, TalkBack oder
  unterschiedliche GPU-/Browserkombinationen vollständig ab.
- **Auswirkung:** Das Phase-2-Gate darf trotz grüner Suite noch keine
  vollständige Geräte- und Screenreader-Freigabe behaupten.
- **Maßnahme:** Vor öffentlichem MVP-Release eine dokumentierte manuelle
  Testmatrix auf mindestens einem mittleren Android-Gerät, iOS/Safari und mit
  einem Desktop-Screenreader abarbeiten.

## C-029 – Initialer Hauptstadtpunkt war im Headless-Render nicht sichtbar

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Der GeoJSON-Circle-Layer für einen bereits beim Kartenstart
  gesetzten `map_highlight`-Punkt erschien im visuellen
  Playwright-Screenshot nicht zuverlässig, obwohl Fläche und Basiskarte
  gerendert wurden.
- **Auswirkung:** „Welche Hauptstadt ist markiert?“ konnte ohne sichtbaren
  Zielpunkt erscheinen.
- **Maßnahme:** Hauptstadt-Highlights erhalten zusätzlich einen code-nativen
  MapLibre-DOM-Marker mit denselben Koordinaten und zentralen CSS-Tokens. Die
  Browser-Suite verlangt seine Sichtbarkeit auf Desktop und Mobil. Vor einer
  Entfernung des Fallbacks muss die Ursache des initialen Source-Updates in
  realen Browsern geklärt werden.

## C-030 – Natural Earth verwendet Länder-IDs auch für abhängige Features

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** `world-atlas`/Natural Earth 50m enthält sowohl Australien als
  auch die Ashmore-und-Cartierinseln mit der numerischen ID `036`.
- **Auswirkung:** Der erste Adapter verknüpfte beide Flächen mit
  `country:au`; dadurch wäre eine abhängige Inselgruppe als Australien
  auswählbar gewesen.
- **Maßnahme:** Pro MVP-Länder-ID wird nur das erste souveräne
  Natural-Earth-Feature verknüpft; weitere Features mit derselben numerischen
  ID bleiben reine Darstellung ohne auswählbare Entitäts-ID. Ein Contract-Test
  verlangt genau 195 eindeutige verknüpfte Länder und prüft Australien
  explizit.

## C-031 – Phase 3 startet vor Abschluss früherer Release-Gates

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Der Nutzer startet Phase 3 ausdrücklich, obwohl Phase 0–2 noch
  reale Geräte-/Screenreaderprüfungen, Kartenfairness, Lizenz- und
  Hauptstadt-Review sowie Performancearbeit offen haben.
- **Auswirkung:** Account- und Abzeichenfunktionen erweitern einen funktionalen,
  aber noch nicht öffentlich freigegebenen MVP.
- **Maßnahme:** Phase 3 auf einen getrennten vertikalen Sync-/Achievement-Slice
  begrenzen. Frühere Gates bleiben in der Roadmap sichtbar und blockieren
  weiterhin die öffentliche Releasefreigabe.

## C-032 – Kein Supabase-Projekt oder öffentliche Konfiguration vorhanden

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Im Workspace existieren weder Projekt-URL noch Publishable Key
  oder ein verbundenes Supabase-Projekt.
- **Auswirkung:** E-Mail-Anmeldung, realer Upload und Mehrgeräte-Sync können
  nicht gegen einen Dienst ausgeführt werden.
- **Maßnahme:** Adapter, `.env.example`, Migration und Pages-Variablen sind
  vorbereitet. Ohne beide öffentlichen Werte wird der Cloudclient aus dem
  Build entfernt und die UI nennt den Gastzustand ausdrücklich.

## C-033 – SQL-Contracts beweisen keine echte RLS-Isolation

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Contract-Tests prüfen Tabellen, Policies, Grants, Indizes und
  RPC-Muster als SQL-Text, führen sie aber noch nicht in Postgres unter zwei
  authentifizierten Identitäten aus.
- **Auswirkung:** Syntax-, Eigentümer-, Grant- oder Policyfehler der echten
  Supabase-Laufzeit könnten trotz grüner lokaler Suite bestehen.
- **Maßnahme:** Vor Phase-3-Gate Migration per CLI anwenden und automatisiert
  für Konto A und B fremde Selects, Inserts, RPCs und Batch-Wiederholungen
  ablehnen beziehungsweise isolieren.

## C-034 – Vollständige Kontolöschung benötigt einen privilegierten Pfad

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Ein Browserclient darf `auth.users` nicht mit einem
  Service-Role-Schlüssel löschen. Das Löschen nur des öffentlichen Profils
  würde dagegen einen unvollständigen Account hinterlassen.
- **Auswirkung:** Der in Schritt 14 verlangte Lösch- und Datenschutzfluss ist
  noch nicht fertig.
- **Maßnahme:** Kein halbes Löschen anbieten und keine direkte Tabellenlöschung
  freigeben. Später eine authentifizierte Edge Function oder einen gleichwertig
  privilegierten Dienst mit Reauthentifizierung, Kaskade und Audit-Test bauen.

## C-035 – Der Server leitet Abzeichen noch nicht selbst neu ab

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Der Import speichert lokale Unlocks idempotent, markiert sie aber
  bewusst weiter als `local`. Eine unabhängige serverseitige Auswertung der
  Progress Events fehlt.
- **Auswirkung:** Cloudspeicherung ist noch keine fachliche Serverbestätigung
  und darf nicht für öffentliche Ranglisten oder Challenges verwendet werden.
- **Maßnahme:** Dieselben versionierten Achievement-Definitionen serverseitig
  auswerten, Plausibilität prüfen und erst dann `verification='server'` setzen.

## C-036 – Sync v1 deckt noch nicht alle Spielstände ab

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Der Phase-3-Slice vereinigt Progress Events und
  Achievement-Freischaltungen. Einstellungen, aktive Sessionbranches,
  Quiz-Snapshots und abgeleitete Masterywerte sind noch rein lokal.
- **Auswirkung:** Zwei Geräte teilen Lernhistorie, können aber eine angefangene
  Runde oder geänderte Präferenzen noch nicht konfliktfrei fortsetzen.
- **Maßnahme:** Adapterverträge und `sync-state` sind erweiterbar. Vor Aufnahme
  weiterer Payloads Revisionen, per-Key-Tie-Breaker und Branchanzeige gemäß
  Accountspezifikation implementieren.

## C-037 – Bestehende Ereignis-IDs sind keine UUIDv7

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Phase 2 hat stabile IDs als
  `progress:<session-id>:<ordinal>` ausgeliefert; das langfristige Zielmodell
  bevorzugt zeit-sortierbare UUIDv7.
- **Auswirkung:** Die Servermigration muss IDs zunächst als `text` führen und
  kann nicht allein aus der ID zeitlich sortieren.
- **Maßnahme:** Kompatible IDs nicht rückwirkend ändern. `occurred_at` bleibt
  indiziert; ein späterer Envelope kann eine UUIDv7 ergänzen, während die
  fachliche Legacy-ID als Deduplizierungsschlüssel erhalten bleibt.

## C-038 – Eine lange Offline-Outbox kann die Browserquote erreichen

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Ohne erfolgreichen Sync bleiben alle neuen Progress Events in
  `sync-outbox`. IndexedDB kann in restriktiven Browsern oder bei sehr langen
  Offlinephasen begrenzt sein.
- **Auswirkung:** Ein später Schreibfehler könnte Sessionpersistenz, Outbox und
  Freischaltung gemeinsam abbrechen.
- **Maßnahme:** Atomare Transaktion und JSON-Export verhindern stille
  Teilerfolge. Vor Langzeitrelease Quotenmessung, sichtbaren Speicherstatus und
  chunkweisen Upload/Retry ergänzen.

## C-039 – E-Mail-OTP benötigt produktionsfähiges SMTP und Abuse-Schutz

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Die Oberfläche kann OTP anfordern, aber Zustellung, Template,
  Rate Limits, Redirect-Allowlist und Missbrauchsschutz hängen von der externen
  Authkonfiguration ab.
- **Auswirkung:** Eine technisch konfigurierte Kontoseite kann Codes verspätet
  oder gar nicht zustellen beziehungsweise unnötigen E-Mail-Versand erlauben.
- **Maßnahme:** Vor Aktivierung SMTP, `{{ .Token }}`-Template, Rate Limits,
  Site-/Redirect-URLs und Fehlertexte in einer Stagingumgebung testen.

## C-040 – Der Import-RPC läuft als `security definer`

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Direkte Browser-Schreibrechte wurden entzogen, deshalb führt der
  atomare Batchimport als privilegierte Funktion aus.
- **Auswirkung:** Ein Fehler in Authprüfung oder Parameterzuweisung könnte RLS
  umgehen.
- **Maßnahme:** Leeres `search_path`, feste vollqualifizierte Tabellen,
  ausschließlich `auth.uid()` als Profil, Größenlimits und entzogene
  `public`-/`anon`-Ausführung begrenzen den Pfad. Vor Gate folgen echter
  Negativtest und unabhängiger SQL-Sicherheitsreview.

## C-041 – Lokale Daten sind noch kein vollständiger Mehrkonto-Speicher

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Ein Browser besitzt zunächst genau ein lokales Gastprofil. Nach
  Verknüpfung mit Konto A bleiben dessen Daten beim Abmelden lokal sichtbar.
- **Auswirkung:** Auf einem geteilten Gerät wäre ein sauber getrennter Wechsel
  zu Konto B noch nicht gegeben.
- **Maßnahme:** Der Sync-Service blockiert bereits jeden automatischen Import
  des A-Standes in Konto B. Vor öffentlicher Mehrkontonutzung lokale
  Profile/Stores partitionieren oder einen ausdrücklichen, getesteten
  Profilwechsel samt lokalem Löschen/Beibehalten anbieten.

## C-042 – Sichtbares Feedback konnte dem IndexedDB-Schreibabschluss vorauseilen

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Die Session zeigte eine bestätigte Antwort sofort, startete das
  Speichern aber nur asynchron. Ein unmittelbar folgender Reload konnte noch
  den vorherigen Fragesnapshot lesen und ließ den Pages-Unterpfadtest einmalig
  scheitern.
- **Auswirkung:** Sehr schnelles Neuladen konnte gerade gegebenes Feedback
  lokal verlieren, obwohl es zuvor sichtbar war.
- **Maßnahme:** Sessionereignisse verwenden nun eine synchrone aktuelle
  State-Referenz statt Seiteneffekten im React-State-Updater; Schreibvorgänge
  laufen geordnet durch eine Promise-Queue. Nach bestätigtem Repository-Write
  erscheint „Antwort lokal gespeichert“; der Reloadtest wartet auf genau diese
  Persistenzbestätigung.

## C-043 – Phase-3-Assets verwendeten zunächst den alten Cache-Namespace

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Der Service Worker hieß intern weiter
  `geoapp-shell-phase2-v3`. Neue Hash-Assets wären zwar ergänzt worden, alte
  Phase-2-Dateien aber im selben Cache verblieben.
- **Auswirkung:** Browsercache konnte unnötig wachsen und die Releasegrenze war
  bei einer Offlinefehleranalyse nicht eindeutig.
- **Maßnahme:** Phase 3 verwendet `geoapp-shell-phase3-v1`; die bestehende
  Aktivierungslogik entfernt alle älteren `geoapp-shell-*`-Caches.

## C-044 – Phase 4 startet vor Abschluss früherer Gates

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Der Nutzer startet Phase 4 ausdrücklich, obwohl reale
  Geräte-/Screenreaderprüfungen, Kartenfairness, Lizenz-/Hauptstadtreview,
  Kartenbudget und das externe Phase-3-Backendgate offen sind.
- **Auswirkung:** Visuelle Modi und Weltmix können technisch vollständig
  werden, sind aber noch keine öffentliche Gesamtfreigabe.
- **Maßnahme:** Phase 4 als getrennten visuellen/Mixed-Slice bauen. Frühere
  Gate-Lücken bleiben in Roadmap und Critics sichtbar und blockieren weiterhin
  den öffentlichen Release.

## C-045 – Flaggen sind politisch und zeitlich veränderliche Symbole

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** `flag-icons@7.5.0` ist ein reproduzierbarer MIT-Snapshot, aber
  Flaggen können amtlich geändert werden oder bei umstrittenen Gebieten eine
  politische Aussage transportieren.
- **Auswirkung:** Eine technisch vorhandene SVG kann fachlich veraltet oder für
  den gewählten 195-Staaten-Scope erklärungsbedürftig sein.
- **Maßnahme:** Paket exakt pinnen, Asset-Schlüssel gegen das 195er-Set prüfen,
  Lizenz und Version im Manifest führen und vor Release eine datierte
  redaktionelle Flaggenstichprobe durchführen. Erweiterte Gebietssets dürfen
  nicht still in denselben Modus gelangen.

## C-046 – Länderumrisse können bei kleinen oder fragmentierten Staaten unfair sein

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Ein auf eine einheitliche Fläche eingepasster
  Natural-Earth-Umriss kann Inselgruppen, Kleinstaaten und weit auseinander
  liegende Landesteile sehr klein oder ungewohnt darstellen.
- **Auswirkung:** Der Modus könnte Detailerkennung statt geographisches Wissen
  bewerten und einzelne Staaten unverhältnismäßig schwer machen.
- **Maßnahme:** Umrisse aus derselben versionierten 50m/10m-Geometrie ableiten,
  Seitenverhältnis bewahren und alle Länder technisch verfügbar halten.
  Schwierige Fälle werden vor Release fachlich gesichtet; spätere Presets
  dürfen dafür kuratierte Lernumfänge oder Insets verwenden.

## C-047 – Ein gemeinsamer SVG-Payload wäre unverhältnismäßig groß

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Der erste korrekte Build aller 390 SVGs ergab als einzelner
  Lazy-Chunk rund 985 kB gzip. Komplexe Wappenflaggen und detaillierte
  Natural-Earth-Küsten dominieren die Größe.
- **Auswirkung:** Schon eine einzelne Flaggenfrage hätte fast ein zusätzliches
  Megabyte JavaScript laden und parsen müssen.
- **Maßnahme:** Der Build gibt einzelne lokale SVGs mit Prüfsummen aus.
  Vor Rundenstart werden nur die im konkreten Fragensnapshot referenzierten
  Motive parallel vorgeladen; der Service Worker übernimmt sie anschließend in
  seinen Runtime-Cache. Dadurch entstehen mehr kleine Anfragen, aber kein
  globaler Assetblock im App-Bundle. Requestzahl und Detailvereinfachung bleiben
  Teil der Performanceprüfung.

## C-048 – Speicherbestätigung erschien vor der ersten Antwort

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Die Quizseite verglich vor dem ersten Versuch zwei nicht gesetzte
  IDs. `undefined === undefined` blendete dadurch fälschlich „Antwort lokal
  gespeichert“ ein.
- **Auswirkung:** Der Hinweis behauptete einen Speichervorgang, obwohl noch
  keine Antwort abgegeben worden war.
- **Maßnahme:** Der Status benötigt jetzt ausdrücklich einen vorhandenen
  Versuch, eine vorhandene bestätigte ID und deren Gleichheit. Desktop- und
  Mobile-Screenshots werden nach derselben Startsequenz erneut geprüft.

## C-049 – Reine Bilderkennung ist nicht gleichwertig screenreaderfähig

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Ein Alternativtext, der die dargestellte Flagge oder Länderform
  benennt, würde die Quizlösung verraten. Ein neutraler Alternativtext hält die
  Aufgabe spielbar, vermittelt blinden Nutzenden aber nicht dieselbe
  Information.
- **Auswirkung:** Flaggen- und Formenerkennung sind trotz bedienbarer
  Auswahlfelder keine gleichwertig zugänglichen Lernmodi.
- **Maßnahme:** Nichtvisuelle Länder- und Hauptstadtmodi bleiben vollständig
  nutzbar. Vor dem Accessibility-Gate sind ein getesteter Modusfilter,
  überspringbare visuelle Aufgaben und eine fachlich sinnvolle taktile oder
  beschreibende Alternative zu prüfen; `C-028` bleibt zusätzlich offen.

## C-050 – Phase 5 startet trotz offener früherer Release-Gates

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Reale Touch-/Screenreaderprüfungen, Kartenbudget,
  redaktionelle Datensichtung und das externe Account-/RLS-Gate sind weiterhin
  offen, während der Nutzer Phase 5 ausdrücklich startet.
- **Auswirkung:** Der physische Slice kann technisch vollständig werden,
  erreicht aber noch keine öffentliche Gesamtfreigabe.
- **Maßnahme:** Phase 5 getrennt abnehmen. Frühere Gates bleiben unverändert
  sichtbar; neue physische Modi dürfen sie nicht versehentlich als erledigt
  markieren.

## C-051 – Natural-Earth-Flüsse sind generalisierte Kartenlinien

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Der 1:50m-Layer ist für Welt- und Regionalkarten generalisiert.
  Nebenarme, saisonale Verläufe und nahe Gewässer können fehlen oder
  kartographisch verschoben sein.
- **Auswirkung:** Ein Klick kann hydrologisch plausibel wirken, aber außerhalb
  der ausgelieferten Linie liegen. Nahe Flüsse können bei kleiner Zoomstufe
  dieselbe Touchzone berühren.
- **Maßnahme:** Der Modus benennt den kuratierten Natural-Earth-Snapshot,
  verwendet bildschirmbasierte Nähe mit Mehrdeutigkeitsabbruch und benötigt
  vor dem Gate reale Touch-Stichproben. Ein detaillierterer Regionaldatensatz
  darf später als eigene Geometrieversion hinzukommen.

## C-052 – Meeres- und Gebirgspolygone sind keine scharfen Naturgrenzen

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Natural-Earth-Regionspolygone beschreiben kartographische
  Beschriftungs- und Lernflächen. Besonders Gebirge und angrenzende Meere
  besitzen in der Realität keine überall eindeutige Grenzlinie.
- **Auswirkung:** `map_area` bewertet die veröffentlichte Lernfläche, nicht
  eine universelle naturwissenschaftliche Grenzdefinition.
- **Maßnahme:** Quelle und Datenstand bleiben sichtbar; Feedback spricht von
  der im Datensatz verwendeten Fläche. Polygone werden nicht als politische
  oder geologische Wahrheit bezeichnet und müssen fachlich stichprobenartig
  geprüft werden.

## C-053 – Physische Kontinentscopes sind kuratierte Zuordnungen

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Flüsse, Meere und Gebirge überqueren Kontinental- und
  Ländergrenzen. Eine automatische Zentroidzuordnung würde mehrere sinnvolle
  Lernkontexte verlieren.
- **Auswirkung:** Summierte Regionalzahlen können größer als der eindeutige
  Weltumfang sein.
- **Maßnahme:** Explizite, überprüfbare `located_in`-Relationen dürfen
  überlappen. Welt bleibt eindeutig; die Oberfläche nennt Regionalsets
  weiterhin Zuordnungen des Datensatzes.

## C-054 – Ein gemeinsamer Physik-Geometriechunk überschritt das Kartenbudget

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Der erste korrekte Phase-5-Build legte alle fünf physischen
  Themen in denselben Lazy-Chunk wie MapLibre. Der Kartenchunk stieg dadurch
  von 522,63 auf 684,69 kB gzip.
- **Auswirkung:** Auch eine Runde ohne physische Geographie hätte rund 162 kB
  zusätzliche Geometrien übertragen und als JavaScript geparst.
- **Maßnahme:** Der Content-Build erzeugt fünf getrennte, versionierte
  Themenchunks. Vor einer Runde werden nur die tatsächlich enthaltenen Typen
  geladen und anschließend im Runtime-Cache gehalten. Der Kartenchunk liegt
  wieder bei 524,00 kB gzip; die getrennten Physikchunks reichen von 0,80 bis
  72,01 kB gzip. Das bestehende Kartenbudget bleibt unabhängig davon offen.

## C-055 – Namensgleiche Flüsse können in einer Quellgeometrie vermischt sein

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Der Natural-Earth-Eintrag „Colorado“ enthält sowohl
  nordamerikanische als auch argentinische Liniensegmente unter demselben
  Namen.
- **Auswirkung:** Ohne zusätzliche Kuratierung zeigte die Lerngeometrie zwei
  verschiedene Flüsse und berechnete eine Zielkoordinate im Atlantik.
- **Maßnahme:** Die Auswahlpipeline unterstützt nun explizite Quellgrenzen;
  der nordamerikanische Colorado ist reproduzierbar auf seinen regionalen
  Verlauf begrenzt. Linien-Zielkoordinaten stammen aus einem vorhandenen
  Segment statt aus der Mitte der Bounding Box. Weitere Homonyme bleiben Teil
  der fachlichen Review unter C-051.

## C-056 – Die mobile Weltkamera verdeckte Ziele am Kartenrand

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Bei einem 393-px-Viewport war die Welt bei Mindestzoom breiter
  als die sichtbare Karte. Ein Ziel wie die Tasmansee lag initial außerhalb,
  während weiteres Herauszoomen bereits gesperrt war.
- **Auswirkung:** Mobile Nutzende mussten die Weltkarte verschieben, obwohl
  die Aufgabe zunächst wie eine vollständige Weltansicht wirkte; automatisierte
  Touchabläufe konnten Randziele nicht direkt erreichen.
- **Maßnahme:** Die mobile Weltkamera startet bei Zoom -0,45 und erlaubt bis
  -0,6. Das mobile Kartenfeld ist höchstens quadratisch, damit MapLibre den
  Mindestzoom nicht aufgrund eines höheren Portraitfelds wieder anhebt. Damit
  ist die Weltlänge initial sichtbar; Zoom und Pan bleiben aktiv. Ein
  Pixel-7-Browserlauf deckt das Randziel als Regressionstest ab.

## C-057 – Politische Kleinstaatmarker überlagerten physische Karten

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Die sichtbaren Hilfspunkte für sehr kleine Länder wurden
  zunächst auf jedem Kartenmodus gerendert, auch bei Meeres-, Fluss- und
  Gebirgsfragen.
- **Auswirkung:** Die Punkte konnten wie zusätzliche physische Ziele wirken
  und machten besonders die mobile Weltkarte unnötig unruhig.
- **Maßnahme:** Der Kartenadapter blendet die politische Kleinstaat-Layer aus,
  sobald ein physischer Entitätstyp aktiv ist. Länderfragen behalten dieselben
  sichtbaren und vergrößerten Hit-Zonen.

## C-058 – Lange geographische Namen ragten unter die Desktopkarte

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Ein langer einzelner Name wie „Jangtsekiang“ überschritt im
  schmalen Fragenrail dessen Textbreite und wurde von der Kartenfläche
  überdeckt.
- **Auswirkung:** Ein Teil des eigentlichen Frageziels war nicht lesbar,
  obwohl Layout und Interaktion ansonsten funktionierten.
- **Maßnahme:** Quizüberschriften verwenden jetzt deutsche Silbentrennung und
  einen sicheren Umbruch als Fallback. Der Umbruch bleibt auf Frageüberschriften
  begrenzt und verändert keine fachlichen Namen im Content.

## C-059 – Phase 6 startet trotz offener früherer Release-Gates

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Reale Touch-/Screenreaderprüfungen, Kartenbudget, fachliche
  Vollsichtung der bisherigen Inhalte sowie produktive Account-/RLS-Abnahme
  sind weiterhin offen, während der Nutzer Phase 6 ausdrücklich startet.
- **Auswirkung:** Der Wissenspuzzle-Slice kann sein technisches Content-Gate
  erreichen, aber keine öffentliche Gesamtfreigabe der App begründen.
- **Maßnahme:** Phase 6 getrennt abnehmen. Frühere Gates bleiben im
  Roadmap-Arbeitsstand sichtbar und werden durch neue automatisierte
  Compilergates nicht als erledigt markiert.

## C-060 – Amtssprache ist nicht Muttersprache oder Alltagssprache

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Die gewünschte Beispielfrage sprach zunächst von Ländern, in
  denen Portugiesisch eine Muttersprache sei. Dieser Begriff ist für
  mehrsprachige Bevölkerungen weder dasselbe wie Rechtsstatus noch durch eine
  einfache Länderrelation korrekt abbildbar.
- **Auswirkung:** Eine scheinbar leichte Rangfrage könnte eine falsche
  sprachsoziologische Aussage treffen.
- **Maßnahme:** Der erste Fakt heißt ausdrücklich `has_official_language`; alle
  sichtbaren Vorlagen sagen „Amtssprache“. Muttersprachlerzahlen würden eine
  eigene Definition, Bevölkerungsquelle, Bezugszeit und Messmethode benötigen.

## C-061 – Der World-Bank-Snapshot hat für Vatikanstadt keine Werte

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Beide gepinnten World-Bank-Indikatoren decken 194 der 195
  MVP-Staaten ab; für Vatikanstadt fehlt 2023 ein Wert.
- **Auswirkung:** Eine globale oder europäische Rangliste wäre bei stillem
  Ausschluss methodisch unehrlich, selbst wenn Vatikanstadt den Zielrang nicht
  verändern würde.
- **Maßnahme:** Der Compiler lehnt fehlende Werte im vollständigen
  Kandidatenraum ab. Der erste Vorlagensatz enthält deshalb keine globale oder
  europäische Rangfrage. Der Qualitätsbericht nennt die Lücke ausdrücklich.

## C-062 – Landfläche und Gesamtfläche liefern andere Nordamerika-Ränge

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Nach Landfläche liegt in den verwendeten WDI-Daten die USA vor
  Kanada; nach Gesamtfläche wird häufig Kanada zuerst genannt.
- **Auswirkung:** Eine unpräzise Frage „zweitgrößtes Land“ würde wie ein
  Datenfehler wirken oder tatsächlich eine andere Antwort erwarten.
- **Maßnahme:** FactDefinition, Prompt und Erklärung sagen ausdrücklich
  „Landfläche“. Einheit, Indikator, Jahr und Werte werden nach jeder Antwort
  gezeigt. Gesamtfläche wäre ein getrennter Faktentyp.

## C-063 – CPLP-Mitgliedschaft ersetzt noch keine Verfassungsprüfung

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Die CPLP führt die neun portugiesischsprachigen Mitgliedstaaten
  und Länderprofile, ist aber nicht für jeden Staat die primäre Rechtsquelle
  des aktuellen Amtssprachenstatus.
- **Auswirkung:** Besonders bei mehreren Amtssprachen oder künftigen
  Rechtsänderungen könnte eine Relation trotz plausibler Sammelquelle
  veralten.
- **Maßnahme:** Vor öffentlicher Freigabe alle neun Relationen gegen
  Verfassung oder amtliche Regierungsquelle redaktionell gegenprüfen und die
  Einzelbelege versionieren. Bis dahin bleibt das technische Gate erreicht,
  das fachredaktionelle Gate offen.

## C-064 – Gepinnte Werte von 2023 werden mit der Zeit fachlich älter

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Bevölkerung ändert sich laufend; auch Quellen können historische
  Reihen nachträglich revidieren.
- **Auswirkung:** Die Fragen bleiben reproduzierbar, sind aber keine Aussage
  über den jeweils neuesten verfügbaren Stand.
- **Maßnahme:** Promptfeedback und Quellenkette nennen 2023. Ein expliziter
  Netzwerkrefresh erzeugt eine neue Datasetversion; bestehende Sessions
  behalten ihren konkreten Fragensnapshot.

## C-065 – Der Faktengraph vergrößert den bereits zu großen App-Chunk

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Die 388 Fakten, 20 Erklärungsdatensätze und neue UI erhöhen den
  App-Chunk von 142,07 auf 154,41 kB gzip. Das vorläufige
  100-kB-App-Shell-Budget war bereits vorher überschritten.
- **Auswirkung:** Auch Nutzende ohne Wissenspuzzle laden momentan den
  Faktengraphen, weil das zentrale Dataset synchron importiert wird.
- **Maßnahme:** Messstand in `docs/PERFORMANCE.md` aktualisieren. Vor dem
  Performance-Gate Fakten/Erklärungen als manifestiertes, lazy geladenes
  Themenpaket prüfen; der Build-Warnwert wird nicht erhöht, um den Befund zu
  verdecken.

## C-066 – Der Persistenzvalidator kannte den neuen Prompt zunächst nicht

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Der erste Browserlauf spielte eine Zehn-Pool-Weltmixrunde
  vollständig, doch `loadLatestCompleted()` quarantänisierte das Ergebnis.
  Der tiefe Sessionvalidator erlaubte in Fragensnapshots noch nur Name, Karte
  und Visual Asset, nicht `description` samt Evidenz.
- **Auswirkung:** Sobald eine Wissensfrage im Mix vorkam, erschien auf der
  Ergebnisseite fälschlich „Noch keine Runde abgeschlossen“.
- **Maßnahme:** Der Validator prüft jetzt `description`, die vollständige
  Evidenzkette und Quellenmetadaten. Ein Unit-Test serialisiert und validiert
  eine echte Wissenssession; der Zehn-Pool-Browserlauf deckt die abgeschlossene
  Mischrunde ab. Die Settingsvalidierung wurde zugleich um alle seit Phase 5
  hinzugekommenen Themen ergänzt.

## C-067 – Der Zehn-Pool-Test traf Randziele und mehrdeutige Flüsse

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Durch den neuen zehnten Pool änderte sich die zufällige
  Weltmixbelegung. Ein Lauf traf Tuvalu außerhalb des ersten sichtbaren
  Kartenausschnitts, ein anderer den nahen Murray-/Darling-Bereich. Der
  Browserhelfer konnte nur herauszoomen und behandelte den fachlich gewollten
  Mehrdeutigkeitsabbruch wie eine fehlende Antwort.
- **Auswirkung:** Der Test wurde flakey, obwohl die Oberfläche korrekt zum
  Verschieben beziehungsweise Hineinzoomen aufforderte.
- **Maßnahme:** Der Helfer verschiebt die Karte zu Randzielen und zoomt bei
  explizitem Mehrdeutigkeitshinweis schrittweise hinein, bevor er erneut
  auswählt. Der vollständige Produktionslauf besteht damit reproduzierbar;
  die reale Touch-Fairness unter C-051 bleibt davon unberührt.

## C-068 – Phase 7 startet trotz offener früherer Release-Gates

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Echte Touch-/Screenreaderprüfungen, Karten- und App-Shell-Budget,
  fachliche Vollsichtung, produktive Account-/RLS-Abnahme sowie der reale
  GitHub-Pages-Deploy sind weiterhin offen, während der Nutzer Phase 7
  ausdrücklich startet.
- **Auswirkung:** Der Städte-Slice kann sein eigenes Daten- und Funktionsgate
  erreichen, begründet aber noch keine öffentliche Gesamtfreigabe.
- **Maßnahme:** Phase 7 getrennt messen und abnehmen. Alle früheren Gates
  bleiben im Roadmap-Arbeitsstand sichtbar.

## C-069 – Das GeoNames-Bevölkerungsfeld ist keine einheitliche Metropolenstatistik

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** GeoNames liefert pro Ort ein numerisches `population`-Feld,
  aber keinen für alle Städte gemeinsamen Erhebungsstichtag oder eine
  einheitliche Abgrenzung als Stadtgebiet beziehungsweise Metropolregion.
- **Auswirkung:** Eine bloße Beschriftung als „größte Städte“ würde eine
  Genauigkeit und Vergleichbarkeit behaupten, die der Gazetteer nicht
  garantiert.
- **Maßnahme:** Die UI nennt den Modus ausdrücklich
  „Top N nach GeoNames-Bevölkerungsfeld“, zeigt Snapshotdatum und Methode und
  verweist darauf, dass es keine Metropolregionsrangliste ist. Spätere
  Statistikquellen erhalten getrennte Faktdefinitionen und Presets.

## C-070 – Sprachcodierte GeoNames-Aliasse sind ein sehr großer Refresh-Input

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** `alternateNamesV2.zip` ist am Snapshotdatum rund 203 MB groß,
  obwohl Phase 7 nur deutsche Namen für einige Tausend ausgewählte Städte
  benötigt.
- **Auswirkung:** Ein vollständiger Content-Refresh benötigt deutlich mehr
  Downloadzeit und temporären Speicher als der ausgelieferte Städte-Datensatz.
- **Maßnahme:** Der Refresh streamt die gepinnte ZIP-Datei in ein temporäres
  Verzeichnis, filtert beim Entpacken ausschließlich aktuelle `de`-Einträge
  der ausgewählten GeoNames-IDs und entfernt die Rohdatei anschließend. Nur
  der kleine normalisierte Snapshot wird versioniert ausgeliefert.

## C-071 – Exakte Top-N-Grenzen benötigen bei gleichen Werten einen Tie-Break

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Mehrere Städte können im GeoNames-Feld denselben
  Bevölkerungswert besitzen, auch direkt an einer Top-100/250/500/1000-Grenze.
- **Auswirkung:** Ohne feste Regel wäre die Mitgliedschaft einer exakt N
  Elemente großen Lernliste instabil oder die Liste enthielte mehr als N
  Einträge.
- **Maßnahme:** Sortierung zuerst nach Bevölkerung absteigend, bei Gleichstand
  nach numerischer GeoNames-ID aufsteigend. Diese technische Regel wird in
  UI, Manifest und Qualitätsbericht sichtbar genannt; sie ist keine
  fachliche Rangbehauptung innerhalb des Gleichstands.

## C-072 – Der erste Städtevalidator verwies noch auf den verworfenen Quelldump

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Nach dem Wechsel von `cities15000.zip` auf `cities1000.zip`
  prüfte der neue Faktenvalidator die `sourceRefs` noch gegen die alte
  Quellen-ID und meldete dadurch tausende korrekte Fakten einzeln als Fehler.
- **Auswirkung:** Der erste Refresh scheiterte nach dem großen Namensdownload
  mit unnötig umfangreicher Diagnoseausgabe.
- **Maßnahme:** Validator und Faktquelle verwenden nun gemeinsam
  `geonames-cities1000`. Der Build erhält zusätzlich einen gezielten
  Negativtest, damit Quelle und Faktenvertrag nicht erneut auseinanderlaufen.

## C-073 – Vitest 3 akzeptiert den Jest-Schalter `--runInBand` nicht

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Der erste Phase-7-Testaufruf verwendete versehentlich den
  Jest-spezifischen Schalter `--runInBand`, den die gepinnte Vitest-Version
  ablehnt.
- **Auswirkung:** Dieser Aufruf startete keine Tests; es lag kein
  Anwendungs- oder Datenfehler vor.
- **Maßnahme:** Die verbindliche Projektsequenz bleibt `npm test` beziehungsweise
  `vitest run` ohne diesen Schalter.

## C-074 – Der Service-Worker-Cache trug noch den Phase-5-Namen

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Obwohl sich App- und Themenchunks in Phase 6 und 7 änderten,
  verwendete der statische Service Worker weiterhin
  `geoapp-shell-phase5-v1`.
- **Auswirkung:** Alte unreferenzierte Dateien konnten im Cache verbleiben;
  bei unverändert ausgeliefertem Worker war außerdem kein eindeutiger
  Releasewechsel im Cachevertrag erkennbar.
- **Maßnahme:** Phase 7 hebt den Cache-Key auf `geoapp-shell-phase7-v1`.
  Aktivierung entfernt ältere `geoapp-shell-*`-Caches. Das Städtepaket bleibt
  bewusst Runtime-Cache und wird nach seinem ersten Online-Laden offline
  verfügbar.

## C-075 – „Runde beenden“ navigierte vor dem bestätigten Pausenspeichern

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Die vorhandene Kopfaktion hieß „Runde beenden“, erzeugte intern
  aber einen pausierten Spielstand und navigierte sofort, ohne den
  IndexedDB-Schreibabschluss abzuwarten.
- **Auswirkung:** Besonders bei einem großen 1000er-Snapshot konnte die
  Startseite den Fortsetzen-Hinweis kurzzeitig noch nicht sehen; die
  Beschriftung erklärte die tatsächliche Aktion außerdem falsch.
- **Maßnahme:** Die Aktion heißt nun „Runde pausieren“, wartet auf den
  gespeicherten Pausensnapshot und navigiert erst danach. Der Browserflow
  prüft Fortsetzen mit identischer Session-ID.

## C-076 – Die Fortschrittsseite kannte lazy Städtenamen zunächst nicht

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Stadtfragen erzeugten korrekte `ranked_city`-Ereignisse, doch
  die Fortschrittsseite löste Anzeigenamen nur gegen das stadtfreie
  Kerndataset auf.
- **Auswirkung:** Nach einem Stadtfehler hätte „Noch unsicher“ die technische
  ID `geonames:<id>` statt des Stadtnamens gezeigt; die Skillzeile wäre
  ebenfalls unübersetzt geblieben.
- **Maßnahme:** Die Seite erkennt Stadt-Events und lädt nur dann den
  validierten Städtepack zum Auflösen der betroffenen Anzeigenamen. Beide
  Stadt-Skillkeys haben sichtbare deutsche Labels. Scheitert das optionale
  Nachladen, bleiben Statistiken und Fehlerqueue verfügbar und die
  eingeschränkte Namensdarstellung wird erklärt.

## C-077 – Die Phase-7-Zeitmessung ist nur synthetisch

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Die gemessenen 386–408 ms bis zur Stadtübersicht und 78–81 ms
  bis zur Top-1000-Runde stammen aus lokalem, ungedrosseltem Chromium. Der
  Pixel-7-Eintrag ist ein emulierter Viewport, kein echtes Gerät.
- **Auswirkung:** Langsamer Mobilprozessor, knapper Speicher, Kompilierung des
  großen JSON-Chunks und ein reales Mobilnetz können deutlich schlechtere
  Werte erzeugen.
- **Maßnahme:** Vor dem endgültigen Performance-Gate auf einem echten
  mittleren Android-Gerät mit Kaltcache und gedrosseltem Netzwerk Startzeit,
  Interaktion, Speicherspitze und Wiederaufnahme messen. Die aktuellen Werte
  in `docs/PERFORMANCE.md` sind ausdrücklich nur Regressionsbaseline.

## C-078 – Deutsche Stadtnamen sind noch nicht redaktionell vollständig

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Der 6000-Städte-Pack besitzt 3100 explizite bevorzugte deutsche
  Namen und 1527 deutsche Antwortaliasse. Für die übrigen Entitäten fällt die
  App auf den GeoNames-Hauptnamen zurück; automatisches Vorhandensein beweist
  weder geläufige deutsche Schreibweise noch vollständige Aliasabdeckung.
- **Auswirkung:** Einzelne Prompts können ungewohnte Schreibweisen zeigen oder
  eine im Deutschen übliche Antwort noch nicht akzeptieren.
- **Maßnahme:** Grenzfälle, Top-100-Listen, bekannte Exonyme und gleichnamige
  Städte redaktionell prüfen. Kuratierte Overrides müssen stabil, begründet
  und durch Contenttests abgesichert werden.

## C-079 – Der 1000er-Marathon ist noch kein vollständiger Dauertest

- **Status:** open
- **Entdeckt:** 2026-07-30
- **Problem:** Der Browserflow erzeugt 1000 Fragen, pausiert, setzt dieselbe
  Session fort und beantwortet eine Frage. Er spielt nicht alle 1000
  Interaktionen durch. Der aktuelle Repositoryweg speichert nach bestätigten
  Zustandsänderungen den großen Session-Snapshot erneut.
- **Auswirkung:** Langfristige IndexedDB-Schreibverstärkung, Speicherwachstum
  und UI-Verhalten nahe Frage 1000 sind mit dem Smoke-Test nicht bewiesen.
- **Maßnahme:** Einen separaten Langlauf mit Messpunkten bei 100/250/500/1000
  ergänzen und Write-Dauer sowie Speichervolumen profilieren. Falls nötig
  Fragenbasis und Versuchsdelta getrennt oder in sicheren Checkpoints
  persistieren, ohne die Wiederaufnahmegarantie zu schwächen.

## C-080 – Der lazy Städtechunk ist roh sehr groß

- **Status:** mitigated
- **Entdeckt:** 2026-07-30
- **Problem:** Das Vite-Artefakt mit 6000 Entitäten ist 6.351,01 kB
  minifiziert, auch wenn es durch gzip auf 404,20 kB schrumpft.
- **Auswirkung:** Dekompression, JSON-/Modulparsing und der zusammengeführte
  Repositoryindex können auf speicherarmen Geräten eine relevante Spitze
  verursachen.
- **Maßnahme:** Der Pack ist ein dynamischer Import, wird für stadtfreie
  Nutzung nicht geladen und danach gecacht. C-077 hält die reale
  Geräte-/Speichermessung offen; bei schlechtem Befund wird der Pack nach
  Scope oder Rangbereich geteilt, ohne Rankings oder stabile IDs zu ändern.

## C-081 – Der allgemeine Refresh hätte die Datasetversion zurückgesetzt

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Die eingecheckten Snapshots und alle spezialisierten Refreshes
  verwendeten bereits `2026-07-30.phase7-cities1`, aber
  `refresh-mvp-content.ts` erzeugte weiterhin das Phase-6-Suffix.
- **Auswirkung:** Ein späterer bewusster Länder-/Hauptstadtrefresh hätte einen
  formal gültigen Kerndatensatz geschrieben, der beim nächsten Build nicht zu
  Physik-, Wissens- und Städtepack passt.
- **Maßnahme:** Auch der allgemeine Refresh erzeugt nun die Phase-7-Version.
  Der Content-Build prüft weiterhin, dass alle Packs exakt dieselbe
  Datasetversion tragen und bricht bei Abweichung ab.

## C-082 – Eine neue Datasetversion legte zwei versteckte Seed-Annahmen offen

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Der finale Phase-7-Check änderte erwartungsgemäß die
  versionierten Zufallssequenzen. Dadurch erhielt eine Zwei-Pool-Testdefinition
  eine 6:4-Verteilung, die bei `maxConsecutiveFromPool: 1` nicht ohne
  Doppelung planbar war. Außerdem konnte der neue optionale Städtepool selbst
  in einer 20er-Mischrunde zufällig null Fragen erhalten.
- **Auswirkung:** Ein Schedulingtest und der zugesagte Städteanteil im langen
  Weltmix schlugen fehl; ein reines Aktualisieren der Snapshoterwartung hätte
  die echte Regelverletzung verdeckt.
- **Maßnahme:** Die Allokation balanciert nun jede Verteilung auf eine
  mathematisch planbare Folge innerhalb der Poolgrenzen und der Scheduler
  bricht statt stiller Regelverletzung ab. Eine 20er-Weltmixrunde garantiert
  mindestens eine Stadtfrage; die kurze 10er-Runde behält ihre zehn bisher
  garantierten Kernpools. Die erwartete feste Hauptstadtsequenz wurde auf die
  neue versionierte Phase-7-Ausgabe aktualisiert.

## C-083 – Der mobile Kartenhelfer beobachtete nur den Längengrad

- **Status:** resolved
- **Entdeckt:** 2026-07-30
- **Problem:** Beim vollständigen Pages-Browserlauf musste der Test Lake Taupō
  vertikal in den sichtbaren Ausschnitt verschieben. Der Helfer wartete nach
  jedem Drag ausschließlich auf einen geänderten Kartenlängengrad.
- **Auswirkung:** Eine erfolgreiche rein vertikale Kamerabewegung wurde nach
  fünf Sekunden fälschlich als Stillstand gemeldet; 18 andere Flows
  bestanden.
- **Maßnahme:** Der Helfer beobachtet nun das Koordinatenpaar aus Länge und
  Breite. Die fachliche Klickberechnung und die abschließende
  Sichtbarkeitsprüfung bleiben unverändert.

## C-084 – Globale Flusslängen sind keine unumstrittene Naturkonstante

- **Status:** mitigated
- **Entdeckt:** 2026-08-03
- **Problem:** Die Länge eines Flusssystems hängt von der gewählten Quelle,
  der Mündungsdefinition, Messmethode und verfügbaren Kartierung ab. Besonders
  Nil und Amazonas werden in Quellen unterschiedlich geordnet. Ein freier
  Wikidata-Query enthielt außerdem einen offensichtlich falschen Spitzenwert.
- **Auswirkung:** Eine als zeitlos oder quellenübergreifend dargestellte
  „wahre“ Rangliste würde Lernende über die Messunsicherheit täuschen.
- **Maßnahme:** Der Pack übernimmt ausschließlich den ersten Kilometerwert
  einer fest versionierten, zusammenhängenden Systemtabelle und nennt Methode,
  Revision und Warnhinweis sichtbar. Der Build prüft vollständige Faktserien
  und die eindeutige Top-100-Grenze; Wikidata wird nur für stabile
  Seitenidentitäten und Namen genutzt, nicht als Rangwertquelle.

## C-085 – Deutsche Namen und Fakttexte der neuen Top-100-Listen brauchen Review

- **Status:** open
- **Entdeckt:** 2026-08-03
- **Problem:** Deutsche Wikipedia-Titel decken viele, aber nicht alle Flüsse,
  Mündungen, Gebirge und Verwaltungsangaben ab. Bei fehlender Übersetzung
  bleibt der fest versionierte englische Tabellenbegriff erhalten; einige
  Flusssystemnamen bestehen aus langen Ketten mehrerer Quellflüsse.
- **Auswirkung:** Fachlich korrekte Fragen können sprachlich ungewohnt oder in
  einzelnen Fällen unnötig lang wirken. Gebräuchliche deutsche Aliasse können
  fehlen.
- **Maßnahme:** Top 25 beider Listen zuerst redaktionell sichten, danach die
  restlichen 150 Profile. Korrekturen werden als stabile, reviewbare Overrides
  und Antwortaliasse ergänzt; IDs, Rangwerte und Quellrevision bleiben davon
  unberührt.
