# Phase 7 – Länderprofile

## Slice-Brief

- **Nutzerziel:** Ein vorgegebenes Land als zusammenhängendes Faktenprofil
  lernen, statt Hauptstadt, Amtssprache und Währung nur in
  getrennten Runden zu sehen.
- **Umfang:** die 195 Länder des bestehenden Kernsets, filterbar nach Welt und
  Kontinent.
- **Frage:** `country × name:country_profile × country_profile_input`.
- **Antwortfelder:** Hauptstadt, Amtssprache und Währung.
- **Regeln:** Lernen, Üben und Prüfung verwenden dieselben zentralen
  Lernprofile wie alle anderen Themen; 10, 20 oder alle verfügbaren Länder.
- **Nicht enthalten:** Bevölkerungszahlen, Staatsoberhäupter, freie
  Faktenlisten, Live-Abfragen oder ein eigenes Sessionmodell.

## Fachliche Semantik

Jedes Feld erwartet eine passende Antwort. Hat ein Land mehrere gepflegte
Hauptstadtsitze, Amtssprachen oder Währungen, zählt jeder einzelne gültige
Wert. Nach einer Antwort oder freiwilligen Lösungsanzeige nennt das Feedback
alle akzeptierten Werte. Nur drei richtige Felder ergeben den einen
Fragepunkt; ein teilweise korrektes Profil wird dennoch feldgenau erklärt.

## Datenfluss

```text
world-countries@5.1.0 + bestehende Länder-/Hauptstadtdaten
                  │ content:build
                  ▼
country ──has_capital────────────► city
        ├─has_official_language──► language
        └─uses_currency──────────► currency
                  │
                  ▼
QuizDefinition → Generator → country-profile-v1 → Session/Fortschritt
```

`world-countries@5.1.0` bleibt eine gepinnte Build-Abhängigkeit. Der Build
erzeugt stabile Sprach-IDs aus ISO 639-3 und Währungs-IDs aus ISO 4217,
deutsche Anzeigenamen sowie akzeptierte Code- und englische Namensaliasse.
Das erzeugte App-Dataset ist versioniert und wird ohne Netzverbindung genutzt.

## Abnahme

- Alle 195 Länder besitzen mindestens eine Hauptstadt, Amtssprache und
  Währung.
- Eine korrekte Alternative in einem mehrwertigen Feld wird akzeptiert und
  alle Alternativen erscheinen in der Lösung.
- Richtige, teilweise richtige, falsche und aufgedeckte Profile werden
  serialisierbar gespeichert und nach einem Reload wiederhergestellt.
- Lernen zeigt die Lösung freiwillig, Üben hängt Fehler genau einmal an und
  Prüfung wertet erst am Ende aus.
- Desktop-Chromium und ein Pixel-7-Viewport bestehen Auswahl, Eingabe,
  Lösungsanzeige und Ergebnisfluss ohne Konsolenfehler.
