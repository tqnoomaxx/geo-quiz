# GeoApp Designsystem v0

## Richtung

Ein ruhiger, redaktioneller Atlas statt futuristischer Spieloberfläche:

- viel Weißraum;
- starke, klare Typografie;
- Karte als primärer visueller Inhalt;
- blasses Ozeanblau und Salbeigrün für Geographie;
- tiefes Petrol nur für Auswahl und Hauptaktionen;
- feine Linien, minimale Schatten;
- keine Glows, Glassmorphism, 3D-Illustrationen oder dekorativen KI-Motive.

## Konzeptreferenzen

- [`concepts/geoapp-home-desktop.png`](concepts/geoapp-home-desktop.png)
- [`concepts/geoapp-map-quiz-desktop.png`](concepts/geoapp-map-quiz-desktop.png)
- [`concepts/geoapp-text-quiz-mobile.png`](concepts/geoapp-text-quiz-mobile.png)
- [`concepts/geoapp-results-desktop.png`](concepts/geoapp-results-desktop.png)
- [`REVIEW.md`](REVIEW.md) mit realen Browser-Renderings und Abweichungen

Die Mockups sind Referenzen für Hierarchie, Dichte, Farbe und Komponenten. Alle
sichtbaren UI-Elemente werden code-native umgesetzt.

## Zentrale Tokens

Alle Komponenten verwenden semantische CSS Custom Properties. Keine Komponente
enthält frei erfundene Markenfarben oder Abstände.

```css
:root {
  --color-canvas: #ffffff;
  --color-surface: #f7f9fb;
  --color-ink: #0b2141;
  --color-muted: #5d6979;
  --color-border: #d8e0e7;
  --color-accent: #087680;
  --color-accent-hover: #065f68;
  --color-ocean: #dceff7;
  --color-land: #cfddc7;
  --color-success: #2f7d5b;
  --color-danger: #d73543;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --shadow-raised: 0 0.5rem 1.5rem rgb(11 33 65 / 8%);

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-md: 1rem;
  --text-lg: 1.25rem;
  --text-xl: clamp(1.5rem, 2.4vw, 2rem);
  --text-display: clamp(2.4rem, 5vw, 4.5rem);

  --motion-fast: 120ms;
  --motion-normal: 180ms;
}
```

Ein späteres Redesign soll hauptsächlich diese Tokens, Typografie und wenige
Komponentenvarianten ändern können.

## Typografie

- System-Sans-Stack ohne externen Font-Request im Phase-0-Spike.
- Überschriften: 700–760 Gewicht, eng, aber nicht komprimiert.
- Fließtext und Controls: 450–600.
- Controls bekommen explizite Größe und Zeilenhöhe; keine Browser-Defaults.
- Maximal zwei primäre Typostimmen: Display und UI/Content.

## Container

- Header: ruhige horizontale Linie, maximal eine Aktion rechts.
- Home: offene Zweispaltenstruktur mit vertikaler Trennlinie.
- Quiz: schmale Fragenleiste und dominante Karte.
- Ergebnis: typographische Zusammenfassung plus offene Fehlerliste.
- Karten und Panels nur dort rahmen, wo Auswahl oder Gruppierung es erfordert.
- Mobile: eine Spalte; Frage und Antwort vor der Karte.

## Komponentenfamilien

- `AppHeader`
- `TopicList` / `TopicRow`
- `SelectField`
- `Button` mit `primary`, `secondary`, `text`
- `ProgressRail`
- `QuestionPanel`
- `MapSurface`
- `TextAnswer`
- `FeedbackPanel`
- `ResultSummary`
- `ErrorList`
- `AchievementRow`

## Iconregeln

- einheitliche Outline-Icons;
- etwa 1.75 px Strichstärke;
- optisch 20–24 px in normalen Controls;
- `currentColor`;
- keine dekorativen Iconcontainer ohne Funktion.

## Bewegung

- nur kurze Farbübergänge, Fokus, Feedback und kleine Kartenbewegungen;
- keine schwebenden Elemente oder kontinuierliche Dekoration;
- `prefers-reduced-motion` schaltet nicht notwendige Bewegung ab.

## Copy-Lock für den Phase-0-Spike

Oberhalb des ersten Scrollbereichs sind nur diese Kernaussagen vorgesehen:

- `GeoApp`
- `Lernen`
- `Fortschritt`
- `Abzeichen`
- `Anmelden`
- `Die Welt Schritt für Schritt lernen.`
- `Wähle ein Thema und starte eine kurze Runde.`
- `Quiz starten`

Der technische Spike darf fachlich notwendige Quizfragen und
Feedbackformulierungen ergänzen.
