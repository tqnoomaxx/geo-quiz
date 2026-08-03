# Entscheidungsprotokoll

Letzte Aktualisierung: 2026-08-03

## Gültige Entscheidungen

### D-001 – Quizarten sind Kompositionen

- **Status:** accepted
- **Entscheidung:** Ein Quiz wird aus Inhalt, Prompt, Antwortmodus, Gebiet und
  Regeln zusammengesetzt.
- **Konsequenz:** Neue Themen erhalten keine eigene Session-Engine.

### D-002 – React-App mit purem TypeScript-Kern

- **Status:** accepted für den MVP
- **Entscheidung:** React + TypeScript + Vite bilden die App; Quizlogik bleibt
  außerhalb von React.
- **Konsequenz:** UI und Fachlogik sind getrennt testbar. Paketversionen werden
  erst beim Scaffold fixiert.

### D-003 – MapLibre als Kartenrenderer, kein allgemeines Game-Framework

- **Status:** accepted für den MVP
- **Entscheidung:** MapLibre übernimmt Karte und Geo-Interaktion. DOM übernimmt
  HUD, Menüs, Text und zugängliche Eingaben.
- **Konsequenz:** Kein paralleler Phaser-Canvas und keine doppelte
  Eingabearchitektur.

### D-004 – Local-first vor Accounts

- **Status:** accepted
- **Entscheidung:** Der MVP speichert Sessions und Lernstand lokal und benötigt
  kein Backend.
- **Konsequenz:** Repository-Schnittstellen und stabile Ereignis-IDs bereiten
  späteren Sync vor.

### D-005 – Versionierte, vorab gebaute Inhalte

- **Status:** accepted
- **Entscheidung:** Quizrunden nutzen lokale App-Artefakte mit Dataset-Manifest,
  keine externen Live-APIs.
- **Konsequenz:** Reproduzierbarkeit, Offlinefähigkeit und Lizenzprüfung werden
  Teil der Content-Pipeline.

### D-006 – Deutsch zuerst, mehrsprachiges Schema

- **Status:** accepted
- **Entscheidung:** MVP-Oberfläche und Antworten sind deutsch. Namen und Aliasse
  sind dennoch locale-basiert modelliert.
- **Konsequenz:** Weitere Sprachen erfordern Content und UI-Übersetzung, aber
  keine neue Entitätsstruktur.

### D-007 – Fachliche Bewertung gehört in versionierte Grader

- **Status:** accepted
- **Entscheidung:** `text-v1`, `distance-v1`, `area-v1` usw. bewerten
  serialisierbare Antworten unabhängig von der UI.
- **Konsequenz:** Alte Ergebnisse bleiben erklärbar; Graderänderungen erhalten
  eine neue Version.

### D-008 – Stabile IDs sind nicht der Anzeigename

- **Status:** accepted
- **Entscheidung:** ISO-/GeoNames-/Quell-IDs oder dauerhaft kuratierte IDs
  identifizieren Entitäten.
- **Konsequenz:** Umbenennungen und Übersetzungen zerstören keinen Lernstand.

### D-009 – Städte-Ranglisten nennen Quelle und Methode

- **Status:** accepted
- **Entscheidung:** Der erste 1000-Städte-Modus sortiert explizit nach dem
  Populationsfeld eines benannten GeoNames-Snapshots.
- **Konsequenz:** Er wird nicht als universelle Metropolregionsrangliste
  dargestellt.

### D-010 – Visuelles Konzept ist Gate vor dem App-Scaffold

- **Status:** accepted
- **Entscheidung:** Primäre Screens und Mobilzustände werden als zusammenhängende
  Designspezifikation freigegeben, bevor UI-Komponenten implementiert werden.
- **Konsequenz:** Design Tokens, Typografie und Komponenten werden aus dieser
  Spezifikation abgeleitet statt während des Codings improvisiert.

### D-011 – Mixed-Modi orchestrieren vorhandene Quizpools

- **Status:** accepted
- **Entscheidung:** Der Weltmix wählt Fragen über Gewichte, Mindestanteile,
  Wechselregeln, Schwierigkeit und Seed aus bestehenden QuizDefinitionen.
