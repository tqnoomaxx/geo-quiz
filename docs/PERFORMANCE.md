# Performance-Baseline

Messstand: 2026-07-30, Phase-7-Produktionsbuild mit Vite 7.3.6 und
`BASE_PATH=/geoapp/`.

## Aktueller Build

| Artefakt | Unkomprimiert | gzip | Bewertung |
|---|---:|---:|---|
| App-JavaScript inklusive Engine und Kerndataset | 1.056,55 kB | 157,50 kB | über App-Shell-Budget |
| App-CSS | 38,11 kB | 6,69 kB | im Budget |
| Karten-JavaScript und politische 50m-Geometrie | 1.827,92 kB | 524,25 kB | deutlich über Einzelbudget |
| MapLibre-CSS | ca. 70 kB | ca. 10 kB | im Budget |
| Abzeichenseite, lazy | ca. 3,4 kB | ca. 1,5 kB | im Budget |
| Kontoseite ohne Cloudclient, lazy | ca. 11 kB | ca. 4,1 kB | im Budget |
| Supabase-Client bei Konfiguration, lazy | ca. 217 kB | ca. 57 kB | nur auf der Kontoseite |
| Städteübersicht, lazy | 2,58 kB | 1,32 kB | nur beim gewählten Stadtthema |
| 6000-Städte-Datenpack, lazy | 6.351,01 kB | 404,20 kB | nur bei Stadtmodus/-lernstand |
| 390 lokale Visual-SVGs | ca. 3,2 MB gesamt | pro Runde nur referenzierte Einzeldateien | außerhalb des JS-Bundles |
| Gipfelgeometrie, lazy | 3,52 kB | 0,80 kB | nur bei benötigtem Thema |
| Seegeometrie, lazy | 71,57 kB | 25,27 kB | nur bei benötigtem Thema |
| Gebirgsgeometrie, lazy | 74,49 kB | 29,15 kB | nur bei benötigtem Thema |
| Flussgeometrie, lazy | 87,55 kB | 34,32 kB | nur bei benötigtem Thema |
| Meeresgeometrie, lazy | 183,05 kB | 72,01 kB | nur bei benötigtem Thema |

Der Kartenblock ist ein eigener dynamischer Import. Die Startansicht bindet
allerdings bereits eine echte Weltkartenvorschau ein und lädt ihn deshalb
aktuell früh nach.

Account- und Abzeichenseite sind eigene dynamische Imports. Ohne gesetzte
Supabase-Buildvariablen entfernt Vite den Cloudclient vollständig. Mit
Konfiguration entsteht ein zusätzlicher separater Chunk, der erst beim
Kontozugriff geladen wird.

Der erste Phase-4-Prototyp bündelte alle SVGs in einem dynamischen
JavaScriptblock von rund 985 kB gzip. Dieser Weg wurde verworfen. Flaggen und
Umrisse liegen nun als einzelne lokale Dateien vor; der Fragensnapshot bestimmt
die kleine Teilmenge, die vor Rundenstart parallel geladen wird. Dadurch wächst
die App-Shell gegenüber Phase 3 nur um rund 5 kB gzip. Eine umgekehrte
Flaggenauswahl kann wegen vier Optionen mehr Einzelrequests als eine
Texteingaberunde erzeugen; C-047 hält diesen Trade-off sichtbar.

Gegenüber Phase 4 wächst die App-Shell gzip-komprimiert um rund 12 kB. Darin
enthalten sind 88 zusätzliche Entitäten mit Namen/Scopes, zehn Presets,
Liniengrader und fünf Abzeichenfamilien. Der Kartenblock bleibt durch die
thematische Aufteilung nahezu auf Phase-4-Niveau. Das kombinierte JavaScript
für die erste echte Karte liegt bei rund 666 kB gzip und überschreitet damit
weiterhin das 400-kB-Gesamtbudget.

Gegenüber Phase 5 wächst die App-Shell gzip-komprimiert um weitere rund
12,34 kB. Darin liegen 388 Fakten, 20 kompilierte Erklärungsdatensätze, die
sichere Wissenspuzzle-Sprache, zwei Presets und die Wissensfragenoberfläche.
Der Content bleibt damit klein genug für den funktionalen Slice, wird aber
noch synchron mit dem Kerndataset geladen. C-065 hält die notwendige spätere
Themenaufteilung sichtbar.

