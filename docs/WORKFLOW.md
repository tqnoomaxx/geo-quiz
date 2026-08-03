# Wiederverwendbarer Arbeitsablauf

Dieses Dokument ist die operative Checkliste für jede spätere Aufgabe.

## 1. Start jeder Aufgabe

1. `AGENTS.md`, `PRODUCT.md` und `DECISIONS.md` lesen.
2. Betroffene Phase und ihr Gate in `ROADMAP.md` bestimmen.
3. Betroffene Quizachsen, Entitäten, Datenquellen und Renderer benennen.
4. Prüfen, ob die Arbeit eine bestehende Entscheidung ändert.
5. Den kleinsten vertikalen Slice formulieren, der echten Nutzerwert liefert.

## 2. Slice-Brief

Vor der Umsetzung wird dieses kurze Schema ausgefüllt:

```md
## Slice: <Name>

- Nutzerziel:
- Phase/Gate:
- Thema und Scope:
- Prompt:
- Antwortmodus:
- Regeln:
- benötigte Entitäten/Relationen/Fakten:
- neue Datenquelle oder Asset:
- geänderte öffentliche Typen/Schemas:
- Erfolgskriterien:
- größte Risiken:
- explizit nicht enthalten:
```

Ein Slice ist erst bereit, wenn Testdaten und erwartete Bewertung benannt sind.

## 3. Neue Quizart

1. Kombination aus Inhalt, Prompt, Antwort, Scope und Regeln aufschreiben.
2. Mit einer vorhandenen `QuizDefinition` ausdrücken.
3. Prüfen, ob Entitätsrelationen und Grader existieren.
4. Nur fehlende, kleinste Erweiterung bauen:
   - zuerst Preset;
   - dann Prompt/Grader;
   - zuletzt Engine-Fähigkeit.
5. Feste Seed-Fixture mit mindestens korrekt, falsch, Timeout und Randfall.
6. Ergebnis-, Wiederholungs- und Fortschrittsdarstellung prüfen.
7. Kombination in die Matrix in `QUIZ_ENGINE.md` aufnehmen.

### Warnzeichen

- Eigene Session-Komponente nur für ein Thema.
- `if (quizType === "...")` über mehrere Layer verteilt.
- Fachliche Korrektheit in einem Click-Handler.
- Antwort hängt von sichtbarem Text oder Layerfarbe ab.
- Timer wird nur von einer Animation bestimmt.

## 4. Neuer Inhaltstyp

1. Typ, stabile IDs und fachliche Bedeutung definieren.
2. Relationen zu vorhandenen Entitäten festlegen.
3. Prompt- und Antwortmöglichkeiten auflisten.
4. Quelle, Lizenz, Snapshot und Attribution registrieren.
5. Importadapter plus kleine Rohdaten-Fixture erstellen.
6. Normalisierung und Verknüpfung implementieren.
7. Struktur-, Fach- und Regressionsvalidatoren ergänzen.
8. App-Artefakte und Manifest bauen.
9. Mindestens eine Runde durch die vorhandene Engine testen.
10. Datenstand und Attribution in der Oberfläche prüfen.

Ein Inhaltstyp ist nicht fertig, wenn er nur auf der Karte sichtbar ist. Er muss
fachlich bewertbar, testbar und rückverfolgbar sein.

## 4a. Neuer Mixed-Modus

1. Lernziel und erlaubte Quizpools benennen.
2. Gewichte, Mindest-/Höchstmengen und Frageanzahl definieren.
3. Wiederholungs- und Wechselregeln festlegen.
4. Verhalten bei zu kleinem Pool vor Rundenstart definieren.
5. Mit festem Seed Reihenfolge und Poolanteile testen.
6. Prüfen, dass der Scheduler keine fachliche Bewertung enthält.
7. Mixed-spezifische Abzeichen nur über AchievementDefinitionen ergänzen.

## 4b. Neues Wissenspuzzle

1. Natürlichsprachliche Frage in exakte Definition übersetzen.
2. Kandidaten, Relationen, Fakten, Einheit, Methode und Bezugszeit benennen.
3. Sichere Expression statt SQL oder Laufzeitcode schreiben.
4. Antwort beim Build berechnen.
5. Eindeutigkeit und Gleichstände testen.
6. Erklärung aus denselben Fakten generieren.
7. Quellenkette und Dataset-Version einbetten.
8. Frage verwerfen, wenn Definition oder Datenlage missverständlich bleibt.

## 4c. Neues Abzeichen

1. Lern- oder Motivationsziel benennen.
2. Vorhandene Familie und Dimensionen prüfen.
3. Event, Filter, Aggregation, Ziel und Zeitraum definieren.
4. Erreichbarkeit gegen reale Content- und Modusdefinitionen validieren.
5. stabile ID, Version, Übersetzung und Asset-Key vergeben.
6. Wiederaufbau aus Ereignissen sowie doppelte Events testen.
7. UI-Freischaltung und Barrierefreiheitsansage prüfen.

## 4d. Änderung an Account oder Sync

1. Offline-, Gast-, angemeldeten und Mehrgerätefall beschreiben.
2. Datenbesitz und RLS-Policy festlegen.
3. Idempotenzschlüssel und Konfliktregel definieren.
4. Migration und Rollback testen.
5. Zwei-Konten-Isolation automatisch prüfen.
6. Export und Löschung berücksichtigen.

## 5. Neuer Antwortmodus

Ein Antwortmodus benötigt:

