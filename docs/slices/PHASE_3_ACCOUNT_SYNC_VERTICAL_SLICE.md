# Phase 3 – Account-, Sync- und Abzeichen-Slice

## Ziel

Dieser Slice macht den bestehenden lokalen Lernstand synchronisierbar, ohne
Quizrunden oder GitHub Pages von einem Backend abhängig zu machen. Er liefert:

- eine stabile lokale Gastidentität aus Installation, Gerät und Profil,
- eine atomar mit Fortschrittsereignissen befüllte Offline-Outbox,
- einen optional geladenen Supabase-Adapter für E-Mail-Einmalcodes,
- einen idempotenten, transaktionalen Serverimport mit Row Level Security,
- eine generische Achievement Engine mit ersten konfigurierten Familien,
- Abzeichen- und Kontoseiten sowie einen versionierten JSON-Export.

Ohne öffentliche Supabase-URL und Publishable Key bleibt die App vollständig
als Gast nutzbar. Es wird weder eine Identität erfunden noch ein Serveraccount
still angelegt.

## Vertikaler Ablauf

```text
Quizversuch
   │ eine IndexedDB-Transaktion
   ├── progress-events
   ├── sync-outbox
   └── achievement-unlocks (lokal geprüft)
             │
             ▼
E-Mail + Einmalcode ── AuthAdapter ── authentifiziertes Profil
             │
             ▼
import_progress_batch(import_batch_id, installation_id, events, unlocks)
             │ atomare Postgres-Funktion, ON CONFLICT
             ▼
RLS-geschützte Vereinigung des Serverstands
             │
             ▼
lokaler Merge → bestätigte Outbox-Einträge entfernen → Gastprofil verknüpfen
```

## Browser-Schema v3

Version 3 ergänzt das Phase-2-Schema, ohne bestehende Sessions zu entfernen:

| Object Store | Schlüssel | Zweck |
|---|---|---|
| `identity` | `key` | stabile lokale Identität und optionale Kontoverknüpfung |
| `sync-outbox` | Ereignis-ID | noch nicht serverbestätigte Progress Events |
| `achievement-unlocks` | Achievement-ID | lokale oder serverbestätigte Freischaltung |
| `sync-state` | `key` | stabile Import-Batch-ID je Zielkonto |

Eine abgeschlossene Session schreibt Session, Progress Events, Outbox und neue
Freischaltungen in einer Transaktion. Alte `progress-events` werden vor dem
ersten Sync in die Outbox zurückgefüllt; stabile IDs verhindern Duplikate.

## Adaptergrenzen

`AuthAdapter` kapselt Session, OTP-Anforderung, OTP-Prüfung und Abmeldung.
`SyncAdapter` akzeptiert nur serialisierbare lokale Ereignisse und
Freischaltungen. Die Quiz-Engine kennt weder Supabase noch Netzwerkzustand.

Der Supabase-Client wird erst auf der Kontoseite dynamisch importiert und nur
erstellt, wenn beide öffentlichen Buildvariablen gesetzt sind:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Secret- und Service-Role-Schlüssel sind im Browser verboten.

## Gastübernahme und Konflikte

1. Der Nutzer bestätigt den Einmalcode.
2. Der Client lädt Identität, sämtliche lokalen Progress Events,
   Freischaltungen und die stabile `import_batch_id`.
3. `import_progress_batch` prüft `auth.uid()`, registriert das Gerät und führt
   den Batch innerhalb einer Datenbanktransaktion aus.
4. Ereignisse werden mit `on conflict do nothing` vereinigt.
5. Bei Freischaltungen gewinnt der früheste belegte Zeitpunkt.
6. Der Client liest den eigenen Serverstand zurück und merged nach stabilen IDs.
7. Erst danach werden bestätigte Outbox-Einträge entfernt und die lokale
   Identität mit dem Account verknüpft.

