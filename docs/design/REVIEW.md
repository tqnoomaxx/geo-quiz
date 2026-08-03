# Visueller Review – Phase 0 und Phase 2

Stand: 2026-08-04

Die App wurde in Desktop Chromium (1440 × 1000) und einem Pixel-7-Viewport
(390 × 844) gerendert. Kein Browser-Connector war verfügbar; die Prüfung lief
lokal mit Playwright.

## Vergleich

| Screen | Konzept | Implementierung | Ergebnis |
|---|---|---|---|
| Home/Setup | [Konzept](concepts/geoapp-home-desktop.png) | [Render](review/home-desktop.png) | Hierarchie, Zweispaltenlayout, Typografie, Farben und echte Weltkarte stimmen. Der Render wählt für die Demo Hauptstädte und nennt drei Fragen. |
| Kartenfrage | [Konzept](concepts/geoapp-map-quiz-desktop.png) | [Render](review/map-quiz-desktop.png) | Dominante Europakarte und ruhige Fragenleiste stimmen. Fortschritt liegt kompakt im Header; die Demogeometrie ist gröber. |
| Texteingabe mobil | [Konzept](concepts/geoapp-text-quiz-mobile.png) | [Render](review/text-quiz-mobile.png) | Einspaltiger Fluss, Fokus, große Eingabe und Karte stimmen. Der echte Demo-Content fragt Deutschland statt Slowenien. |
| Ergebnis | [Konzept](concepts/geoapp-results-desktop.png) | [Render](review/results-desktop.png) | Zusammenfassung, Fehlerliste, Achievement-Hinweis und Kartenstreifen stimmen. Werte und Zeilenanzahl folgen der Drei-Fragen-Demo. |

## Fidelity-Ledger

- **Bewusst beibehalten:** Weißraum, Navy/Petrol, Salbei/Ozean, feine
  Trennlinien, Outline-Icons, sehr wenig Schatten und keine Verläufe oder Glows.
- **Bewusst code-native:** Texte, Icons, Fokuszustände, Controls, Fortschritt
  und alle Karten.
- **Bewusst abweichend:** Demo-Inhalt statt erfundener 20-Fragen-Metriken;
  Systemschrift statt externem Font; sichtbare Natural-Earth-Attribution.
- **Nach Review korrigiert:** Ringrichtung und Antimeridian der
  TopoJSON-Geometrien; eine dekorative CSS-Kartenattrappe im Ergebnis wurde
  durch eine echte Karte ersetzt.
- **Noch offen:** Nutzerfreigabe der Richtung, Produktname, finale
  Kartendatendichte und Mobile-Test auf realem Gerät.

## Phase-2-Abgleich

Die Phase-2-Oberflächen wurden erneut mit dem bestehenden Konzept verglichen.
Es wurden keine neuen Stilwelten oder bildgenerierten UI-Elemente eingeführt.

| Screen | Phase-2-Render | Review |
|---|---|---|
| Home/Setup | [Desktop](review/phase2-home-desktop.png) | Die vier echten Setup-Dimensionen passen in die bestehende Zweispaltenhierarchie. Verfügbare und spätere Themen sind klar getrennt; Datenumfang bleibt sichtbar. |
| Kartenfrage | [Desktop](review/phase2-map-quiz-desktop.png) | Die Karte bleibt dominant, Fortschritt und Meta bleiben ruhig. 50m-Geometrie und Kleinstaatmarker erhöhen die fachliche Dichte ohne neue Dekoration. |
| Texteingabe | [Mobil](review/phase2-text-quiz-mobile.png) | Eingabe, Hauptaktion, Lösungsanzeige und Kartenhinweis folgen dem Konzept. Markierte Fragen zentrieren auf ihr Ziel, damit transkontinentale Kandidaten sichtbar bleiben. |
| Ergebnis | [Desktop](review/phase2-results-desktop.png) | Echte Fehlerzeilen und Fehlertraining ersetzen die frühere Demo. Der Achievement-Teaser wurde bewusst durch den ehrlichen lokalen Speicherhinweis ersetzt. |
| Lernstand | [Desktop](review/phase2-progress-desktop.png) | Neue Fläche im selben Atlas-System: große Kennzahlen links, Skill- und Schwächenlisten rechts, keine erfundene Mastery oder Gamification-Dekoration. |

