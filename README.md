# Mampfo v0.2.1

Mampfo ist eine persönliche, lokal gespeicherte PWA zum Ernährungstracking.

## Neu in v0.2.1

- bestehende Tagebucheinträge können beim Bearbeiten nachträglich als Lebensmittel gespeichert werden
- identische bereits gespeicherte Lebensmittel werden erkannt und nur verknüpft
- bei abweichenden Nährwerten kann wahlweise verknüpft oder die gespeicherte Vorlage aktualisiert werden
- die ursprüngliche `source` eines historischen Eintrags bleibt erhalten; nur `foodId` wird ergänzt
- beim Löschen eines gespeicherten Lebensmittels werden Verknüpfungen in Tagebucheinträgen sauber gelöst
- alte Tagebucheinträge und Nährwerte bleiben unverändert

## Enthalten seit v0.2

- persönliche Datenbank für gespeicherte Lebensmittel
- Abfrage nach neuen manuellen Einträgen: „Für später speichern?“
- Erkennung bereits gespeicherter Lebensmittel mit abweichenden Nährwerten
- Favoriten
- Bereich „Zuletzt verwendet“
- Bereich „Häufig verwendet“
- intelligente Vorschläge ab zwei Zeichen während der Eingabe
- Verwaltung gespeicherter Lebensmittel in den Einstellungen
- Bearbeiten und Löschen gespeicherter Lebensmittel
- Migration bestehender v0.1-Daten
- Branding auf „Mampfo“ aktualisiert

## Bestehende Daten aus v0.1

v0.2 verwendet neue, app-spezifische localStorage-Schlüssel (`mampfo.*`). Beim ersten Start versucht Mampfo automatisch, bestehende Daten der v0.1 aus den bisherigen `nutrition.*`-Schlüsseln zu übernehmen.

Die alten v0.1-Schlüssel werden dabei **nicht gelöscht**. Dadurch bleibt eine zusätzliche Rückfallebene erhalten.

Wichtig: Die Daten sind weiterhin lokal an den jeweiligen Browser bzw. das jeweilige Gerät gebunden. Ein Sync zwischen Geräten ist noch nicht enthalten.

## Installation / Veröffentlichung

Es gibt keinen Build-Prozess und keine externen Abhängigkeiten. Der Inhalt dieses Ordners kann direkt in das GitHub-Pages-Repository kopiert werden.

Für ein Update der bestehenden Seite:

1. bisherigen Repository-Inhalt sichern bzw. committen
2. Dateien aus dieser Version in das Repository übernehmen und vorhandene Dateien ersetzen
3. committen und pushen
4. GitHub Pages neu laden

Der Service Worker verwendet mit v0.2.1 einen neuen Cache-Namen, damit die aktualisierten Dateien geladen werden.

## Lokaler Test

```bash
python -m http.server 8080
```

Danach im Browser `http://localhost:8080` öffnen.

## Funktionsumfang

### Ernährungstagebuch

- Tagesziele für Kalorien und Protein
- Tagesübersicht mit Kalorien, Protein und Ballaststoffen
- Essen mit Datum und Uhrzeit erfassen
- Einträge bearbeiten und löschen
- Tagesnavigation

### Gespeicherte Lebensmittel

- Lebensmittel nach dem Tracken speichern
- wiederverwenden und automatisch in die Eingabefelder übernehmen
- als Favorit markieren
- zuletzt und häufig verwendete Lebensmittel anzeigen
- gespeicherte Lebensmittel bearbeiten oder löschen
- alte Tagebucheinträge bleiben bei Änderungen an Vorlagen unverändert

### Noch Platzhalter

- Rezepte
- Fasten
- Auswertung

## Datenschutz

Mampfo v0.2.1 speichert die Daten ausschließlich lokal im Browser. Es gibt keine Anmeldung, keinen Server und keine Cloud-Synchronisation.

## Version

0.2.1
