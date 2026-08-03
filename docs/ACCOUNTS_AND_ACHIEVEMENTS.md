# Accounts, Spielstände, Erfolge und Abzeichen

## Ziele

- Sofort ohne Registrierung spielen.
- Fortschritt lokal zuverlässig speichern.
- Gastfortschritt später verlustfrei in ein Konto übernehmen.
- Auf mehreren Geräten synchronisieren.
- Erfolge und Abzeichen für praktisch alle Themen und Modi ermöglichen, ohne
  tausende fest codierte Bedingungen.
- Persönliche Daten strikt pro Konto schützen.

## Umgesetzter Phase-3-Slice

Der erste Account-/Sync-Schnitt ist als optionaler vertikaler Slice vorhanden:

- IndexedDB v3 speichert `installation_id`, `device_id`,
  `local_profile_id`, Offline-Outbox und lokale Freischaltungen.
- Eine abgeschlossene Session schreibt Progress Event, Outbox und neue
  Freischaltungen atomar.
- Der Gast kann einen versionierten JSON-Export herunterladen.
- `AuthAdapter` und `SyncAdapter` trennen Quiz-/Persistenzlogik von Supabase.
- E-Mail-OTP nutzt `signInWithOtp` und `verifyOtp`; der Client wird nur bei
  gesetzter öffentlicher URL und Publishable Key dynamisch geladen.
- Die Migration
  `supabase/migrations/202607300001_phase3_account_sync.sql` enthält
  Nutzertabellen, Indizes, RLS-Policies, minimale Grants und den
  transaktionalen RPC `import_progress_batch`.
- Die Achievement Engine unterstützt Zählung, korrekte Antworten, verschiedene
  Entitäten, abgeschlossene und perfekte Sessions über Konfiguration.
- Sammlung und Ergebnisansicht unterscheiden lokale von serverbestätigten
  Freischaltungen.

Die lokale und statische Abnahme ist umgesetzt. Ein reales Supabase-Projekt,
Zwei-Konten-Isolation, SMTP/OTP-Zustellung, serverseitige Neuberechnung der
Abzeichen und Kontolöschung bleiben externe Gates. Details und Abnahme stehen
in
[`slices/PHASE_3_ACCOUNT_SYNC_VERTICAL_SLICE.md`](slices/PHASE_3_ACCOUNT_SYNC_VERTICAL_SLICE.md).

## Identitätsstufen

```text
lokaler Gast
    │ Konto erstellen / anmelden
    ▼
authentifiziertes Konto
    │ optional weitere Identitäten verknüpfen
    ▼
ein Profil auf mehreren Geräten
```

### Lokaler Gast

- Beim ersten Start entstehen `installation_id`, `device_id` und
  `local_profile_id`.
- Quizsessions, Versuche, Einstellungen und vorläufige Abzeichen liegen in
  IndexedDB.
- Der Gast kann Fortschritt exportieren.
- Es gibt keine erfundene E-Mail und keinen still erzeugten Serveraccount.

### Konto

- Zielbackend: Supabase Auth + Postgres hinter einem `AuthAdapter`.
- Startoptionen: E-Mail-Magic-Link oder Einmalcode; soziale Logins können später
  ergänzt werden.
- `public.profiles.id` referenziert die stabile ID aus `auth.users`.
- Authentifizierung und fachliches Profil bleiben getrennt.

### Gastübernahme

1. Konto erfolgreich erstellen oder anmelden.
2. Lokales Exportpaket validieren.
3. Für die Migration eine stabile `import_batch_id` erzeugen.
4. Ereignisse idempotent hochladen.
5. Server leitet Statistiken, Mastery und Abzeichen neu ab.
6. Serverergebnis wieder lokal spiegeln.
7. Migration als abgeschlossen markieren.
8. Lokale Daten erst nach bestätigter Übernahme als kontogebunden markieren,
   nicht löschen.

Wiederholtes Ausführen derselben Migration erzeugt keine doppelten Versuche oder
Abzeichen.

## Was gespeichert wird

| Bereich | Beispiele |
|---|---|
| Profil | Anzeigename, Sprache, Erstellungsdatum |
| Einstellungen | Sound, Bewegung, Timerpräferenz, Kartenoptionen |
| Sessions | Quizdefinition, Dataset-Version, Seed, Status, Punktestand |
| Antworten | Frage-Snapshot, Antwort, Bewertung, Reaktionszeit |
| Lernstand | Stärke pro Entität und Skill, nächste Wiederholung |
| Erfolge | Fortschritt und Freischaltzeit |
| Serien | Aktivitätstag, aktuelle und beste Serie |
| Sammlungen | eigene Lernlisten und favorisierte Presets |

