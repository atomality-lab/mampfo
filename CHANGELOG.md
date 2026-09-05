# Changelog

## v0.6.2 – Bidirektionaler Geräteabgleich

### Neu
- vollständiger manueller und automatischer Geräteabgleich über Supabase
- neue Datensätze verschiedener Geräte werden automatisch zusammengeführt
- Drei-Wege-Vergleich über einen lokalen Sync-Baseline-Stand
- Konflikterkennung, wenn derselbe Datensatz lokal und in der Cloud unterschiedlich geändert wurde
- Konfliktauflösung: **Dieses Gerät verwenden** oder **Cloud-Version verwenden**
- Synchronisation von Ernährung, Lebensmitteln, Rezepten, Fastenplänen, Fasten-Sessions und Tageszielen
- Löschungen werden über Cloud-Tombstones (`deleted_at`) zwischen Geräten übertragen
- Fasten-Tombstones bleiben lokal erhalten, damit geplante Sessions nicht erneut rekonstruiert werden
- identische geplante Fasten-Sessions mit gleicher `cycleKey` werden beim ersten Merge dedupliziert
- automatischer Sync nach gespeicherten Änderungen, beim App-Start, bei Rückkehr und nach Wiederherstellung der Internetverbindung
- manueller Button **Jetzt synchronisieren** mit Status und Konfliktanzeige
- automatischer Pull pausiert während offener Bearbeitungen und Dialoge

### Kompatibilität
- vorhandenes Supabase-Schema aus v0.6.1 kann weiterverwendet werden; keine Migration erforderlich
- vorhandene LocalStorage-Daten und Datenmodell Version 4 bleiben erhalten
- `supabase-config.js` mit persönlichen Project-Daten beim Update beibehalten
- Service-Worker-Cache auf v0.6.2 aktualisiert

## v0.6.1 – Supabase-Grundgerüst und kontrollierter Erst-Upload

### Neu
- **Einstellungen → Datenaustausch** ergänzt
- Supabase-Konfiguration über separate `supabase-config.js`
- E-Mail-/Passwort-Konto erstellen, anmelden und abmelden
- Session-Persistenz und Token-Erneuerung für Mampfo Cloud
- Cloud-Status mit lokalen und entfernten Datenmengen
- kontrollierter Erst-Upload für Ernährung, Lebensmittel, Rezepte, Fastenpläne, Fasten-Sessions und Einstellungen
- Erst-Upload wird blockiert, sobald bereits persönliche Cloud-Daten vorhanden sind
- lokale Daten werden beim Cloud-Upload nicht verändert
- separates `SUPABASE_SETUP.sql` mit Tabellen, Grants und Row Level Security
- `SUPABASE_SETUP.md` mit Einrichtungsanleitung ergänzt

### Sicherheit und Datenlogik
- RLS beschränkt jede Cloud-Tabelle auf `auth.uid() = user_id`
- `anon` erhält keine Tabellenrechte; `authenticated` nur die benötigten CRUD-Rechte
- Browser-Konfiguration ist für einen Supabase **Publishable Key** ausgelegt
- Secret-/service_role-Keys werden nicht benötigt und dürfen nicht in die PWA
- bestehende LocalStorage-Daten bleiben primäre Arbeitsgrundlage
- noch kein bidirektionaler Merge; dieser folgt in v0.6.2

### Technik
- Datenmodell bleibt Version 4
- neue lokale Schlüssel `mampfo.cloudSession.v1` und `mampfo.deviceId.v1`
- Service-Worker-Cache auf v0.6.1 aktualisiert

## v0.5.3 – Rhythmus & Gesamtübersicht

### Neu
- Bereich **Auswertung → Rhythmus** vollständig aktiviert
- erste und letzte Mahlzeit pro Kalendertag
- durchschnittliche erste und letzte Mahlzeit
- tatsächliches Essensfenster pro Tag und im Durchschnitt
- Tage mit nur einem Ernährungseintrag werden korrekt als nicht berechenbares Essensfenster behandelt
- 24-Stunden-Tagesrhythmus mit erster/letzter Mahlzeit und Fastenzeit des Tages
- neutrale Kennzeichnung, wenn erste oder letzte Mahlzeit außerhalb des damaligen Planfensters liegt
- Gesamtübersicht um drei Rhythmus-Kennzahlen ergänzt
- neutraler Vergleich mit dem vorherigen Zeitraum für Kalorien, Protein, Fastenzeit, erste Mahlzeit und Essensfenster
- Service-Worker-Cache auf v0.5.3 aktualisiert

