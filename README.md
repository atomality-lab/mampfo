# Mampfo v0.3.2

Mampfo ist eine persönliche, lokal gespeicherte PWA zum Ernährungstracking.

## Neu in v0.3.2 – Rezeptbasis

- das Register **Rezepte** ist jetzt vollständig aktiv
- eigene Rezepte können angelegt, geöffnet, bearbeitet und gelöscht werden
- in v0.3.2 werden die Nährwerte des gesamten Rezepts direkt eingegeben
- Anzahl der Portionen frei festlegbar
- Kalorien, Protein, Ballaststoffe, Fett und Kohlenhydrate werden automatisch pro Portion berechnet
- Live-Vorschau der Werte pro Portion beim Erstellen und Bearbeiten
- Rezepte können mit **½, 1, 1½, 2 oder einer freien Portionsmenge** ins Ernährungstagebuch übernommen werden
- Datum und Uhrzeit bleiben beim Eintragen editierbar
- Tagebucheinträge aus Rezepten erhalten `source = recipe` und eine `recipeId`
- bestehende Tagebucheinträge bleiben unverändert, wenn ein Rezept später geändert oder gelöscht wird
- Rezeptsuche nach Namen
- neue lokale Rezeptdatenbank `mampfo.recipes.v3`

## Rezeptlogik

Ein Rezept speichert seine Nährwerte als Gesamtwerte für das komplette Gericht.

Beispiel:

- Linsenbolognese: 1840 kcal insgesamt
- 4 Portionen
- Mampfo berechnet 460 kcal pro Portion

Beim Eintragen von 1,5 Portionen werden 690 kcal sowie alle weiteren vorhandenen Nährwerte entsprechend skaliert.

### Historische Stabilität

Rezepte und Tagebucheinträge sind bewusst lose gekoppelt. Wird ein Rezept später geändert oder gelöscht, verändern sich bereits vorhandene Ernährungseinträge nicht rückwirkend.

## Noch nicht in v0.3.2

Zutatenlisten und die automatische Berechnung eines Rezepts aus gespeicherten Lebensmitteln folgen mit **v0.3.3**.

## Bestehende Funktionen

- Tagesziele für Kalorien und Protein
- Tagesübersicht mit Kalorien, Protein und Ballaststoffen
- Fett und Kohlenhydrate als sekundäre Tageswerte
- Essen mit Datum und Uhrzeit erfassen
- Einträge bearbeiten und löschen
- gespeicherte Lebensmittel
- Favoriten
- „Zuletzt verwendet“ und „Häufig verwendet“
- intelligente Suchvorschläge
- alte Tagebucheinträge nachträglich als Lebensmittel speichern
- Bezugsmenge und Einheiten g, ml, Stück und Portion
- automatische Skalierung gespeicherter Lebensmittel
- lokale Speicherung und Offline-PWA

## Datenmigration

v0.3.2 verwendet weiterhin `dataVersion = 3` und alle bestehenden `mampfo.*`-Speicherbereiche. Neu hinzu kommt ausschließlich:

- `mampfo.recipes.v3`

Beim ersten Start wird diese Rezeptdatenbank leer angelegt. Bestehende Lebensmittel, Tagebucheinträge und Einstellungen aus v0.3.1.1 bleiben unverändert.

## Veröffentlichung auf GitHub Pages

Es gibt keinen Build-Prozess und keine externen Abhängigkeiten. Den Inhalt dieses Ordners direkt in das bestehende Repository kopieren und die vorhandenen Dateien ersetzen.

Der Service Worker verwendet für v0.3.2 einen neuen Cache-Namen. Falls ein Gerät zunächst noch die alte Version zeigt, die installierte PWA einmal vollständig schließen und erneut öffnen.

## Lokaler Test

```bash
python -m http.server 8080
```

Danach `http://localhost:8080` im Browser öffnen.

## Noch Platzhalter

- Zutatenbasierte Rezepte: v0.3.3
- Fasten
- Auswertung

## Datenschutz

Mampfo speichert die Daten weiterhin ausschließlich lokal im jeweiligen Browser bzw. auf dem jeweiligen Gerät. Es gibt keine Anmeldung, keinen Server und keine Cloud-Synchronisation.

## Version

0.3.2
