# Phase 8 – Sehenswürdigkeiten und Naturhighlights

## Ziel

Lernende erkennen ein dokumentarisches Foto und tippen den Namen des Motivs
ein. Nach der Bewertung zeigt die App Land, Stadt oder nächsten benannten Ort,
einen Funfact, eine präzise Besonderheit und die verwendeten Quellen.

## Vertikaler Schnitt

- 12 Motive: sechs gebaute Sehenswürdigkeiten und sechs Naturhighlights.
- Entitätstyp `landmark` mit stabiler ID, bevorzugtem deutschen Namen,
  akzeptierten Aliasen, Schwierigkeit und Kontinent-Scope.
- Komposition `landmark × visual_asset:landmark_photo × text_input × Gebiet ×
  Lernregeln`; Bewertung durch `text-v1`.
- Vier versionierte Fakten: Land, Stadt/nächster Ort, Funfact und Besonderheit.
- Lokal ausgelieferte Wikimedia-Commons-JPEGs mit Dateiseite, Urheber, Lizenz,
  Bytezahl und SHA-256 im Snapshot.
- Rundenlängen 6, 10 oder alle; deterministische Auswahl ohne Wiederholung.

## Daten- und Lizenzfluss

Der explizite Befehl `npm run content:refresh:landmarks` lädt die fest
eingetragenen 960-Pixel-Dateien. Er bricht ab, wenn Bytezahl oder Prüfsumme vom
geprüften Snapshot abweichen. `content:build` arbeitet anschließend offline,
prüft die Binärdateien erneut und erzeugt den lokalen Visual-Asset-Index. Die
Auflösung verlinkt sowohl die fachliche Quelle als auch Foto, Urheber und
Lizenz.

## Fachliche Regeln

- Naturstätten ohne Stadt erhalten einen ehrlichen nächsten Ausgangsort.
- Superlative nennen ihre Messgröße und Abgrenzung.
- Keine Live-API und kein zufälliger Austausch von Bildern unter stabiler ID.
- Das Bild-Alt vor der Antwort verrät die Lösung nicht; danach darf es den
  gelösten Namen enthalten.

## Abnahme

- Raw-Snapshot und generiertes Dataset validieren.
- Genau 12 Landmark-Entitäten, 48 Auflösungsfakten und 12 lokale JPEGs.
- Alle Fragen einer „alle“-Runde besitzen eindeutige `subjectId`s.
- Korrekte Texteingabe wird automatisch angenommen; Ort, Funfact,
  Besonderheit und Attribution werden danach sichtbar.
- Desktop- und Mobilfluss bestehen ohne schwerwiegende Accessibility- oder
  Konsolenfehler.