- **Konsequenz:** Gemischte Runden besitzen keinen eigenen Grader und keine
  duplizierte Themenlogik.

### D-012 – Wissenspuzzles werden vorab kompiliert

- **Status:** accepted
- **Entscheidung:** Zusammengesetzte Fragen entstehen beim Content-Build aus
  einer kleinen sicheren Abfragesprache, versionierten Fakten und Relationen.
- **Konsequenz:** Eindeutigkeit, Gleichstände, Quellen und Erklärung werden vor
  Veröffentlichung geprüft; kein freies Laufzeit-LLM entscheidet die Wahrheit.

### D-013 – Accounts synchronisieren stabile Fortschrittsereignisse

- **Status:** accepted
- **Entscheidung:** Lokaler Gastfortschritt und spätere Kontodaten verwenden
  stabile Ereignis-IDs. Zielbackend ist Supabase Auth + Postgres hinter
  austauschbaren Adaptern.
- **Konsequenz:** Gastübernahme und Mehrgeräte-Sync sind idempotent; Mastery und
  Statistiken bleiben wiederaufbaubar.

### D-014 – Abzeichen sind versionierte Regeln

- **Status:** accepted
- **Entscheidung:** Eine zentrale Achievement Engine wertet Ereignisse gegen
  Definitionen aus. Familiengeneratoren erzeugen systematische Abzeichen nach
  Thema, Region und Tier.
- **Konsequenz:** „Abzeichen für alles“ skaliert mit Content-Konfiguration statt
  verstreuten Bedingungen im UI-Code.

### D-015 – Erweiterung über versionierte Registries

- **Status:** accepted
- **Entscheidung:** Entitätstypen, Relationen, Prompts, Antwortmodi, Grader,
  Fortschrittsereignisse und Achievement-Aggregatoren besitzen stabile
  Registry-IDs und Schemas.
- **Konsequenz:** Neue Inhalte sind überwiegend Datenmodule. Neue Interaktionen
  werden als isolierte Plugins ergänzt, ohne die Kernengine umzuschreiben.

### D-016 – GitHub Pages zuerst, Hosting austauschbar halten

- **Status:** accepted
- **Entscheidung:** Die erste öffentliche Oberfläche wird als statischer
  Vite-Build über GitHub Pages ausgeliefert. Basispfad, Routing und Backend sind
  nicht fest an Pages gekoppelt.
- **Konsequenz:** Der Build läuft unter einem Repository-Unterpfad und später
  unter `/` auf einer eigenen Domain. Account- und Sync-Dienste bleiben
  austauschbare externe Adapter.

### D-017 – Ruhige, zentral steuerbare Atlas-Ästhetik

- **Status:** accepted
- **Entscheidung:** Die Oberfläche bleibt hell, reduziert und atlasartig:
  wenige Farben, feine Linien, gut lesbare Typografie, echte Karten statt
  dekorativer Ersatzgrafik und keine Glows, Verläufe oder KI-typische
  Überinszenierung.
- **Konsequenz:** Farben, Abstände, Typografie, Radien und Bewegung kommen aus
  zentralen CSS-Tokens. Feature-Komponenten enthalten keine eigenen
  Farbsysteme.

### D-018 – Scoring v1 zählt Wissen, nicht Geschwindigkeit

- **Status:** accepted
- **Entscheidung:** Eine korrekte Antwort erhält einen Punkt, eine falsche,
  übersprungene oder abgelaufene Antwort null Punkte. Zeit und
  Kartenentfernung werden getrennt gespeichert und erklärt, verändern den
  Punktestand in v1 aber nicht.
- **Konsequenz:** Lernen ohne Timer bleibt vergleichbar. Explizite Sprint- oder
  Prüfungsprofile können später eigene versionierte Scoring-IDs erhalten.

### D-019 – Persistierte aktive Sessions werden pausiert gespeichert

- **Status:** accepted
- **Entscheidung:** Die laufende Engine misst innerhalb eines Tabs mit einer
  monotonen Uhr. Vor dem Speichern wird die verstrichene Zeit eingerechnet und
  eine aktive Frage als pausierter Snapshot ohne Prozesszeitstempel abgelegt.
