# Changelog

## 0.2.1 – Alte Einträge nachträglich speichern

- Tagebucheinträge können im Bearbeitungsmodus nachträglich als gespeichertes Lebensmittel übernommen werden
- identische vorhandene Lebensmittel werden ohne Dublette verknüpft
- bei abweichenden Nährwerten stehen „Mit vorhandenem Lebensmittel verknüpfen“ und „Gespeichertes Lebensmittel aktualisieren“ zur Auswahl
- historische Einträge behalten ihre ursprüngliche `source`; die Verknüpfung erfolgt über `foodId`
- nachträgliche Verknüpfungen fließen in „Zuletzt“ und „Häufig verwendet“ ein
- beim Löschen eines SavedFoods werden zugehörige `foodId`-Verknüpfungen aus Tagebucheinträgen entfernt
- Service-Worker-Cache auf v0.2.1 aktualisiert

## 0.2.0 – Gespeicherte Lebensmittel

- App-Name auf Mampfo festgelegt
- bestehende v0.1-Daten werden automatisch migriert
- neue app-spezifische `mampfo.*`-Speicherschlüssel
- gespeicherte Lebensmittel eingeführt
- Speichern-Abfrage für neue Lebensmittel
- Abgleich bei bereits vorhandenem Namen und abweichenden Nährwerten
- Favoriten ergänzt
- „Zuletzt verwendet“ ergänzt
- „Häufig verwendet“ ergänzt
- intelligente Suchvorschläge ab zwei Zeichen
- Verwaltung gespeicherter Lebensmittel in den Einstellungen
- gespeicherte Lebensmittel bearbeiten und löschen
- alte Tagebucheinträge bleiben unabhängig von späteren Änderungen an Vorlagen
- Service-Worker-Cache auf v0.2.0 aktualisiert

## 0.1.0 – Prototyp

- erstes funktionsfähiges PWA-Grundgerüst
- pastelliges UI nach visuellem Konzept
- Tagesziele: Kalorien und Protein
- Ernährungstagebuch mit kcal, Protein, Ballaststoffen, Datum und Uhrzeit
- Tagesübersicht und Tagesnavigation
- Einträge bearbeiten und löschen
- lokale Speicherung
- Offline-Cache via Service Worker
- Platzhalter für spätere Module Rezepte, Fasten und Auswertung