Nicht gespeichert werden Renderer-Objekte, MapLibre-Instanzen oder flüchtige
Animationen.

## Synchronisationsprinzip

Unveränderliche Ereignisse sind die Grundlage:

```ts
interface ProgressEvent {
  id: string;             // zeit-sortierbare, clientseitig erzeugte UUID
  userId?: string;
  deviceId: string;
  type: ProgressEventTypeId;
  occurredAt: string;
  schemaVersion: number;
  payload: unknown;
}
```

Das gezeigte Envelope ist das Zielschema. Die bereits in Phase 2 ausgelieferten
`progress-event-v1` behalten kompatibel ihre textuelle ID
`progress:<attempt-id>` und ihre flachen, typisierten Felder. Der Server weist
das authentifizierte `profile_id` selbst zu und vertraut keinem vom Client
gesendeten Nutzerfeld.

`ProgressEventTypeId` wird gegen eine versionierte Event-Registry validiert.
Jeder Eventtyp besitzt ein Payload-Schema und eine Datenschutzklassifikation.
Neue Themen verwenden in der Regel weiterhin `question_answered`; neue
Fortschrittsmechaniken können einen neuen Eventtyp ergänzen, ohne den
Sync-Envelope zu ändern.

- Upload per `insert ... on conflict do nothing`.
- Sessions und Antworten werden als Vereinigungsmenge stabiler Ereignis-IDs
  zusammengeführt.
- Freigeschaltete Abzeichen bleiben freigeschaltet; frühester belegter
  Zeitpunkt gewinnt.
- Mastery, Statistiken und Achievement-Fortschritt sind aus Ereignissen
  wiederaufbaubar.
- Einstellungen verwenden je Schlüssel eine Version/Zeit plus Geräte-ID als
  deterministischen Tie-Breaker.
- Eine aktive Session verwendet `revision` für optimistische Nebenläufigkeit.
  Bei echter paralleler Fortsetzung bleiben zwei Branches sichtbar, statt
  Antworten zu verlieren.

## Vorgesehenes Kontoschema

### `profiles`

| Feld | Typ |
|---|---|
| `id` | uuid, PK und FK auf `auth.users(id)` |
| `display_name` | text |
| `locale` | text |
| `created_at`, `updated_at` | timestamptz |

### `devices`

| Feld | Typ |
|---|---|
| `id` | uuid |
| `profile_id` | uuid, FK |
| `installation_id` | uuid |
| `label` | text optional |
| `last_seen_at` | timestamptz |

Eindeutig: `(profile_id, installation_id)`.

### `progress_events`

| Feld | Typ |
|---|---|
| `id` | uuid, PK |
| `profile_id` | uuid, FK |
| `device_id` | uuid, FK |
| `event_type` | text mit Check Constraint |
| `occurred_at` | timestamptz |
| `schema_version` | integer |
| `payload` | jsonb |
| `received_at` | timestamptz |

Indizes:

- `(profile_id, occurred_at desc)`
- `(profile_id, event_type, occurred_at desc)`
- Foreign Keys einzeln, falls nicht durch den zusammengesetzten Index abgedeckt.

### Weitere Nutzertabellen

- `quiz_sessions`
- `question_attempts`
- `mastery`
- `user_settings`
- `achievement_progress`
- `achievement_unlocks`
- `streak_state`
- `custom_quiz_presets`

Die Basistabellen bleiben normalisiert. Flexible, versionierte Ereignis-Payloads
dürfen `jsonb` sein; häufig gefilterte Felder werden als echte Spalten geführt.

## Sicherheit

- RLS ist auf jeder exponierten Nutzertabelle aktiviert.
- Policies gelten explizit nur für `authenticated`.
- Grundmuster:

```sql
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = profile_id
)
```

- `profile_id` ist für RLS und Abfragen indiziert.
- `with check` schützt Inserts/Updates zusätzlich.
- Service-/Secret-Schlüssel sind niemals im Browser.
- Öffentliche Content- und Achievement-Definitionen sind lesbar, aber nur durch
  den Build-/Administrationsprozess schreibbar.
- Kontolöschung entfernt oder anonymisiert alle persönlichen Daten nach einer
  dokumentierten Retention-Regel.

## Achievement-System

### Zwei Ebenen

1. **Familien:** systematisch erzeugbare Abzeichen für Themen, Regionen, Modi
   und Stufen.
2. **Spezialabzeichen:** wenige kuratierte, charaktervolle Herausforderungen.

