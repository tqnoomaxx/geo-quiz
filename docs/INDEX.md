# Planungsindex

Diese Dokumente bilden die gemeinsame Quelle der Wahrheit.

| Dokument | Beantwortet |
|---|---|
| [Produkt](PRODUCT.md) | Was bauen wir, für wen und was ist der erste sinnvolle Umfang? |
| [Quizkatalog](QUIZ_CATALOG.md) | Welche Themen und Spielweisen soll die Plattform langfristig tragen? |
| [Quizsystem](QUIZ_ENGINE.md) | Wie entstehen viele Quizarten aus wiederverwendbaren Bausteinen? |
| [Gemischte und zusammengesetzte Fragen](COMPOSITE_QUESTIONS.md) | Wie funktionieren „alles gemischt“ und mehrstufige Wissensfragen? |
| [Datenmodell](DATA_MODEL.md) | Wie werden Geographie, Quizkonfiguration und Lernfortschritt gespeichert? |
| [Accounts und Abzeichen](ACCOUNTS_AND_ACHIEVEMENTS.md) | Wie funktionieren Konten, Spielstände, Sync, Erfolge und Abzeichen? |
| [Architektur](ARCHITECTURE.md) | Welche technischen Grenzen, Module und Laufzeitentscheidungen gelten? |
| [Content-Pipeline](CONTENT_PIPELINE.md) | Woher kommen Daten und wie werden sie reproduzierbar aufbereitet? |
| [Deployment](DEPLOYMENT.md) | Wie wird zuerst über GitHub Pages und später hosting-neutral veröffentlicht? |
| [Performance](PERFORMANCE.md) | Welche Build-Baseline und vorläufigen Budgets gelten? |
| [Phase-2-MVP-Slice](slices/PHASE_2_MVP_VERTICAL_SLICE.md) | Welcher öffentlich testbare Länder-/Hauptstadt-Schnitt wurde gebaut und bewusst begrenzt? |
| [Phase-3-Slice](slices/PHASE_3_ACCOUNT_SYNC_VERTICAL_SLICE.md) | Wie bleiben Gastdaten lokal, idempotent synchronisierbar und durch konfigurierbare Abzeichen erweiterbar? |
| [Phase-4-Slice](slices/PHASE_4_VISUAL_MIX_VERTICAL_SLICE.md) | Wie kommen Flaggen, Formen, Auswahlantworten, Wiederholungsqueue und der erste deterministische Weltmix hinzu? |
| [Phase-5-Slice](slices/PHASE_5_PHYSICAL_GEOGRAPHY_VERTICAL_SLICE.md) | Wie kommen physische Punkt-, Linien- und Flächeninhalte sowie der vollständige Weltmix hinzu? |
| [Phase-6-Slice](slices/PHASE_6_KNOWLEDGE_GRAPH_VERTICAL_SLICE.md) | Wie werden geprüfte Fakten sicher zu erklärbaren Wissenspuzzles kompiliert? |
| [Aktiver Phase-7-Slice](slices/PHASE_7_RANKED_CITIES_VERTICAL_SLICE.md) | Wie werden 6000 große Städte als ehrliche, lazy geladene Top-N-Listen, Quizfragen und pausierbare Marathons integriert? |
| [Phase-7-Physikranglisten](slices/PHASE_7_RANKED_PHYSICAL_VERTICAL_SLICE.md) | Wie werden globale Top-100-Flusssysteme und -Gipfel als getrennte, belegte Faktenquizze integriert? |
| [Phase-7-Länderprofile](slices/PHASE_7_COUNTRY_PROFILE_VERTICAL_SLICE.md) | Wie werden Hauptstadt, Amtssprache und Währung als ein zusammengesetztes Länderprofil abgefragt? |
| [Phase-8-Astronomie](slices/PHASE_8_ASTRONOMY_VERTICAL_SLICE.md) | Wie werden Planeten, bekannte Monde, Zwergplaneten und konfigurierbare Sternzeichenprofile integriert? |
| [Roadmap](ROADMAP.md) | In welcher Reihenfolge wird die große Vision umgesetzt? |
| [Umsetzungsschritte](IMPLEMENTATION_STEPS.md) | Welche einzeln abnehmbaren Schritte führen von null bis zur großen Plattform? |
| [Arbeitsablauf](WORKFLOW.md) | Welche wiederkehrenden Schemata gelten für Features, Daten und QA? |
| [Entscheidungen](DECISIONS.md) | Welche grundlegenden Entscheidungen gelten und was ist noch offen? |

## Dokumentpflege

- Produktumfang geändert → `PRODUCT.md` und `ROADMAP.md` aktualisieren.
- Neue Quizdimension oder neuer Antwortmodus → `QUIZ_ENGINE.md` aktualisieren.
- Neue langfristige Quizidee → `QUIZ_CATALOG.md` einordnen.
- Neue Mischregel oder Faktenfrage → `COMPOSITE_QUESTIONS.md` aktualisieren.
- Neue Entität, Relation oder Speicherform → `DATA_MODEL.md` aktualisieren.
- Neue Account-, Sync- oder Abzeichenlogik →
  `ACCOUNTS_AND_ACHIEVEMENTS.md` aktualisieren.
- Neue Bibliothek oder geänderte Modulgrenze → `ARCHITECTURE.md` plus
  `DECISIONS.md` aktualisieren.
- Neue Datenquelle → `CONTENT_PIPELINE.md` und ihr Dataset-Manifest
  aktualisieren.
- Ein Slice abgeschlossen → Abnahmekriterien in `ROADMAP.md` abhaken.
- Deploymentweg geändert → `DEPLOYMENT.md`, `ARCHITECTURE.md` und
  `DECISIONS.md` aktualisieren.
