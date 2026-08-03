# Deployment

Die Oberfläche wird zunächst statisch über GitHub Pages veröffentlicht. Die App
bleibt dabei hosting-neutral: Sie erwartet keine GitHub-spezifische Laufzeit und
der öffentliche Basispfad wird nur beim Build gesetzt.

## Erstes GitHub-Pages-Deployment

Voraussetzungen:

1. Produkt- und Repositoryname festlegen.
2. Diesen Ordner als Git-Repository initialisieren und mit einem
   GitHub-Repository verbinden.
3. Den Hauptbranch `main` verwenden.
4. Unter **Settings → Pages → Build and deployment** als Quelle
   **GitHub Actions** auswählen.
5. Den geprüften Stand nach `main` pushen oder den Workflow manuell starten.

Der Workflow [deploy-pages.yml](../.github/workflows/deploy-pages.yml) erzeugt
vor jedem Deployment den Content neu und führt Typecheck, Unit-/Contract-Tests,
die Playwright-Browserflüsse sowie den Produktionsbuild aus. Erst danach wird
`dist/` als Pages-Artefakt veröffentlicht.

Für ein übliches Projekt-Repository setzt der Workflow automatisch
`BASE_PATH=/<repository-name>/`. Hash-Routing hält die clientseitigen Routen
unter diesem Unterpfad direkt aufrufbar.

Der Browserlauf erhält denselben `BASE_PATH` wie der Releasebuild. Damit prüft
er nicht nur Root-Hosting, sondern lädt HTML, Assets, Assetmanifest und
Service-Worker tatsächlich unter dem Repository-Unterpfad. Der Testbuild darf
den zuvor erzeugten Pages-Ordner nicht wieder als Root-Build überschreiben.

## Offline-App-Shell

Vite schreibt `asset-manifest.json`. `public/sw.js` liest dieses Manifest bei
der Installation und speichert App-Shell, Styles, Hauptbundle und dynamischen
Kartenchunk unterhalb seines aktuellen Scopes. Große thematische
Physikgeometrien, der Städtepack und visuelle Einzelassets werden erst beim
Öffnen beziehungsweise Vorbereiten des jeweiligen Themas geladen und danach
im Runtime-Cache gehalten. Dadurch
funktioniert derselbe Worker unter `/`, `/<repository>/` und einer späteren
eigenen Domain, ohne alle optionalen Themen beim ersten Besuch zu übertragen.

Navigationen fallen offline auf die gecachte Scope-Startseite zurück.
Same-Origin-Assets werden cache-first ausgeliefert; neue Releaseversionen
verwenden einen neuen Cache-Key und löschen ältere GeoApp-Shell-Caches bei der
Aktivierung. Ein Produktions-Browsertest lädt die App online, schaltet Chromium
offline, lädt neu und startet anschließend eine Textquiz-Runde. Ein zweiter
Fluss-Test bereitet die Geometrie online vor, lädt die Runde offline neu und
beantwortet die Linienfrage aus dem Cache.

Phase 7 verwendet `geoapp-shell-phase7-v1`. Der lazy Städtechunk wird nicht
bei der Service-Worker-Installation vorab geladen, aber nach dem ersten
erfolgreichen Stadtzugriff cache-first ausgeliefert. Der Pages-Basispfad bleibt
Teil seiner von Vite erzeugten URL; es gibt weder Root-Pfad-Annahme noch
GeoNames-Live-Abhängigkeit.

## Sonderfälle

- **Repository `<owner>.github.io`:** Repository-Variable
  `PUBLIC_BASE_PATH` auf `/` setzen.
- **Eigene Domain auf GitHub Pages:** ebenfalls `PUBLIC_BASE_PATH=/` setzen und
  die Domain in den Pages-Einstellungen konfigurieren.
- **Lokaler Unterpfad-Test:**
  `BASE_PATH=/geoapp/ npm run test:browser`.

## Optionale Accountkonfiguration auf GitHub Pages

GitHub Pages bleibt statisch. Für den separaten Supabase-Dienst können im
GitHub-Repository unter **Settings → Secrets and variables → Actions →
Variables** diese öffentlichen Repositoryvariablen gesetzt werden:

| Repositoryvariable | Vite-Buildvariable |
|---|---|
| `SUPABASE_URL` | `VITE_SUPABASE_URL` |
| `SUPABASE_PUBLISHABLE_KEY` | `VITE_SUPABASE_PUBLISHABLE_KEY` |

Der Workflow reicht beide Werte an Releasebuild und Browser-Smoke-Test weiter.
Fehlen sie, zeigt die Kontoseite den Gast-/Exportzustand und der Build entfernt
den Supabase-Client vollständig. Ein `service_role`-, Secret- oder privater
Management-Key darf niemals als Pages-Variable oder `VITE_*`-Wert gesetzt
werden.

Vor Aktivierung:

1. Phase-3-Migration in das gewählte Supabase-Projekt einspielen.
2. Site URL und erlaubte Redirect-URLs für den Pages-Unterpfad konfigurieren.
3. E-Mail-Template auf `{{ .Token }}` für den sichtbaren Einmalcode einstellen.
4. produktionsfähiges SMTP konfigurieren.
5. Zwei-Konten-RLS-, Gastimport- und Retry-Test aus dem Slice ausführen.

## Späterer Hosting-Wechsel

Der Wechsel zu einem anderen statischen Host benötigt nur dessen Build- und
Rewrite-Konfiguration:

- Build-Befehl: `npm ci && npm run build`
- Ausgabeordner: `dist`
- Basispfad: `BASE_PATH=/` bei einer Root-Domain
- SPA-Fallback: bei History-Routing nötig; der aktuelle Hash-Router benötigt
  keinen Rewrite

Accounts und Sync werden später als getrenntes Backend über Adapter angebunden.
Sie sind kein Grund, die Oberfläche sofort von Pages wegzuziehen. Ein späterer
Umzug der Oberfläche ändert weder Quizdefinitionen noch Content-Artefakte.