- **Konsequenz:** Ein Reload schenkt keine Hintergrundzeit hinzu und übernimmt
  keinen ungültigen `performance.now()`-Wert. Beim Wiederöffnen wird die Runde
  mit einer neuen monotonen Zeitbasis fortgesetzt.

### D-020 – Seed-Zufall ist ein versionierter Vertrag

- **Status:** accepted
- **Entscheidung:** Jede QuizDefinition nennt den Randomizer explizit. Phase 1
  verwendet `mulberry32-v1`; Dataset-Version, Quiz-ID, Scope, Randomizer-ID und
  Seed bilden gemeinsam das Zufallsmaterial.
- **Konsequenz:** Algorithmusänderungen erhalten eine neue ID. Gespeicherte
  Sessions behalten ohnehin ihre konkrete Fragenreihenfolge, und neu erzeugte
  Runden bleiben pro Version reproduzierbar.

### D-021 – Das MVP-Standardset umfasst 195 Staaten

- **Status:** accepted
- **Entscheidung:** Das Standardset heißt sichtbar „195 Staaten“ und umfasst
  193 UN-Mitglieder sowie Palästina und Vatikanstadt. Abhängige Gebiete,
  De-facto-Staaten und weitere politisch umstrittene Einheiten werden nicht
  stillschweigend beigemischt, sondern später als benanntes erweitertes Set
  angeboten.
- **Konsequenz:** „Alle“ ist reproduzierbar und überprüfbar. Die Auswahl stellt
  keine Aussage über bilaterale Anerkennung oder Grenzansprüche dar.

### D-022 – Phase-2-Stammdaten werden als lizenzierter Snapshot gebaut

- **Status:** accepted
- **Entscheidung:** ISO-Codes, Regionen, Aliasse und grobe Mittelpunkte stammen
  aus dem exakt gepinnten `world-countries@5.1.0`-Snapshot unter ODbL 1.0.
  Aktuelle deutsche Länderlabels sowie Hauptstadtbeziehungen, -labels und
  -koordinaten werden bei einem expliziten Refresh als datierter
  Wikidata-CC0-Snapshot übernommen. Natural Earth liefert die
  Public-Domain-Kartengeometrie.
- **Konsequenz:** Der normale Build ist offline und deterministisch. Manifest,
  UI und Dokumentation nennen Datenstand, Attribution und ODbL-Hinweis.

### D-023 – Hauptstadtrollen bleiben als Relationsqualifikatoren erhalten

- **Status:** accepted
- **Entscheidung:** Hat ein Staat mehrere verfassungsmäßige, administrative,
  legislative, gerichtliche, beanspruchte oder provisorische Hauptstadtsitze,
  werden diese als getrennte Stadtentitäten mit Rollenqualifikator gespeichert.
  Phase-2-Fragen fragen nach dem sichtbaren Stadtnamen oder Punkt und erzeugen
  deshalb keine mehrdeutige „die Hauptstadt von …“-Formulierung.
- **Konsequenz:** Südafrika, Bolivien, Sri Lanka, Eswatini, Palästina und
  vergleichbare Fälle benötigen keine fest verdrahtete Quizsonderlogik.

### D-024 – Kontinentscopes dürfen transkontinentale Staaten überlappen

- **Status:** accepted
- **Entscheidung:** Welt ist das eindeutige 195er-Set. Kontinentscopes sind
  kuratierte Lernlisten; Russland, Türkei, Kasachstan, Georgien,
  Aserbaidschan, Armenien, Zypern und Ägypten dürfen zwei Scopes angehören.
- **Konsequenz:** Die Summe der Kontinentszahlen kann größer als 195 sein. Die
  UI nennt dies „Zuordnung im Datensatz“ und das Manifest bleibt die
  nachvollziehbare Wahrheit.

### D-025 – Kleinstaaten erhalten kartographische Treffermarker

