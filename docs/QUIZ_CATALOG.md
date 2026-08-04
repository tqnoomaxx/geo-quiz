# Langfristiger Quizkatalog

Dieser Katalog ist eine Ideenlandkarte, kein Versprechen für den ersten Release.
Jeder Eintrag soll möglichst durch die Bausteine aus `QUIZ_ENGINE.md` entstehen.

## Politische Geographie

| Inhalt | Mögliche Frage → Antwort |
|---|---|
| Länder | Name → Kartenfläche |
| Länder | Kartenfläche → Texteingabe |
| Länder | Umriss → Name oder Auswahl |
| Länder | Flagge → Name, Karte oder Hauptstadt |
| Länder | Name → Flagge |
| Länder | Nachbarländer → Multi-Auswahl |
| Länder | Kontinent/Region → Zuordnung |
| Länderprofil | vorgegebenes Land → Hauptstadt, Amtssprache und Währung — **Phase 7 umgesetzt** |
| Hauptstädte | Name → Kartenpunkt |
| Hauptstädte | Kartenpunkt → Texteingabe |
| Hauptstädte | Land → Hauptstadtname |
| Hauptstädte | Hauptstadt → Land |
| Hauptstädte | Flagge → Hauptstadt |
| Grenzen | zwei Länder → „grenzen sie aneinander?“ |

## Städte und Siedlungen

| Inhalt | Mögliche Frage → Antwort |
|---|---|
| Große Städte | Name → Kartenpunkt — **Phase 7 umgesetzt** |
| Große Städte | Kartenpunkt → Name — **Phase 7 umgesetzt** |
| Große Städte | Stadt → Land/Region |
| Große Städte | Land → Städte auswählen |
| Bevölkerung | Städte nach Größe sortieren |
| Ranglisten | Top 100/250/500/1000 als pausierbarer Marathon — **Phase 7 umgesetzt** |
| Städtedichte | Kartenregion → passende Metropole |
| Hauptstädte von Regionen | Region ↔ Hauptstadt |

Städtefragen zeigen Dataset-Snapshot und Populationsmethode, sobald eine
Rangfolge verwendet wird.

## Physische Geographie

| Inhalt | Mögliche Frage → Antwort |
|---|---|
| Flüsse | Name → Kartenlinie |
| Flüsse | hervorgehobene Linie → Name |
| Längste Flusssysteme | Länge/Länder/Mündung → Name — **Top 100 umgesetzt** |
| Seen | Name → Kartenfläche oder Punkt |
| Meere/Ozeane | Name → Kartenfläche |
| Gebirge | Name → Kartenregion |
| Gebirge | Kartenhighlight → Name |
| Gipfel | Name → Kartenpunkt |
| Höchste eigenständige Gipfel | Höhe/Land/Gebirge → Name — **Top 100 umgesetzt** |
| Wüsten | Name → Kartenfläche |
| Inseln | Name → Kartenfläche/Punkt |
| Halbinseln | Kartenhighlight → Name |
| Wasserfälle/Vulkane | Name → Kartenpunkt |

Freies Nachzeichnen von Flüssen oder Gebirgszügen kommt erst nach zuverlässiger
Linienauswahl, weil Bewertung und Touchbedienung deutlich schwieriger sind.

„Gewässer“ ist eine sinnvolle Oberkategorie, aber keine gemeinsame
Größenrangliste: Flusssysteme werden nach Länge, Seen typischerweise nach
Fläche oder Volumen und Meere nach einer separat zu definierenden Fläche
verglichen.

## Regionen und administrative Ebenen

- Deutsche Bundesländer und Landeshauptstädte.
- US-Bundesstaaten und State Capitals.
- Kantone, Provinzen, Départements und vergleichbare erste Verwaltungsebene.
- Regionen innerhalb eines frei gewählten Landes.
- Regionname ↔ Fläche, Flagge/Wappen ↔ Region, Region ↔ Hauptstadt.

Jede administrative Sammlung ist ein eigenes versioniertes Content-Pack. Die
App setzt nicht voraus, dass Verwaltungsebenen weltweit gleich aufgebaut sind.

## Geographisches Allgemeinwissen

- Kontinente, Subregionen und Hemisphären.
- Zeitzonen und Datumsgrenze.
- Sprachen und Währungen als Relationen zu Ländern.
- Landesflächen, Bevölkerung, Höhen und Längen vergleichen/sortieren.
- Kfz-/Internet-Ländercodes und internationale Kürzel.
- Wahrzeichen und Naturstätten, sobald Bildrechte und Quellen sauber geklärt
  sind.

