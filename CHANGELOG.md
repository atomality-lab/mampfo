# Changelog

## 0.3.3 – Zutatenbasierte Rezepte

- Rezepteditor um die Modi **Nährwerte direkt** und **Aus Zutaten** erweitert
- gespeicherte Lebensmittel können mit frei gewählter Menge als Rezeptzutaten verwendet werden
- Zutaten werden als Snapshots gespeichert und ändern sich nicht durch spätere Änderungen an SavedFoods
- manuelle Zutaten mit g, ml, Stück oder Portion ergänzt
- manuelle Zutaten können optional gleichzeitig als gespeichertes Lebensmittel angelegt werden
- bestehende gleichnamige Lebensmittel werden erkannt; bei abweichenden Werten ist Aktualisieren oder reine Rezeptnutzung möglich
- automatische Summierung aller Zutaten und Berechnung der Werte pro Portion
- fehlende optionale Nährwerte bleiben als unbekannt erhalten und werden nicht als 0 ausgegeben
- Zutaten können bearbeitet und entfernt werden
- Rezeptdetail zeigt Zutatenliste mit Menge und Kalorien
- Rezeptsuche berücksichtigt jetzt auch Zutatennamen
- bestehende v0.3.2.x-Rezepte werden mit leerer Zutatenliste kompatibel weitergeführt
- Service-Worker-Cache auf v0.3.3 aktualisiert

## 0.3.2.1 – Rezept-Tracking Patch

- lange Gleitkomma-Nachkommastellen bei Ballaststoffen/Fett und anderen Rezeptwerten in Eingabefeldern behoben
- Rezept-Tagebucheinträge berechnen Nährwerte beim Ändern der Portionsmenge automatisch neu
- Skalierung beim Bearbeiten basiert auf dem historischen Snapshot des Eintrags und verändert keine Rezept-Historie
- Rezepte als zusätzlicher Schnellzugriff unter **Erfassen** ergänzt
- Rezeptsuche und direkte Portionsauswahl aus dem Erfassen-Register ergänzt
- Zurück-Navigation aus der Portionsauswahl berücksichtigt den Aufrufweg
- Service-Worker-Cache auf v0.3.2.1 aktualisiert

## 0.3.2 – Rezeptbasis

- Rezeptregister aktiviert
- Rezepte mit Name, Portionszahl und direkt eingegebenen Gesamtnährwerten anlegen
- Kalorien, Protein, Ballaststoffe, Fett und Kohlenhydrate automatisch pro Portion berechnen
- Live-Vorschau der Portionswerte im Rezepteditor
- Rezeptübersicht mit Suche ergänzt
- Rezeptdetail mit Werten pro Portion und Gesamtwerten ergänzt
- Rezepte bearbeiten und löschen
- bereits vorhandene Tagebucheinträge bleiben beim Ändern/Löschen eines Rezepts unverändert
- Rezepte mit ½, 1, 1½, 2 oder freier Portionsmenge ins Tagebuch übernehmen
- Rezept-Tagebucheinträge speichern `source = recipe` und `recipeId`
- neue lokale Rezeptdatenbank `mampfo.recipes.v3`
- Service-Worker-Cache auf v0.3.2 aktualisiert

## 0.3.1.1 – Verknüpfungslogik beim Bearbeiten

- verknüpfte Tagebucheinträge werden beim Speichern gegen die aktuelle SavedFood-Vorlage geprüft
- reine Datum-/Uhrzeitänderungen und korrekt skalierte Mengenänderungen behalten die Verknüpfung
- bei abweichendem Namen oder abweichenden Nährwerten erscheint eine Entscheidungsabfrage
- „Nur Tagebucheintrag ändern“ löst die `foodId`-Verknüpfung
- „Gespeichertes Lebensmittel aktualisieren“ übernimmt Name und auf die Bezugsmenge normalisierte Nährwerte in die Vorlage
- bei geändertem Namen kann der Eintrag als neues Lebensmittel gespeichert werden, ohne die ursprüngliche Vorlage zu überschreiben
- bereits vorhandene abweichende Verknüpfungen werden mit Warnstatus statt grünem Haken dargestellt
- Nutzungszähler betroffener Lebensmittel werden beim Umverknüpfen neu berechnet
- Service-Worker-Cache auf v0.3.1.1 aktualisiert

## 0.3.1 – Mengen und zusätzliche Nährwerte

- Bezugsmenge für gespeicherte Lebensmittel ergänzt
- Einheiten g, ml, Stück und Portion ergänzt
- automatische Skalierung der Nährwerte innerhalb derselben Einheit
- Fett und Kohlenhydrate als optionale Nährwerte ergänzt
- Tagesansicht um einklappbare sekundäre Nährwerte erweitert
- Tagebucheinträge speichern künftig optional Menge und Einheit
- SavedFoods speichern künftig `baseAmount` und `baseUnit`
- v0.2.x-SavedFoods werden automatisch als 1 Portion migriert
- Datenmodell auf Version 3 aktualisiert
- historische Daten bleiben unverändert
- Service-Worker-Cache auf v0.3.1 aktualisiert

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