- **Status:** accepted
- **Entscheidung:** Länderflächen bleiben Natural-Earth-Geometrien. Für sehr
  kleine Staaten wird zusätzlich ein sichtbarer Punkt mit größerer unsichtbarer
  Touch-Zone gerendert; der Punkt verweist auf dieselbe stabile Länder-ID und
  wird vom normalen `area-v1`-Grader bewertet.
- **Konsequenz:** Touch-Fairness wird verbessert, ohne Grenzen künstlich zu
  vergrößern oder eine zweite Bewertungslogik einzuführen.

### D-026 – Lernstand v1 besteht aus idempotenten Rohereignissen

- **Status:** accepted
- **Entscheidung:** Jeder bestätigte Versuch erzeugt genau ein lokales
  `progress-event-v1` mit stabiler Attempt-ID, Entität, Skill, Ergebnis,
  Antwortzeit, Dataset- und Quizversion. Anzeigen werden aus diesen Ereignissen
  berechnet; eine endgültige Mastery- oder Spaced-Repetition-Formel wird noch
  nicht behauptet.
- **Konsequenz:** Fehlertraining und lokale Statistiken sind jetzt möglich.
  Phase 3 kann dieselben Ereignisse später idempotent synchronisieren und Phase
  8 kann Lernwerte neu berechnen.

### D-027 – Phase 3 beginnt mit E-Mail-Einmalcode hinter Adaptern

- **Status:** accepted
- **Entscheidung:** Der erste Accountweg verwendet Supabase-E-Mail-OTP hinter
  getrennten `AuthAdapter`- und `SyncAdapter`-Verträgen. Die App lädt den
  Supabase-Client nur auf der Kontoseite und nur bei gesetzter öffentlicher URL
  plus Publishable Key.
- **Konsequenz:** GitHub Pages bleibt ein statischer Host und der Gastmodus ist
  ohne Backend vollständig nutzbar. Soziale Logins oder ein anderes Backend
  können später den Adapter ersetzen, ohne die Quiz-Engine zu ändern.

### D-028 – Sync v1 ist eine lokale Outbox plus atomarer Serverimport

- **Status:** accepted
- **Entscheidung:** Jede abgeschlossene Antwort wird in derselben
  IndexedDB-Transaktion als Progress Event und als ausstehender
  Outbox-Datensatz geschrieben. Gastübernahmen verwenden eine stabile
  `import_batch_id`; eine Postgres-Funktion vereinigt den gesamten Batch
  transaktional mit stabilen Ereignis-IDs.
- **Konsequenz:** Wiederholung und Verbindungsabbruch erzeugen keine
  Doppelversuche. Lokale Daten werden erst nach bestätigtem Servermerge als
  kontogebunden markiert und niemals beim bloßen Anmelden gelöscht.

### D-029 – Abzeichen sind konfiguriert und lokal zunächst vorläufig

- **Status:** accepted
- **Entscheidung:** Eine pure, versionierte Achievement Engine wertet
  Definitionen über generische Aggregate aus. Lokale Freischaltungen erscheinen
  sofort mit Prüfstatus `local`; Serverantworten dürfen sie nach erneuter
  Auswertung als `server` bestätigen.
- **Konsequenz:** Neue Standardfamilien benötigen Definitionen statt neuer
  `if`-Verzweigungen. Nur serverbestätigter Fortschritt darf später für
  öffentliche Vergleiche verwendet werden.

### D-030 – Browser-Schema v3 trennt Identität, Outbox und Freischaltungen

- **Status:** accepted
- **Entscheidung:** IndexedDB v3 ergänzt eigene Stores für stabile lokale
  Identität, Sync-Outbox, Syncstatus und Achievement-Freischaltungen. Das alte
  `local-profile-id` aus `meta` wird beim ersten Zugriff übernommen.
- **Konsequenz:** Installation, Gerät und Gastprofil bleiben über Updates
  stabil; Phase-2-Daten werden erhalten und können vor dem ersten Sync in die
  Outbox zurückgefüllt werden.

### D-031 – Visuelle Fragen speichern Asset-Schlüssel statt Bilddaten