Ein Verbindungsabbruch vor Schritt 7 lässt den lokalen Stand unangetastet. Ein
erneuter Aufruf mit derselben Batch-ID und denselben Ereignis-IDs ist
wirkungsgleich.

## Achievement Contract v1

Definitionen sind Daten. Die Engine unterstützt in diesem Slice:

- Ereignisanzahl,
- Anzahl korrekter Antworten,
- Anzahl verschiedener korrekt gelöster Entitäten,
- perfekte Einzelsession ab einer Mindestlänge.

Optionale Skill-Präfixe grenzen Familien auf Länder oder Hauptstädte ein.
Neue Standardabzeichen entstehen aus einer weiteren validierten Definition,
nicht aus UI- oder Session-Sonderlogik. Lokale Freischaltungen sind sofort
sichtbar und als `local` markiert; ein Servermerge kann sie als `server`
bestätigen.

## Erste Definitionen

- erste abgeschlossene Runde,
- 10 und 50 korrekte Länderantworten,
- 10 und 50 korrekte Hauptstadtantworten,
- 100 beantwortete Fragen,
- eine perfekte Runde mit mindestens zehn Fragen.

## Postgres-Sicherheitsgrenze

Die Migration legt `profiles`, `devices`, `progress_events`,
`achievement_unlocks` und `sync_import_batches` an. Für jede Tabelle gilt:

- RLS ist aktiviert,
- Policies gelten ausdrücklich nur für `authenticated`,
- Besitz wird mit `(select auth.uid()) = profile_id` geprüft,
- `with check` schützt Schreibzugriffe,
- `profile_id` und relevante Fremd-/Abfrageschlüssel sind indiziert,
- Funktionsausführung ist für `anon` und `public` entzogen.

Die Muster folgen der offiziellen
[Supabase-RLS-Dokumentation](https://supabase.com/docs/guides/database/postgres/row-level-security).
OTP-Aufruf und Prüfung folgen
[`signInWithOtp`](https://supabase.com/docs/reference/javascript/auth-signinwithotp)
und [`verifyOtp`](https://supabase.com/docs/reference/javascript/auth-verifyotp).

## Abnahme

Lokal automatisierbar:

- IndexedDB 2 → 3 erhält vorhandene Daten,
- eine Session erzeugt keine doppelten Outbox- oder Unlock-Datensätze,
- gleiche Ereignismengen ergeben unabhängig von Reihenfolge und Duplikaten
  dieselben Abzeichen,
- neue Definitionen benötigen keine Engineänderung,
- der JSON-Export ist versioniert und enthält Identität, Ereignisse und
  Freischaltungen,
- die App funktioniert ohne Backendkonfiguration weiter,
- Account- und Abzeichenseite sind über Root- und Pages-Unterpfad erreichbar,
- Migration und RLS-Grundmuster bestehen Contract-Tests.

Externes Phase-3-Gate:

- Migration in einem echten Supabase-Projekt anwenden,
- zwei reale Konten gegeneinander auf Lese- und Schreibisolation prüfen,
- Gastimport und Wiederholung auf mindestens zwei Geräten testen,
- OTP-Zustellung mit konfiguriertem SMTP prüfen,
- serverseitige Neuberechnung beziehungsweise Verifikation der Achievements
  ergänzen und abnehmen,
- privilegierten, dokumentierten Kontolöschpfad bereitstellen.

## Bewusste Grenzen

- GitHub Pages hostet weiterhin nur die statische App.
- Ohne Supabase-Projekt wird kein erfolgreicher Cloud-Sync behauptet.
- Der Phase-3-Slice synchronisiert zunächst die vorhandenen
  `progress-event-v1` und Freischaltungen; aktive Sessionbranches,
  Einstellungen und Mastery folgen auf demselben Adaptervertrag.
- Bestehende Ereignis-IDs bleiben aus Kompatibilitätsgründen textuell. Eine
  spätere UUIDv7-Hülle darf die fachliche ID nicht rückwirkend brechen.