So kann es „Abzeichen für alles“ geben, ohne jedes einzeln zu programmieren.

### AchievementDefinition

```ts
interface AchievementDefinition {
  id: string;
  version: number;
  familyId?: string;
  titleKey: string;
  descriptionKey: string;
  badgeAssetKey: string;
  visibility: "visible" | "secret";
  tier?: "bronze" | "silver" | "gold" | "platinum";

  rule: {
    eventType: string;
    filters: Array<{
      field: string;
      op: "eq" | "in" | "gte" | "lte";
      value: string | number | string[];
    }>;
    aggregate:
      | "count"
      | "distinct_entity_count"
      | "streak"
      | "best_score"
      | "total_score"
      | "minimum_response_time";
    target: number;
    window?: "all_time" | "single_session" | "day" | "week";
  };
}
```

Regeln werden beim Build validiert und von einer zentralen
`AchievementEngine` ausgewertet.

## Abzeichenfamilien

| Familie | Beispiele |
|---|---|
| Entdecken | erste Runde, jedes Thema einmal, jeder Kontinent |
| Länder | 25/50/100/alle Länder erkannt |
| Hauptstädte | 25/50/100/alle Hauptstädte |
| Flaggen | Bronze/Silber/Gold nach Umfang und Trefferquote |
| Flüsse | regionale und globale Meisterschaft |
| Gebirge/Gipfel | Karten- und Namensmeisterschaft |
| Städte | Top 100/250/500/1000 |
| Präzision | Kartenpunkte innerhalb definierter Kilometer |
| Geschwindigkeit | korrekte Serien unter Zeitgrenze |
| Serien | 5/10/25/50 richtige Antworten nacheinander |
| Ausdauer | Marathon beendet |
| Weltmix | verschiedene Themen in einer Runde gemeistert |
| Wissenspuzzle | 10/50/100 zusammengesetzte Fragen |
| Lernen | Fehler später korrekt beantwortet |
| Regionen | Europa, Afrika, Asien, Amerika, Ozeanien |
| Kontinuität | Aktivitätsserien, ohne unfaire Zeitzonenlogik |

Seit Phase 5 sind `Flussfinder`, `Seenkenner`, `Meeresblick`,
`Gebirgskenner` und `Gipfelstürmer` als Bronze-Familien ausführbar. Jede Regel
zählt zehn korrekte Fortschrittsereignisse anhand des generischen
Skill-Präfixes; Karten- und Textrichtung fließen in dieselbe Themenfamilie ein.

### Generierte Familien

Ein Template kann pro Thema und Stufe Definitionen erzeugen:

```json
{
  "familyId": "mastery-by-topic",
  "dimensions": {
    "topic": ["countries", "capitals", "flags", "rivers", "ranges"],
    "tier": [
      { "name": "bronze", "target": 25 },
      { "name": "silver", "target": 100 },
      { "name": "gold", "target": 250 }
    ]
  }
}
```

Der Build erzeugt daraus einzelne stabile Achievement-IDs und prüft auf
doppelte oder unerreichbare Regeln.

## Freischaltung

1. Fortschrittsereignis wird lokal gespeichert.
2. Achievement Engine aktualisiert betroffene Regeln inkrementell.
3. Neue Freischaltung erhält stabile ID und Zeitpunkt.
4. UI darf lokal sofort gratulieren.
5. Nach Konto-Sync prüft der Server die Freischaltung erneut.
6. Für rein persönliche Abzeichen genügt das Ergebnis; für Ranglisten zählt nur
   serverbestätigter Fortschritt.

Die UI verteilt keine Abzeichen direkt aus einem Button-Click.

## Abzeichenassets

- Jede Definition referenziert `badgeAssetKey`, niemals einen Dateipfad.
- Ein konsistentes visuelles System enthält Form, Rand, Tiermaterial, Thema und
  optional Region.
- Text steht außerhalb des Raster-/SVG-Abzeichens, damit Übersetzungen und
  Barrierefreiheit funktionieren.
- Fehlendes Asset blockiert den Achievement-Content-Build.

## Datenschutz und Fairness

- Streaks verwenden die Profilzeitzone mit dokumentierter Wechselregel.
- Geheime Abzeichen dürfen keine gesundheits- oder zwangsfördernden
  Anforderungen enthalten.
- Keine Belohnung für absichtlich endloses Spielen.
- Account-Erstellung ist kein Achievement und kein Lernvorteil.
- Offline erreichte Fortschritte bleiben gültig, sofern ihre Ereignisse
  strukturell und fachlich plausibel sind.