- **Status:** accepted
- **Entscheidung:** Flaggen und Länderumrisse werden beim Offline-Content-Build
  als versionierte SVG-Artefakte erzeugt. Eine `QuestionInstance` enthält nur
  einen stabilen Asset-Schlüssel, Art und Entitäts-ID. Der React-Renderer lädt
  vor Rundenstart nur die tatsächlich referenzierten Einzeldateien über den
  konfigurierten öffentlichen Basispfad.
- **Konsequenz:** Persistierte Sessions bleiben klein und serialisierbar. Die
  Engine kennt weder URLs noch SVG-Markup, und ein späterer Assettausch benötigt
  keinen neuen Grader oder Sessionzustand. Gleichzeitig entsteht kein globaler
  SVG-JavaScript-Chunk; der Service Worker kann Einzeldateien im Runtime-Cache
  übernehmen.

### D-032 – Eine Session darf eine einzelne oder gemischte Definition speichern

- **Status:** accepted
- **Entscheidung:** `QuizRoundDefinition` ist eine Union aus der bestehenden
  `QuizDefinition` und einer `MixedQuizDefinition`. Der Mixed-Scheduler
  verteilt die globale Fragenzahl anhand von Gewichten, Mindest-/Höchstmengen
  und Wechselregeln auf vollständige vorhandene QuizDefinitionen. Er setzt
  danach nur globale IDs und Ordinale.
- **Konsequenz:** Weltmix besitzt keinen eigenen Fragengenerator und keinen
  Grader. Seed, Poolherkunft und konkrete Fragen bleiben im Session-Snapshot
  nachvollziehbar; weitere Themen werden als Pool ergänzt.

### D-033 – Wiederholungsqueue v1 ist keine Spaced-Repetition-Behauptung

- **Status:** accepted
- **Entscheidung:** Die erste Queue wird ausschließlich aus den stabilen
  Rohereignissen abgeleitet. Pro Kombination aus Entität und Fähigkeit bleibt
  der letzte nicht anschließend korrekt beantwortete Fehler offen. Ein
  Wiederholungsstart bündelt die ältesten offenen Einträge in vorhandene
  QuizDefinitionen.
- **Konsequenz:** Fehler können geräte- und accountfähig wiederholt werden,
  ohne vor Phase 8 einen Mastery-, Intervall- oder Vergessensalgorithmus
  vorzutäuschen.

### D-034 – Physische Geographie verwendet einen gepinnten Natural-Earth-Snapshot

- **Status:** accepted
- **Entscheidung:** Phase 5 baut einen kuratierten, lokalen Snapshot aus
  `natural-earth-vector@5.1.2` und den 1:50m-Layern für Flüsse, Seen,
  Meeresflächen, geographische Regionspolygone und Höhenpunkte. Der normale
  App-Build bleibt offline; nur ein ausdrücklicher Refresh lädt die gepinnten
  Rohdaten. `ne_id` beziehungsweise ein stabiler kuratierter Fluss-Slug
  identifizieren Entitäten unabhängig vom Anzeigenamen.
- **Konsequenz:** Geometrien, deutsche Namen, Auswahlumfang, Quelle und
  Prüfsummen bleiben reproduzierbar. Neue physische Inhalte werden über die
  Auswahlkonfiguration und den Refresh ergänzt, nicht als React-Konstanten.

### D-035 – Liniengrader bewertet IDs, der Renderer löst Touch-Nähe auf

- **Status:** accepted
- **Entscheidung:** `line-v1` bewertet ausschließlich die stabile
  Entitäts-ID. MapLibre verbreitert die sichtbare Flussgeometrie nicht
  fachlich. Stattdessen sucht der Kartenadapter innerhalb einer
  bildschirmbasierten Touchdistanz die nächste gerenderte Linie. Sind zwei
  Kandidaten nahezu gleich nah, wird noch keine Antwort abgegeben und zum
  Hineinzoomen aufgefordert.
- **Konsequenz:** Zoomstufe und Gerätepixel verbessern die Bedienbarkeit, ohne
  die richtige Lösung im Grader zu verändern. Segmentdistanz und
  Mehrdeutigkeitsregel sind als pure Geometriefunktionen testbar.