- serialisierbares Antwort-Payload;
- zugängliche React-Eingabekomponente;
- versionierten, UI-unabhängigen Grader;
- Feedbackdarstellung;
- Tastatur- und Touchverhalten;
- Fehler-/Timeout-/Skip-Verhalten;
- Unit-Tests für Grenzfälle;
- Browser-Test einer vollständigen Runde;
- mobile visuelle Prüfung.

Map-Modi benötigen zusätzlich Kamera-, Hit-Zone- und Projektionstests.

## 6. Dataset-Update

1. Neue Rohdaten als unveränderlichen Snapshot laden.
2. Prüfsumme und Lizenzdaten erfassen.
3. Pipeline vollständig reproduzierbar ausführen.
4. Qualitätsbericht und Entity-Diff lesen.
5. Unerwartete Löschungen, ID-Wechsel und starke Wertänderungen klären.
6. Politisch sensible Änderungen manuell reviewen.
7. Preset-Kandidatenzahlen und feste Quiz-Seeds testen.
8. Neue Dataset-Version veröffentlichen.
9. Attribution/Datenstand prüfen.
10. Vorherige Version für historische Sessions erreichbar halten oder in der
    Session ausreichende Snapshots speichern.

## 7. Architekturentscheidung

Bei einer dauerhaften oder schwer rückgängig zu machenden Entscheidung wird vor
der Umsetzung ein Eintrag in `DECISIONS.md` ergänzt:

```md
### D-XXX – Titel

- Status: proposed | accepted | superseded
- Datum:
- Kontext:
- Entscheidung:
- Konsequenzen:
- Alternativen:
- Ersetzt:
```

Keine alte Entscheidung löschen. Eine neue Entscheidung verweist auf die
ersetzte.

## 8. Teststrategie

### Unit

- Fragengenerator, Seed und Kandidatenfilter.
- Jeder Grader mit Normal- und Grenzfällen.
- Scoring und Timerereignisse.
- Mixed-Scheduler mit Gewichten, Grenzen und festen Seeds.
- Wissenspuzzle-Compiler mit Eindeutigkeit und Gleichständen.
- Achievement-Regeln mit doppelten und verspäteten Events.
- Geometrie-/Distanzfunktionen.
- Lernstand-Aktualisierung.

### Daten-Contracts

- Manifest und jedes Artefakt gegen Schema.
- IDs, Relationen, Aliasse und Geometrien.
- Presets gegen reale Kandidatenzahl.
- Mixed-Definitionen gegen verfügbare Poolgrößen.
- Wissenspuzzles gegen Faktenquelle, Erklärung und Antwortanzahl.
- Achievement-Definitionen gegen Eventschemas, Erreichbarkeit und Assets.
- Lizenz- und Attributionsfelder vorhanden.
- stabile Referenzfälle pro Dataset-Version.

### React-Integration

- Setup erzeugt erwartete Definition.
- Frage rendert korrekt und sendet Payload.
- Feedback- und Ergebniszustände.
- Fokusführung, Live-Region und Eingabesperre.
- Persistenz und Wiederaufnahme.
- Gastübernahme, Syncstatus und Abzeichensammlung.

### Browser-End-to-End

- Mindestens ein kompletter Pfad je Antwortmodus.
- Desktop und ein schmales Touch-Viewport.
- Timer/Timeout, Pause/Aufgabe und Neuladen.
- Offlinepfad, sobald PWA-Scope erreicht ist.
- Kontoerstellung, Gastimport und erneuter idempotenter Sync.
- Konsole, Netzwerkfehler und fehlende Assets prüfen.

### Fachliche manuelle QA

- Stichprobe pro Kontinent und Inhaltstyp.
- kleine Inselstaaten, Stadtstaaten, MultiPolygone.
- ähnlich benannte Städte/Länder.
- Akzente, Bindestriche und akzeptierte deutsche Namen.
- nahe Hauptstadtpunkte.
- umstrittene Gebiete und mehrfache Hauptstadtrollen.

## 9. Definition of Ready

- Nutzerziel und Nicht-Ziele klar.
- Roadmap-Phase und Gate klar.
- Datenquelle und Lizenz geklärt.
- Schemaänderungen benannt.
- feste Test-Fixture vorhanden oder geplant.
- Responsive und Barrierefreiheitsverhalten beschrieben.
- keine ungeklärte Entscheidung mit großem Folgerisiko.

## 10. Definition of Done

- Erfolgskriterien erfüllt.
- Typecheck, Lint und Tests grün.
- Dataset-Contracts und feste Seeds grün.
- Kernpfad im echten Browser durchgespielt.
- Desktop und Mobil visuell geprüft.
- Tastatur, Fokus und Feedbackansage geprüft.
- keine unnötige Themen-Sonderlogik.
- relevante Dokumente, Roadmap und Entscheidungen aktualisiert.
- keine temporären QA-Artefakte oder Platzhalter.

## 11. Review-Fragen

- Könnte dasselbe Feature mit einem anderen Thema ohne Kopieren funktionieren?
- Ist die fachliche Wahrheit unabhängig vom Renderer?
- Kann eine alte Session später noch erklärt werden?
- Sind Quelle, Lizenz und Datenstand sichtbar?
- Ist ein Fehler für Lernende nachvollziehbar und fair?
- Funktioniert die primäre Aufgabe mit Daumen und Tastatur?
- Was ist der kleinste nächste Slice nach diesem?