### Phase-2-Fidelity-Ledger

- **Beibehalten:** zentrale Tokens, Weiß/Navy/Petrol/Salbei, feine Linien,
  Outline-Icons, großzügiger Weißraum und echte Karten.
- **Bewusst erweitert:** Setup auf vier Controls, sichtbare deaktivierte
  Zukunftsthemen, Timer im Quizheader und lokale Lernübersicht.
- **Bewusst vereinfacht:** keine Abzeichenbehauptung vor Phase 3; Lernstand
  zeigt Rohversuche statt eines scheinpräzisen Lernwerts.
- **Nach Review korrigiert:** markierte Punkte/Flächen zentrieren die
  Hinweiskarte; der Pages-Browserlauf verwendet denselben Unterpfad wie der
  Releasebuild.
- **Noch offen:** Nutzerfreigabe, echte Screenreader-/Touchprüfung und
  Performance der dichteren Karte auf einem mittleren Android-Gerät.

## Phase-4-Abgleich

Flaggen- und Formfragen verwenden dieselbe ruhige Atlas-Oberfläche. SVGs sind
fachliche Quizmedien, keine dekorative neue Stilwelt.

| Screen | Phase-4-Render | Review |
|---|---|---|
| Flagge → Auswahl | [Desktop](review/phase4-flag-choice-desktop.png) | Vier klar getrennte Antwortkarten, unverdecktes Motiv und weiterhin kompakter Quizkopf. |
| Länderform → Text | [Mobil](review/phase4-shape-text-mobile.png) | Einspaltiger Aufbau, große Eingabe und proportional eingepasster Umriss ohne seitliches Abschneiden. |

### Phase-4-Fidelity-Ledger

- **Beibehalten:** zentrale Tokens, bestehende Typografie, Linien, Radien und
  Feedbackkomponenten.
- **Bewusst erweitert:** ein neutraler Motivrahmen und ein responsives
  Auswahlraster; Flaggen und Formen bleiben lokale Inhaltsassets.
- **Nach Review korrigiert:** Die lokale Speicherbestätigung erscheint erst
  nach einem echten bestätigten Versuch, nicht schon beim Öffnen der Frage.
- **Noch offen:** fachliche Sichtung schwer erkennbarer Umrisse, reale
  Screenreader-/Touchprüfung und eine zugängliche Alternative für reine
  Bilderkennung gemäß `C-046` und `C-049`.

## Phase-5-Abgleich

Physische Layer verwenden dieselbe Atlas-Karte und vorhandene Tokens. Flüsse
bleiben dünne blaue Lernlinien, Seen/Meere ruhige Wasserflächen und Gebirge
gedeckte braune Lernflächen. Gipfel nutzen die vorhandene Punktinteraktion.

Die Produktionsansicht wurde bei 1440 × 1000 und in einem
393 × 852-Touchviewport per Screenshot geprüft:

- Die Kartenfläche bleibt auf Desktop dominant; korrekt gewählter
  Flussverlauf, Feedback und Weiter-Aktion sind gemeinsam sichtbar.
- Auf Mobile stehen Frage und Aktion vor einem quadratischen Kartenfeld. Die
  Weltbreite passt in den ersten Blick und die Seite benötigt für den
  Kernzustand keinen seitlichen Scroll.
- Physikfragen blenden politische Kleinstaat-Hilfspunkte aus; Länderfragen
  behalten sie.

### Phase-5-Fidelity-Ledger