### D-036 – Physische Umfänge sind explizite, überlappende Lernscopes

- **Status:** accepted
- **Entscheidung:** Jede physische Entität erhält kuratierte
  `located_in`-Relationen zu einem oder mehreren Kontinenten und eine
  Schwierigkeit. Die Setup-Oberfläche bietet nur Fragenzahlen an, die der
  aktuelle Themen-/Gebietspool tatsächlich tragen kann. Der Phase-5-Weltmix
  orchestriert die vier bisherigen und fünf physischen Pools über vorhandene
  QuizDefinitionen.
- **Konsequenz:** Grenzüberschreitende Flüsse, Meere und Gebirge dürfen in
  mehreren Lernscopes vorkommen. Kleine Regionalsets scheitern nicht erst beim
  Rundenstart; der Mixed-Scheduler erhält reale Poolmaxima.

### D-037 – Vergleichbare Fakten teilen Definition, Quelle, Methode und Datum

- **Status:** accepted
- **Entscheidung:** Dataset-Schema 4 führt `FactDefinition` und `EntityFact`
  ein. Ein Ranking darf nur numerische Fakten derselben Definition vergleichen,
  wenn Quelle, Methode und Bezugsdatum für den vollständigen Kandidatenraum
  identisch sind. Fehlende Kandidatenwerte und Gleichstände am Zielrang sind
  Buildfehler.
- **Konsequenz:** Die UI kann „Landfläche 2023“ oder „Bevölkerung 2023“
  präzise erklären. Ein stiller Wechsel zu Gesamtfläche, einem anderen Jahr
  oder einem abweichenden Bevölkerungsbegriff ist nicht möglich.

### D-038 – Wissenspuzzles werden zu normalen Frageentitäten kompiliert

- **Status:** accepted
- **Entscheidung:** Der Build materialisiert jede gültige Vorlage als stabile
  `knowledge_question`-Entität mit genau einer `has_answer`-Relation und einem
  kompilierten Erklärungsdatensatz. Die QuizDefinition nutzt
  `description → single_choice/text_input`; an der Laufzeit wird keine
  Faktenabfrage ausgeführt.
- **Konsequenz:** Session, Timer, Persistenz, Fortschritt, Reviewqueue und
  Grader benötigen keinen Wissenspuzzle-Sonderzustand. Gespeicherte Fragen
  behalten die konkrete Herleitung, auch wenn ein späteres Dataset neue Werte
  erhält.

### D-039 – Die erste Wissenssprache bleibt deklarativ und absichtlich klein

- **Status:** accepted
- **Entscheidung:** Contentvorlagen dürfen nur registrierte Relationsfilter,
  feste ID-Mengen, numerische Faktenvergleiche, Schnittmengen, Ranking und
  einen optionalen eindeutigen Relationspfad verwenden. Freies JavaScript,
  SQL, Laufzeit-KI und dynamische Netzabfragen sind ausgeschlossen.
- **Konsequenz:** Vorlagen sind reviewbar, deterministisch und ohne Codezugriff
  ausführbar. Neue Operationen wie Zählen, Nachbarschaft oder längere Pfade
  benötigen eine neue validierte Sprachversion statt versteckter
  Template-Sonderfälle.

### D-040 – Städte-Ränge sind scopebezogene GeoNames-Snapshot-Ränge

- **Status:** accepted
- **Entscheidung:** Phase 7 sortiert weltweit und für jeden Kontinent getrennt
  nach dem numerischen `population`-Feld des gepinnten GeoNames-Snapshots.
  Gleiche Werte werden für eine exakt reproduzierbare Top-N-Menge nach
  numerischer GeoNames-ID geordnet.
- **Konsequenz:** „Top 100/250/500/1000“ bedeutet stets Top N im gewählten
  Gebiet, nicht Welt-Top-N nachträglich auf ein Gebiet gefiltert. Die UI nennt
  Quelle, Snapshot, Feld und Tie-Break und behauptet weder Stadtgebiet- noch
  Metropolregionsbevölkerung.

### D-041 – Das Städtepaket wird getrennt und bedarfsgesteuert geladen

