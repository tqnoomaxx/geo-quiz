Prompt: Interaktive Lern- und Quizplattform

Ich möchte eine moderne, responsive Lern- und Quizplattform als Webanwendung entwickeln. Das Design soll modern, übersichtlich und motivierend sein (ähnlich Duolingo, JetPunk und Sporcle, aber mit einem eigenen Stil).

Allgemeine Anforderungen

* Responsive für Desktop, Tablet und Smartphone
* Helles und dunkles Design
* Moderne Animationen und flüssige Übergänge
* Lokale Speicherung des Lernfortschritts
* Punktesystem
* Statistiken
* Erfolge (Achievements)
* Lernmodus und Quizmodus
* Wiederholung falsch beantworteter Fragen
* Schnelle Ladezeiten
* Saubere Komponentenstruktur

⸻

Startseite

Große Kacheln für verschiedene Themen:

🌍 Länder

🪐 Sonnensystem

Später leicht erweiterbar für weitere Themen wie Geschichte, Tiere, Chemie, Flaggen usw.

⸻

Länder

Quizmodus “Länderwissen”

Das Land wird vorgegeben.

Der Benutzer muss nacheinander eingeben:

* Hauptstadt
* Höchste Erhebung
* Längster Fluss
* Amtssprache(n)
* Währung

Es gibt nur EIN Eingabefeld.

Nach jeder Eingabe wird automatisch geprüft, ob die Antwort zu einer noch nicht gelösten Kategorie gehört.

Ist sie richtig:

* wird nur diese Kategorie aufgedeckt
* erscheint eine kleine Erfolgsanimation
* wird die Eingabe geleert

Bereits gelöste Kategorien dürfen nicht erneut gezählt werden.

Mehrere Schreibweisen sollen akzeptiert werden.

Beispiele:

* Neu Delhi / Neu-Delhi
* Côte d’Ivoire / Elfenbeinküste
* USA / Vereinigte Staaten

Umlaute, Bindestriche und Groß-/Kleinschreibung sollen tolerant behandelt werden.

⸻

Lernmodus Länder

Es werden alle Informationen einer Karte angezeigt.

Der Benutzer kann auswählen:

* Gewusst
* Unsicher
* Nicht gewusst

Unsichere und falsche Karten erscheinen häufiger.

⸻

Sehenswürdigkeiten

Eigenständiger Quizmodus.

Jedes Land besitzt mehrere Sehenswürdigkeiten.

Nicht nur Bauwerke, sondern auch:

* Naturwunder
* Nationalparks
* UNESCO-Welterbestätten
* Inseln
* Wasserfälle
* Berge
* Schluchten
* Wahrzeichen

Beispiele:

Indien

* Taj Mahal
* Golden Temple
* Rotes Fort
* Hawa Mahal
* Gateway of India

Frankreich

* Eiffelturm
* Louvre
* Mont-Saint-Michel
* Schloss Versailles
* Triumphbogen

Türkei

* Hagia Sophia
* Pamukkale
* Kappadokien
* Ephesos
* Nemrut Dağı

Venezuela

* Salto Ángel
* Canaima
* Tepuis
* Los Roques

Jedes Land sollte möglichst 3–5 Sehenswürdigkeiten besitzen, bekannte Länder gerne mehr.

Der Quizmodus soll zufällig eine Sehenswürdigkeit als Bild anzeigen.

Der Benutzer muss:

* das Land erraten

Optional später:

* zusätzlich den Namen der Sehenswürdigkeit

Im Lernmodus werden Bild, Name und kurze Beschreibung angezeigt.

⸻

Sonnensystem

Planeten und Monde

Planet wird angezeigt.

Der Benutzer gibt die wichtigsten Monde ein.

Bei Planeten mit vielen Monden werden nur die wichtigsten bzw. größten abgefragt.

Beispiele:

Jupiter

* Io
* Europa
* Ganymed
* Kallisto

Saturn

* Titan
* Rhea
* Iapetus
* Dione

Mars

* Phobos
* Deimos

Ebenso die wichtigsten Zwergplaneten.

⸻

Eigenschaften

Eigener Quizmodus.

Zum Beispiel:

Jupiter

Gesucht:

* Planetentyp
* Reihenfolge zur Sonne
* Ringsystem
* Größter Mond
* Umlaufzeit
* Rotationsdauer
* Durchmesser (mit Toleranz)
* Durchschnittstemperatur

Auch hier wird jede richtige Antwort einzeln aufgedeckt.

⸻

Lernmodus Sonnensystem

Karten mit:

* Bild
* Eigenschaften
* Monde
* Besonderheiten

⸻

Erfolge

Beispiele:

🏆 Europa-Experte

🏆 Weltkenner

🏆 Sonnenmeister

🏆 100 Sehenswürdigkeiten erkannt

🏆 Alle Planeten gemeistert

⸻

Statistiken

Anzeigen:

* richtige Antworten
* falsche Antworten
* Erfolgsquote
* Lernfortschritt
* schwierigste Fragen
* zuletzt gelernte Themen

⸻

Datenstruktur

Die Anwendung soll datengetrieben aufgebaut sein.

Neue Themen sollen einfach durch JSON-Dateien ergänzt werden können.

Beispielsweise:

countries.json

landmarks.json

planets.json

moons.json

dwarf_planets.json

Dadurch soll das Projekt später ohne großen Programmieraufwand erweitert werden können.

⸻

Ziel

Das Projekt soll sich wie eine hochwertige Lernplattform anfühlen und nicht wie ein einfaches Frage-Antwort-Spiel.

Der Schwerpunkt liegt auf Motivation, Übersichtlichkeit, intuitiver Bedienung und langfristigem Lernen. Der Code soll sauber strukturiert, gut dokumentiert und leicht erweiterbar sein.