Diese Faktenmodi verwenden sichtbare Bezugsdaten. Veränderliche Zahlen werden
nicht als zeitlose Wahrheit behandelt.

## Astronomie-Grundwissen

| Inhalt | Mögliche Frage → Antwort |
|---|---|
| Planeten | Position/Typ/Merkmal → Name — **Phase 8 umgesetzt** |
| bekannte Monde | Zentralobjekt/Merkmal → Name — **Phase 8 umgesetzt** |
| Zwergplaneten | Region/Merkmal → Name — **Phase 8 umgesetzt** |
| Tierkreis-Sternbilder | vereinfachte Sternkarte → Name plus optionale Fakten — **Phase 8 umgesetzt** |

Die Sternzeichen-Challenge fragt den Namen immer ab. IAU-Kürzel, den methodisch
definierten Monat der besten Sichtbarkeit und die grobe Himmelslage kann die
lernende Person einzeln zuschalten. Momentane Horizont-Richtungen und
astrologische Deutungen gehören nicht zum statischen Content-Snapshot.

## Themenübergreifende Modi

- Weltmix mit kontrolliertem Wechsel zwischen Ländern, Hauptstädten, Flaggen,
  Länderformen, Naturthemen und Wissenspuzzles.
- Regionalmix, etwa „alles über Europa“.
- Persönlicher Mix mit höherem Gewicht für eigene Schwächen.
- Wissenspuzzles aus Sprache, Fläche, Bevölkerung, Grenzen, Regionen,
  Hauptstädten, Höhen und Flussrelationen.
- Mehrstufige Runde: erst Entität erkennen, dann passende Folgefrage.
- Tageschallenge mit identischer Dataset-Version, Definition und Seed.

## Antwortmechaniken

| Mechanik | Geeignet für |
|---|---|
| Kartenpunkt | Städte, Gipfel, Vulkane, Wasserfälle |
| Kartenfläche | Länder, Regionen, Seen, Meere, Inseln |
| Kartenlinie | Flüsse, Grenzen, Gebirgskämme |
| Texteingabe | aktive Erinnerung von Namen |
| Mehrfeldprofil | mehrere relationale oder faktische Werte zu einer Entität |
| Single Choice | Einstieg und schnelle Wiederholung |
| Multi Choice | Nachbarländer, durchflossene Staaten |
| Drag & Match | Flagge–Land, Land–Hauptstadt |
| Sortieren | Bevölkerung, Höhe, Fläche, Flusslänge |
| Kartenfüllung | alle Länder einer Region nacheinander |
| Freies Zeichnen | spätere Expertenmodi für Verläufe |

## Rundenprofile

Die Profile ändern Regeln, nicht Fachinhalte:

- **Lernen:** kein Zeitdruck, sofortiges Feedback und freiwillige
  Lösungsanzeige.
- **Üben:** kein Zeitdruck, sofortiges Feedback und jede falsche oder
  aufgedeckte Frage genau einmal am Rundenende wiederholen.
- **Prüfung:** keine Lösung während der Runde, gesammelt auswerten und ein
  Zeitlimit nur auf Wunsch aktivieren.
- **Sprint:** Zeit pro Frage.
- **Zeitjagd:** Gesamtzeit.
- **Survival:** begrenzte Fehler.
- **Sudden Death:** erster Fehler beendet die Runde.
- **Marathon:** alle Elemente oder große Stadtsets, pausierbar.
- **Fehlertraining:** nur schwache oder zuletzt falsche Entitäten.
- **Wiederholung:** nach Fälligkeit des Lernalgorithmus.
- **Tageschallenge:** Definition + Dataset-Version + gemeinsamer Seed.
- **Benutzerdefiniert:** Gebiet, Anzahl, Timer und Schwierigkeit selbst wählen.

## Ausbauprüfung für neue Ideen

Eine Idee kommt in die Roadmap, wenn:

1. ihr Lernziel klarer ist als nur „noch ein Modus“;
2. Datenquelle, Lizenz und Datenqualität vertretbar sind;
3. Prompt und Antwort fair auf Desktop und Touch funktionieren;
4. sie vorhandene Engine-Bausteine nutzt oder eine breit wiederverwendbare
   Erweiterung rechtfertigt;
5. der vorherige Roadmap-Gate erfüllt ist.
