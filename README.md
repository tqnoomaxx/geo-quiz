# Geographie

Responsive Lern- und Quizplattform für Länder, Währungen, Sehenswürdigkeiten und das Sonnensystem. Fortschritt, Punkte, Statistiken, Lernverlauf und Erfolge werden lokal im Browser gespeichert.

## Funktionen

- Länderquiz mit Hauptstadt, Erhebung, Fluss, Sprache und Währung
- Eigenes Währungsquiz mit allen 197 Ländern
- Sehenswürdigkeiten-Quiz mit 174 bebilderten Orten
- Planeten-, Monde- und Zwergplaneten-Quiz
- Lernkarten mit gewichteter Wiederholung für unsichere Antworten
- Wiederholung übersprungener Quizfragen innerhalb der Lernrunde
- Statistiken mit Lernfortschritt, schwierigen Fragen und letzten Lernkarten
- Helles und dunkles Design, responsive Navigation und reduzierte Animationen bei Bedarf
- Tolerante Antworterkennung für Groß-/Kleinschreibung, Akzente, Umlaute und alternative Schreibweisen

## Lokal starten

Voraussetzung: Node.js 20.19 oder neuer.

```bash
npm ci
npm run dev
```

Die lokale Anwendung läuft anschließend unter `http://localhost:5173`.

## Qualität prüfen

```bash
npm run check
```

Der Check umfasst Daten- und Antworttests, den Produktions-Build sowie Browser-Tests in Desktop- und Mobilansicht.

## Veröffentlichung

Jeder Push auf `main` baut die Anwendung über GitHub Actions und veröffentlicht `dist` automatisch auf GitHub Pages. Die Vite-Konfiguration verwendet relative Asset-Pfade und funktioniert dadurch sowohl unter einer Repository-URL als auch mit einer späteren Custom-Domain.

## Inhalte erweitern

Die Lerninhalte liegen unter `src/data/*.json`. Sehenswürdigkeitsbilder können über das Feld `image` oder über `public/landmarks/<id>.jpg` bereitgestellt werden. Das Hilfsskript `scripts/fetch-images.mjs` ergänzt fehlende Wikipedia-Bild-URLs.