### Datenlogik
- keine neuen Statistik-Snapshots; alle Werte werden live aus Tagebuch, Fastenplänen und Fasten-Sessions berechnet
- heutiger laufender Tag bleibt standardmäßig aus Durchschnittswerten ausgeschlossen
- bestehende Daten bleiben unverändert, Datenmodell bleibt Version 4

## v0.5.2.2 – KPI-Icons in Auswertung korrigiert

### Korrigiert
- Icons in den Auswertungs-Karten von Übersicht, Ernährung und Fasten layoutseitig überarbeitet
- Symbole jetzt deutlich größer und mittig in einer festen Icon-Fläche
- KPI-Karten auf flexbasiertes Layout umgestellt, damit Icons nicht mehr oben links „kleben“
- kleine Fasten-Zusammenfassung in der Übersicht optisch an dasselbe Prinzip angepasst
- Service-Worker-Cache auf v0.5.2.2 aktualisiert

## v0.5.2.1 – UI-Feinschliff Auswertung

### Verbessert
- Symbole in den Auswertungs-Kacheln deutlich vergrößert
- Icon-Flächen in KPI-Karten und Fasten-Zusammenfassungen zentriert und ruhiger ausgerichtet
- Abstände innerhalb der Statistik-Karten optimiert, damit Icons nicht mehr oben links „kleben"
- farbliche Icon-Akzente für Ernährung und Fasten ergänzt
- Service-Worker-Cache auf v0.5.2.1 aktualisiert

## v0.5.2 – Fastenauswertung

### Neu
- Bereich **Auswertung → Fasten** vollständig aktiviert
- Fastenzeit pro Kalendertag mit derselben Tagesaufteilung wie im Fastenverlauf
- mehrere Fastenzeiträume eines Tages werden automatisch summiert
- 24-Stunden-Tagesdiagramm mit historischem Fastenziel als individueller Referenz je Tag
- laufende Fastenphase wird nur bis zur aktuellen Uhrzeit berücksichtigt und gekennzeichnet
- Durchschnitt der Fastenzeit pro Kalendertag
- durchschnittliche, längste und kürzeste abgeschlossene Fastenphase
- Liste zusammenhängender Fasten-Sessions mit Beginn, Ende, Dauer und Ziel
- Tagesdetail beim Antippen eines Fastenbalkens mit direktem Zugang zum Fastenverlauf
- Fasten-Kennzahl in der Auswertungsübersicht ergänzt

### Datenlogik
- Tage vor Einrichtung des Fastenplans gelten als **keine Daten**
- Tage mit aktivem Fastenplan dürfen 0 min als echten Tageswert enthalten
- heutiger Tag bleibt sichtbar und ist standardmäßig aus Durchschnittswerten ausgeschlossen
- laufende Sessions werden nicht als abgeschlossene Fastenphasen in Durchschnitt/Längste/Kürzeste eingerechnet
- historische Zielwerte werden aus den gespeicherten Sessions/Plänen verwendet
- keine separaten Statistik-Snapshots; alle Werte werden live berechnet

### Bestehende Daten
- Tagebuch, Lebensmittel, Rezepte, Fastenpläne und Fasten-Sessions bleiben unverändert
- Datenmodell bleibt Version 4
- Service-Worker-Cache auf v0.5.2 aktualisiert

## v0.5.1 – Ernährungsauswertung

### Neu
- Hauptregister **Auswertung** aktiviert
- Unterbereiche **Übersicht | Ernährung | Fasten | Rhythmus** ergänzt; Fasten und Rhythmus sind als kommende Ausbaustufen gekennzeichnet
- Zeitraumsauswahl: 7 Tage, 30 Tage, dieser Monat, letzter Monat und eigener Zeitraum
- heutiger laufender Tag kann gezielt in Durchschnittswerte ein- oder ausgeschlossen werden
- Durchschnittswerte für Kalorien, Protein, Ballaststoffe, Fett und Kohlenhydrate
- Tagesdiagramme für alle fünf Nährwerte ohne externe Diagrammbibliothek
- persönliche Kalorien- und Proteinziele als neutrale Referenzlinien
- antippbare Tageswerte mit Detailansicht und direktem Sprung zum Tagebuchtag
- Datenbasis zeigt Erfassungs- und Vollständigkeitsgrad