- **Status:** accepted
- **Entscheidung:** Der kleine Kerndatensatz registriert den Entitätstyp
  `ranked_city`, enthält aber keine Rangstädte. Ein manifestiertes,
  validiertes Phase-7-Paket mit stabilen `geonames:`-IDs wird erst für
  Städtefragen, Städtesuche oder einen Mixed-Pool mit Städten importiert und
  mit dem unveränderten Kerndatensatz zu einem Laufzeit-Repository vereinigt.
- **Konsequenz:** Länder-, Hauptstadt- und Physikrunden tragen nicht die
  mehreren Tausend Stadtentitäten im Startchunk. Persistierte Sessions
  speichern weiterhin konkrete Fragen statt des Content-Pakets und können
  ohne Rendererzustand fortgesetzt werden.

### D-042 – Clustering ist eine Übersichtsfunktion, kein Antwortmodell

- **Status:** accepted
- **Entscheidung:** Die Städte-Lernübersicht darf bis zu 1000 Punkte mit
  MapLibre clustern. Eine Antwortfrage zeigt beziehungsweise bewertet immer
  genau den individuellen GeoNames-Punkt über den vorhandenen
  `distance-v1`-Grader.
- **Konsequenz:** Cluster-IDs werden nie in Frage-, Antwort-, Fortschritts-
  oder Sessiondaten gespeichert. Kartenperformance kann optimiert werden,
  ohne die fachliche Lösung zu verändern.

### D-043 – Marathon ist eine normale pausierbare Runde

- **Status:** accepted
- **Entscheidung:** „Alle“ auf einem Städte-Topset erzeugt mit der vorhandenen
  QuizDefinition und Session-Engine 100, 250, 500 oder 1000 konkrete Fragen.
  Die bestehende pausierte IndexedDB-Session ist der Marathon-Zwischenstand.
- **Konsequenz:** Phase 7 benötigt keinen zweiten Spielstands- oder
  Fortschrittstyp. Fehlertraining, Accounts und Abzeichen sehen dieselben
  serialisierbaren Ereignisse wie bei kurzen Runden.

### D-044 – Physische Ranglisten bleiben metrisch getrennte Faktenpacks

- **Status:** accepted
- **Entscheidung:** „Gewässer“ darf in Navigation und Lernsprache als
  Oberbegriff dienen, ist aber keine gemeinsame Rangliste. Flüsse werden als
  vollständige Flusssysteme nach dem ersten Kilometerwert einer fest
  versionierten Tabellenrevision geordnet; Berge werden als eigenständige
  Gipfel nach gerundeter Höhe über Meeresspiegel geordnet. Beide globalen
  Top-100-Listen liegen mit Länder-/Regionsangabe und Mündung beziehungsweise
  Gebirge in einem separaten, lazy geladenen Pack. Wikipedia-Seitenrevision,
  HTML-Prüfsumme, Lizenz, Abrufdatum, Methode und eindeutige Ranggrenze werden
  manifestiert. Wikidata-IDs dienen, wo eindeutig, als stabile interne
  Identität; mehrdeutige Sammelartikel benötigen explizite lokale IDs.
- **Konsequenz:** Eine Flusslänge wird nicht mit Seeoberfläche, Meergröße oder
  Gipfelhöhe vermischt. Natural Earth bleibt Quelle der vorhandenen
  Kartenverläufe, nicht der Rangfolge. Neue Gewässertypen benötigen eine eigene
  Vergleichsdefinition und Quellenprüfung. Der generische `fact`-Prompt zeigt
  nur versionierte Fakten und der vorhandene Textgrader bewertet weiterhin den
  stabilen Entitätsnamen.

### D-045 – Lernmodi sind zentrale Regelprofile

- **Status:** accepted
- **Entscheidung:** `Lernen`, `Üben` und `Prüfung` sind keine UI-Bezeichnungen,
  sondern zentral definierte Kombinationen vorhandener Rundenregeln. Lernen
  läuft ohne Timer mit sofortigem Feedback und freiwilliger Lösungsanzeige.
  Üben verwendet dieselben Hilfen und hängt jede falsche, ausgelassene oder
  aufgedeckte Frage genau einmal als neue, nachvollziehbare Wiederholungsfrage
  ans Rundenende. Prüfung zeigt während der Runde keine Lösung, wertet erst am
  Ende aus und darf optional ein Zeitlimit verwenden.