Gegenüber Phase 6 wächst die App-Shell gzip-komprimiert um 3,09 kB. Der
eigentliche Phase-7-Bestand ist nicht darin enthalten: Die 6000
Stadtentitäten, Namen, Relationen, Ränge und Fakten bilden einen separaten
404,20-kB-gzip-Chunk. Das kleine synchrone Indexartefakt enthält nur
Snapshot-, Methoden-, Qualitäts- und Quellenangaben. Stadtfreie Starts und
Runden laden den großen Pack nicht; Stadtsetup, Stadtfragen oder bereits
vorhandener Stadtlernstand laden ihn einmal und verwenden danach Modul- und
Runtime-Cache.

Der Produktions-Service-Worker liest `asset-manifest.json` und bereitet alle
Shell- und Kartenartefakte vor. Visuelle Einzelassets, Physikthemen und den
Städtepack lädt die App nur bei Bedarf; danach übernimmt sie der Runtime-Cache.
Eine vorbereitete visuelle und eine
vorbereitete Flussrunde wurden jeweils offline neu geladen. Source Maps werden
nicht vorab gecacht.

Der erste korrekte Phase-5-Prototyp bündelte alle fünf Physikpakete im
Kartenchunk. Dieser stieg auf 2.248,11 kB beziehungsweise 684,69 kB gzip.
Nach der thematischen Aufteilung liegt die Karte wieder bei 524,25 kB gzip.
Eine einzelne physische Runde ergänzt je nach Thema 0,80 bis 72,01 kB gzip;
ein vollständiger Weltmix lädt alle fünf Pakete bewusst vor Rundenstart.

## Synthetische Phase-7-Zeitmessung

Gemessen wurde ein lokaler Produktionsbuild in Chromium ohne CPU- oder
Netzdrosselung. Das ist eine Regressionsbaseline, kein Nachweis für ein echtes
Mittelklassegerät:

| Profil | Auswahl „Große Städte“ bis 1000 Punkte/Suche bereit | Übersicht bis Top-1000-Runde bereit |
|---|---:|---:|
| Desktop Chromium | 408 ms | 81 ms |
| Pixel-7-Emulation | 386 ms | 78 ms |

Der dynamische Städtechunk wurde lokal in rund 60–61 ms verarbeitet; seine
minifizierte, dekodierte Größe beträgt 6.351.011 Bytes. Die Übersicht
clusterte 1000 Punkte, die München-Suche lieferte Rang 314, und die
Browserkonsole blieb fehlerfrei. Transferwerte aus Localhost/Cache sind nicht
mit einem realen Netz vergleichbar. Ein echter Android-Lauf mit gedrosseltem
Netz, Speichermessung und vollständig durchgespielter 1000er-Runde bleibt
offen.

## Vorläufige Budgets bis zum Phase-0-Gate

- App-Shell-JavaScript: höchstens 100 kB gzip.
- Karten-Chunk: höchstens 300 kB gzip.
- gesamtes JavaScript für die erste interaktive Karte: höchstens 400 kB gzip.
- Eingabe-zu-Feedback: unter 100 ms im Grader; Karten-Renderzeit wird separat
  auf einem durchschnittlichen Mobilgerät gemessen.
- Keine externen Tiles, Fonts oder Schlüssel zum Start einer Demorunde.

Diese Werte sind technische Leitplanken, noch keine Nutzer-SLAs. Vor dem Gate
werden mindestens Desktop Chromium, ein echtes mittleres Android-Gerät und ein
gedrosseltes Netzwerkprofil gemessen.

## Nächste Messentscheidung

Verglichen werden:

1. aktuelle echte MapLibre-Vorschau auf der Startseite;
2. statische SVG-Vorschau aus denselben versionierten Geometrien, MapLibre erst
   beim Quiz;
3. stärker vereinfachtes Länderartefakt und später regionale Lazy-Loads.

Die Variante mit dem besten Verhältnis aus ehrlicher Kartendarstellung,
Interaktivitätszeit und Wartbarkeit gewinnt. Das Vite-Warnlimit wird nicht
hochgesetzt, nur um den Befund auszublenden.

Der aktuelle Kartenstand verschärft `C-010` bewusst auf 524,25 kB gzip. Das
Performance-Gate bleibt offen, obwohl die funktionalen Browserflüsse bestehen.