### Datenlogik
- Tage ohne Ernährungseinträge werden als **keine Daten** behandelt, nicht als 0
- fehlende Nährstoffwerte werden als **teilweise erfasst** gekennzeichnet
- unvollständige Tage werden aus dem Durchschnitt des jeweiligen Nährstoffs ausgeschlossen
- Statistikwerte werden immer live aus den vorhandenen Tagebucheinträgen berechnet; es werden keine separaten Statistik-Snapshots gespeichert

### Bestehende Daten
- Tagebuch, Lebensmittel, Rezepte, Fastenpläne und Fasten-Sessions bleiben unverändert
- Datenmodell bleibt Version 4
- Service-Worker-Cache auf v0.5.1 aktualisiert

## v0.4.3 – Ernährung und Fasten verknüpfen

### Neu
- Beim Speichern eines neuen Ernährungseintrags prüft Mampfo dessen **tatsächlichen Essenszeitpunkt** gegen den Fastenverlauf.
- Die Prüfung funktioniert auch für **rückwirkend erfasste Einträge**, deren Fastenphase bereits beendet ist.
- Liegt die Essenszeit innerhalb einer gespeicherten Fastenphase, erscheint die Auswahl:
  - **Fasten um HH:MM beenden**
  - **Nur Essen speichern**
  - **Abbrechen**
- Bei **Fasten beenden** wird genau die betroffene Fasten-Session am Zeitpunkt des Essens verkürzt; der geplante Endzeitpunkt bleibt als Planinformation erhalten.
- Die Fastenphase erhält `endSource = foodEntry`, sodass die Herkunft der Änderung nachvollziehbar bleibt.
- Auch **Rezept-Einträge** verwenden dieselbe Fastenprüfung.
- Beim Bearbeiten eines Tagebucheintrags wird erneut geprüft, wenn **Datum oder Uhrzeit** verändert wurden.
- Reine Änderungen an Name, Menge oder Nährwerten lösen keine erneute Fastenabfrage aus.
- Einträge in der Zukunft verändern den Fastenverlauf nicht.
- Ein Eintrag exakt am Beginn oder Ende einer Fastenphase gilt nicht als innerhalb dieser Phase.

### Beispiel
Eine gespeicherte Fastenphase läuft von **02.09. 19:30 bis 03.09. 09:30**. Wird am 03.09. mittags ein Essen rückwirkend für **08:30** eingetragen, erkennt Mampfo die historische Fastenphase und kann sie auf **19:30 bis 08:30** verkürzen.

### Bestehende Daten
- Fastenpläne und bestehende Sessions bleiben erhalten.
- Tagebuch, Lebensmittel und Rezepte bleiben unverändert.
- Datenmodell bleibt Version 4.
- Service-Worker-Cache auf v0.4.3 aktualisiert.

## v0.4.2.2 – Zeitlogik und Zukunftsschutz

### Korrigiert
- abgeschlossene Fastenphasen mit Endzeit in der Zukunft werden nicht mehr akzeptiert
- bereits gespeicherte ungültige Zukunfts-Sessions werden automatisch bereinigt und aus dem Plan neu rekonstruiert
- Erkennung vorzeitig beendeter Fastenphasen auf das aktuell laufende geplante Fastenfenster begrenzt
- alte/unpassende Sessions können die aktuelle Phase nicht mehr fälschlich auf Essensphase setzen
- laufende Fastenphase wird im Verlauf nur bis zur aktuellen Uhrzeit dargestellt und mit **läuft** gekennzeichnet
- zukünftige Minuten erscheinen nicht mehr als abgeschlossener Verlauf
- Nachtragen/Bearbeiten abgeschlossener Sessions verhindert zukünftige Endzeiten
- laufende Verlaufseinträge öffnen die Bearbeitung der aktiven Fastenphase
- Service-Worker-Cache auf v0.4.2.2 aktualisiert

### Bestehende Daten
- korrekte bestehende Daten bleiben erhalten
- nur logisch unmögliche abgeschlossene Zukunfts-Sessions werden entfernt
- Datenmodell bleibt Version 4


## v0.4.2.1 – Fastenverlauf nach Kalendertagen

### Geändert
- Fastenverlauf wird nach Kalendertagen gruppiert statt nach Startdatum einer vollständigen Fastenphase.
- Fastenphasen über Mitternacht werden für die Anzeige automatisch an der Tagesgrenze aufgeteilt.
- Ein Kalendertag zeigt jeden Fastenzeitraum separat, z. B. **00:00–09:00** und **19:00–24:00**.
- Die gesamte **Fastenzeit an diesem Tag** wird automatisch summiert.
- Der historische Zielwert bleibt im Tagesblock sichtbar; unterschiedliche Ziele an einem Tag werden kenntlich gemacht.
- Ein Tipp auf einen Tagesabschnitt öffnet weiterhin die vollständige zugrunde liegende Fastenphase zum Bearbeiten.
- Nachtragen und Bearbeiten bleiben auf Ebene vollständiger Fastenphasen.
- Service-Worker-Cache auf v0.4.2.1 aktualisiert.