- **Beibehalten:** Weißraum, Navy/Petrol, Natural-Earth-Grundkarte, feine
  Konturen, vorhandene Feedbackkarte und kompakte Metazeile.
- **Bewusst erweitert:** physische Farben als zentrale MapLibre-Paints und ein
  kurzer kontextueller Zoomhinweis bei leerer oder mehrdeutiger Linienauswahl.
- **Nach Review korrigiert:** mobile Weltkamera plus quadratisches Kartenfeld
  für Randziele (C-056) und ausgeblendete Kleinstaatmarker in physischen Modi
  (C-057); lange Namen werden im schmalen Fragenrail sicher getrennt (C-058).
- **Noch offen:** echte Touchgeräte-Fairness naher Flussverläufe,
  Screenreader-Grundfluss und fachliche Vollsichtung der Lernflächen.

## Phase-8-Astronomie-Abgleich

Die Produktionsansicht wurde ohne Browser-Connector lokal mit Playwright bei
nativen Viewports von 1440 × 1000 und 393 × 852 gerendert. Die Screenshots sind
Full-Page-Aufnahmen; der Browser wurde dafür weder skaliert noch nachträglich
zugeschnitten.

| Screen | Konzept | Desktop | Mobil |
|---|---|---|---|
| Astronomie-Setup | [Konzept](concepts/geoapp-astronomy-setup-desktop.png) | [Render](review/phase8-astronomy-setup-desktop.png) | [Render](review/phase8-astronomy-setup-mobile.png) |
| Sternzeichenfrage | [Konzept](concepts/geoapp-zodiac-quiz-desktop.png) | [Render](review/phase8-zodiac-quiz-desktop.png) | [Render](review/phase8-zodiac-quiz-mobile.png) |

Der Kernfluss wurde auf beiden Viewports vollständig geprüft: Sternzeichen
wählen, drei optionale Felder zuschalten, Sechserrunde starten, vier Angaben
korrekt beantworten, zur nächsten Frage wechseln und dort die komplette
Lösung anzeigen. Die drei übrigen Astronomie-Challenges wurden ebenfalls aus
dem echten Setup gestartet und auf Faktenprompt plus Lösungsanzeige geprüft.

### Phase-8-Fidelity-Ledger

- **Beibehalten:** zweigeteiltes Desktop-Setup, klare Lernprofile, kompakte
  Rundengrößen, zeilenweise Feldwahl und dunkelblaue Sternbildfläche.
- **Beibehalten:** Quizaufteilung aus großer visueller Frage links und ruhigem
  Formular rechts; auf Mobile folgt das Formular direkt unter dem Motiv.
- **Code-native umgesetzt:** Navigation, Icons, Checkboxen, Formularzustände,
  Fokusrahmen und alle zwölf deterministisch gebauten SVG-Lernkarten.
- **Bewusst abweichend:** Der echte Challenge-Katalog bleibt vollständig und
  kombiniert Flüsse, Seen oder Gebirge nicht zu unpräzisen Sammelzeilen.
- **Bewusst abweichend:** Das Länderprofil im Konzept nennt noch den
  Kontinent; die Implementierung lässt ihn gemäß Produktentscheidung weg.
- **Bewusst abweichend:** Die Lernkarten zeigen Raster und Nordhinweis, aber
  keine scheinpräzisen Stunden-/Gradwerte. Die vereinfachten Linien werden
  nicht als offizielle IAU-Strichfiguren ausgegeben.
- **Copy-Diff:** „Beste Sichtbarkeit“ nennt in der Implementierung explizit
  die Methode „gegen 22 Uhr in Mitteleuropa“; Platzhalter und Vorschau nutzen
  April statt des rein illustrativen Konzeptwerts März.
- **Responsive Ergebnis:** Kein seitlicher Überlauf bei 393 px; Motiv,
  Eingaben, Lösung und Metazeile bleiben ohne verdeckte Controls bedienbar.
