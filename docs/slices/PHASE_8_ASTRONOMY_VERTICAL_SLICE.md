# Phase-8-Slice: Astronomie-Grundwissen

## Slice-Brief

- **Nutzerziel:** Planeten, bekannte Monde, Zwergplaneten und die zwölf
  traditionellen Tierkreis-Sternbilder aktiv erinnern und Lösungen direkt
  lernen können.
- **Phase/Gate:** eigenständiger Phase-8-Content-Slice auf der bestehenden
  Lernprofil- und Fortschrittsarchitektur.
- **Thema und Scope:** acht Planeten, zwanzig kuratierte bekannte Monde, fünf
  von NASA geführte Zwergplaneten und zwölf Tierkreis-Sternbilder.
- **Prompt:** Faktenprofil für Planeten, Monde und Zwergplaneten;
  versionierte Sternbildkarte für Sternzeichen.
- **Antwortmodus:** `text_input` beziehungsweise `fact_profile_input`.
- **Regeln:** Lernen, Üben und Prüfung; 6/10/20 beziehungsweise alle je nach
  verfügbarer Kandidatenzahl; optionaler Prüfungstimer.
- **Benötigte Entitäten/Relationen/Fakten:** `planet`, `moon`,
  `dwarf_planet`, `zodiac_constellation`, `orbits`, Ordnungs-/Typ-/Merkmals-
  und Beobachtungsfakten.
- **Neue Datenquelle oder Asset:** NASA Solar System Exploration für
  Sonnensystem-Fakten; IAU-Konstellationsliste und -karten unter CC BY 4.0;
  lokale vereinfachte SVG-Sternbildkarten.
- **Geänderte öffentliche Typen/Schemas:** `visual_asset` ergänzt
  `constellation_chart`; `fact_profile_input` und `fact-profile-v1` werden
  registriert; Fakten dürfen explizite akzeptierte Eingabewerte tragen.
- **Erfolgskriterien:** jede Challenge erzeugt deterministisch eine Runde;
  Sternzeichenname ist Pflicht, optionale Felder werden exakt nach Setup
  kompiliert; Lösung zeigt alle aktivierten Werte; alle Lernprofile,
  Persistenz, Ergebnis und Fehlertraining funktionieren ohne Sonder-Session.
- **Größte Risiken:** veränderliche Mondzahlen, astrologische statt
  astronomischer Deutung, nicht offizielle Sternlinien und scheinbar zeitlose
  Himmelsrichtungen.
- **Explizit nicht enthalten:** sämtliche bekannten Monde, Horoskope,
  Geburtshoroskope, Live-Sternkarte, Standortfreigabe, Teleskopsteuerung und
  aktuelle Ephemeriden.

## Fachliche Grenzen

- „Monde“ ist eine kuratierte Lernmenge von zwanzig besonders bekannten
  natürlichen Satelliten, keine Vollständigkeitsbehauptung. Die Gesamtzahl
  bestätigter Monde ändert sich durch neue Entdeckungen.
- „Zwergplaneten“ umfasst Ceres, Pluto, Haumea, Makemake und Eris entsprechend
  der sichtbaren NASA-Lernübersicht dieses Snapshots.
- „Sternzeichen“ meint die zwölf traditionellen Tierkreis-Sternbilder. Die
  App vermittelt keine astrologischen Eigenschaften.
- IAU-Kürzel stammen aus der offiziellen Liste. Die sichtbaren Strichfiguren
  sind eine didaktische Darstellung; die IAU definiert dafür keine einzige
  verbindliche Linienform.
- Beste Sichtbarkeit und Himmelslage nennen ihre Methode. Eine konkrete
  Richtung am Horizont wäre ohne Beobachtungsort und Zeitpunkt nicht eindeutig
  und wird daher nicht als statischer Quizwert verwendet.

## Abnahme

- Content-Build prüft 8/20/5/12 Entitäten, vollständige Fakten, stabile IDs,
  Quellenreferenzen und genau zwölf lokale Sternbild-SVGs.
- Der Katalogvertrag erzeugt jede neue Definition in Lernen, Üben und Prüfung.
- Browser-QA deckt mindestens einen Faktenmodus und das Sternzeichenprofil auf
  Desktop und Mobil ab.
- Tastaturfokus, Lösungsanzeige, feldgenaues Feedback und responsive
  Anordnung bleiben vollständig bedienbar.
