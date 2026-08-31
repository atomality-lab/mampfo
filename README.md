# Mampfo v0.3.1

Mampfo ist eine persönliche, lokal gespeicherte PWA zum Ernährungstracking.

## Neu in v0.3.1

- Bezugsmenge für gespeicherte Lebensmittel
- Einheiten: g, ml, Stück und Portion
- automatische Skalierung der Nährwerte innerhalb derselben Einheit
- zusätzliche optionale Nährwerte: Fett und Kohlenhydrate
- kompakter Bereich „Weitere Nährwerte“ beim Erfassen und in der Tagesansicht
- Mengenangabe in Tagebucheinträgen
- bestehende Lebensmittel aus v0.2.x werden automatisch als `1 Portion` migriert
- alte Tagebucheinträge bleiben unverändert; neue Mengenfelder sind dort zunächst leer
- Datenmodell auf Version 3 aktualisiert

## Mengenlogik

Die Nährwerte eines gespeicherten Lebensmittels beziehen sich immer auf seine Bezugsmenge.

Beispiel:

- 100 g = 350 kcal
- beim Erfassen werden 250 g gewählt
- Mampfo berechnet automatisch 875 kcal

Die gespeicherte Vorlage bleibt weiterhin bei 350 kcal pro 100 g. Eine automatische Umrechnung zwischen unterschiedlichen Einheiten findet nicht statt.

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
- lokale Speicherung und Offline-PWA

## Datenmigration

v0.3.1 verwendet weiterhin die bestehenden `mampfo.*`-Speicherbereiche aus v0.2.x. Beim Start werden die Daten auf `dataVersion = 3` erweitert.

Bestehende SavedFoods erhalten automatisch:

- `baseAmount = 1`
- `baseUnit = portion`
- `fat = null`, falls noch nicht vorhanden
- `carbohydrates = null`, falls noch nicht vorhanden

Bestehende Tagebucheinträge erhalten lediglich die neuen optionalen Felder `amount` und `unit`, ohne ihre bisherigen Werte zu verändern.

## Veröffentlichung auf GitHub Pages

Es gibt keinen Build-Prozess und keine externen Abhängigkeiten. Den Inhalt dieses Ordners direkt in das bestehende Repository kopieren und die vorhandenen Dateien ersetzen.

Der Service Worker verwendet für v0.3.1 einen neuen Cache-Namen. Falls ein Gerät zunächst noch die alte Version zeigt, die installierte PWA einmal vollständig schließen und erneut öffnen.

## Lokaler Test

```bash
python -m http.server 8080
```

Danach `http://localhost:8080` im Browser öffnen.

## Noch Platzhalter

- Rezepte, geplant für v0.3.2 und v0.3.3
- Fasten
- Auswertung

## Datenschutz

Mampfo speichert die Daten weiterhin ausschließlich lokal im jeweiligen Browser bzw. auf dem jeweiligen Gerät. Es gibt keine Anmeldung, keinen Server und keine Cloud-Synchronisation.

## Version

0.3.1