- **Konsequenz:** Thema und Fragerichtung ändern die Lernmoduslogik nicht.
  React zeigt nur die aktive Profildefinition; Session-Engine, persistierte
  Definition und Ergebnisqueue setzen sie um. Eine unbeantwortete
  Prüfungsfrage kann ohne Auflösung verlassen werden und wird als
  `skipped` mit der sichtbaren Antwort „Keine Antwort“ gespeichert.

## Offene Entscheidungen

Diese Punkte blockieren die Dokumentationsphase nicht, müssen aber vor dem
jeweils genannten Gate entschieden werden.

### O-001 – Standardumfang „alle Länder“

- **Status:** resolved durch D-021
- **Fällig:** vor Phase 0 Gate
- **Empfehlung:** Ein klar benanntes Kernset im Standardquiz und ein erweitertes
  Set mit Territorien als separate Option.
- **Zu klären:** konkrete Mitgliedschaft, abhängige Gebiete, umstrittene Gebiete
  und sichtbarer Hinweis.
- **Entschieden:** 195 klar benannte Staaten im MVP; weitere Einheiten nur in
  einem späteren erweiterten Set.

### O-002 – Kartenprojektion

- **Status:** resolved für den MVP
- **Fällig:** Karten-Spike
- **Empfehlung:** Für präzise Lernfragen zunächst eine ruhige 2D-Weltkarte;
  Globe später als Entdeckungsansicht.
- **Zu testen:** Verzerrung, Antimeridian, Polarregionen und Touch-Zoom.
- **Entschieden:** ruhige Web-Mercator-2D-Karte im MVP; ein Globe bleibt eine
  spätere Entdeckungsansicht.

### O-003 – Scoring v1

- **Status:** resolved durch D-018
- **Fällig:** Phase 1
- **Empfehlung:** Treffer zuerst, Zeitbonus nur in expliziten Zeitmodi,
  Entfernungsfeedback getrennt vom Punktestand.
- **Entschieden:** Keine Teilpunkte oder Zeitboni im ersten Profil. Hinweise
  und Fehlerwiederholung folgen als eigene Regelversionen.

### O-004 – Länder mit mehreren Hauptstadtrollen

- **Status:** resolved durch D-023
- **Fällig:** Content-Fixture vor Phase 2
- **Empfehlung:** Relation mit Rolle wie offiziell, Regierungssitz oder
  legislativ modellieren; Preset erklärt, was gefragt wird.
- **Entschieden:** Rollenqualifikatoren bleiben im Content; der MVP fragt
  einzelne sichtbare Städte statt einer mehrdeutigen Singularformulierung.

### O-005 – Produktname

- **Fällig:** vor Designkonzept
- **Zu klären:** endgültiger Produktname. Die visuelle Richtung ist mit D-017
  geklärt; `GeoApp` bleibt bis zur Namensentscheidung ein Platzhalter.

### O-006 – Lernalgorithmus

- **Fällig:** Phase 8 / Implementierungsschritt 24
- **Empfehlung:** Bis dahin rohe Versuche plus einfacher Strength-Wert speichern;
  späteren Algorithmus versionieren und aus den Ereignissen neu berechnen.

### O-007 – Anmeldeverfahren zum Start

- **Fällig:** Implementierungsschritt 14
- **Empfehlung:** E-Mail-Magic-Link oder Einmalcode zuerst; soziale Logins erst
  bei nachgewiesenem Bedarf.
- **Zu klären:** gewünschte Anbieter, Altersgrenze und Jugendschutzanforderungen.

### O-008 – Sichtbarkeit von Profil und Abzeichen

- **Fällig:** vor sozialen Funktionen
- **Empfehlung:** standardmäßig privat; einzelne Challenge-Ergebnisse oder ein
  Abzeichenprofil nur nach ausdrücklicher Freigabe.
