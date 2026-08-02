# Sehenswürdigkeiten-Bilder

Lege hier Bilder für Sehenswürdigkeiten ab. Zwei Möglichkeiten:

1. **Datei nach ID benennen** (empfohlen): Die App sucht automatisch nach
   `/landmarks/<id>.jpg`. Beispiel: für die Sehenswürdigkeit mit `"id": "eiffelturm"`
   lege `public/landmarks/eiffelturm.jpg` ab. Erlaubt: `.jpg`.

2. **URL/Pfad direkt setzen**: In `src/data/landmarks.json` das Feld `"image"`
   auf eine URL oder einen Pfad setzen, z. B.
   `"image": "https://…/eiffel.jpg"` oder `"image": "/landmarks/eiffelturm.png"`.

Fehlt ein Bild, zeigt die App automatisch einen Platzhalter mit Emoji.