### Bestehende Daten
- keine Änderung am Session-Datenmodell
- bestehende Fastenphasen, Pläne, Tagebuchdaten, Lebensmittel und Rezepte bleiben unverändert
- Datenmodell bleibt Version 4


## v0.4.2 – Fastenverlauf und tatsächliche Fastenzeiten

### Neu
- tatsächliche Fasten-Sessions als lokales Datenmodell aktiviert
- geplante Fastenphasen werden aus dem Fastenplan rekonstruiert und automatisch abgeschlossen
- **Fasten jetzt beginnen** ergänzt
- **Fasten jetzt beenden** ergänzt
- Beginn und geplantes Ende einer laufenden Fastenphase können korrigiert werden
- Unterregister **Verlauf** vollständig aktiviert
- abgeschlossene Fastenphasen mit Beginn, Ende, Dauer und damaligem Ziel anzeigen
- Fastenphasen nachträglich bearbeiten, löschen und ergänzen
- Überschneidungsprüfung für Fastenzeiträume ergänzt
- historische Fastenziele bleiben als Snapshot erhalten
- Startseite zeigt am aktuellen Tag **Heute · Fasten** bzw. **Heute · Essensphase**
- bei anderen Tagen erscheint **Zum heutigen Tag** als kompakter Rücksprung
- ohne Fastenplan bleibt die Startseitenanzeige bei **Heute**
- Service-Worker-Cache auf v0.4.2 aktualisiert

### Bestehende Daten
- Tagebuch, Lebensmittel, Rezepte und Fastenpläne aus v0.4.1 bleiben erhalten
- Datenmodell bleibt Version 4


## v0.4.1 – Fastenplan und Timer

### Neu
- Hauptregister **Fasten** aktiviert.
- Fastenpläne **12:12**, **14:10** und **16:8** ergänzt.
- Benutzerdefinierte Fastendauer mit automatisch berechneter Essensphase ergänzt.
- Orientierung wahlweise über **Essensphase beginnt** oder **Fasten beginnt**.
- Uhrzeit des täglichen Startpunkts frei einstellbar.
- Live-Vorschau der Essens- und Fastenfenster im Planeditor.
- Timeransicht mit aktueller Phase, Startzeit, Lauf-/Restzeit, Wechselzeit und Fortschrittsbalken.
- Timer wird aus gespeicherten Zeitpunkten berechnet und benötigt keinen dauerhaften Hintergrundprozess.
- Regelmäßige Aktualisierung bei geöffneter App sowie Neuberechnung nach Rückkehr aus dem Standby.
- Unterregister **Timer | Verlauf | Plan** ergänzt; Verlauf bleibt bis v0.4.2 als Vorschau ohne Aufzeichnung.
- Planänderungen werden am nächsten passenden Startzeitpunkt des neuen Rhythmus aktiviert.
- Fastenpläne werden historisierbar mit `activeFrom` gespeichert.
- Neue lokale Speicherbereiche `mampfo.fastPlans.v4` und vorbereitend `mampfo.fastingSessions.v4`.
- Datenmodell auf Version 4 erweitert.
- Service-Worker-Cache auf v0.4.1 aktualisiert.

### Bestehende Daten
- Tagebuch, Lebensmittel, Rezepte und Einstellungen aus v0.3.3.1 bleiben unverändert erhalten.


## v0.3.3.1

### Neu
- Lebensmittel sind direkt unter **Erfassen → Lebensmittel** erreichbar.
- Neue Lebensmittel können dort direkt angelegt werden.
- Bezugsmenge und Nährwerte werden bei Mengenänderung innerhalb derselben Einheit proportional skaliert.
- Schnellaktion **Auf 100 g/ml umrechnen** ergänzt.

### Korrigiert / Verhalten
- Änderungen nur an Protein, Ballaststoffen, Fett, Kohlenhydraten oder Kalorien lösen keine automatische Änderung anderer Werte aus.
- Bei einem Wechsel der Einheit findet keine automatische Umrechnung statt.
- Bestehende Tagebucheinträge und Rezept-Snapshots bleiben unverändert.

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
