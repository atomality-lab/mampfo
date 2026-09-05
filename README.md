# Mampfo v0.5.2.2

Mampfo ist eine persönliche, lokal gespeicherte PWA zum Ernährungstracking.


## Neu in v0.5.2.2 – KPI-Icons in der Auswertung korrigiert

Dieser Patch behebt die Darstellung der Symbole in den Statistik-Karten der Bereiche Übersicht, Ernährung und Fasten.

### Verbessert

- größere Symbole in den KPI-Karten
- Symbole sitzen jetzt mittig in einer festen Icon-Fläche
- Kartenlayout an die Optik der Kacheln im Bereich Erfassen angenähert
- gleiche Daten und Berechnungslogik wie in v0.5.2.1
- Service-Worker-Cache: `mampfo-v0.5.2.2`

## Neu in v0.5.2.1 – UI-Feinschliff Auswertung

Dieser Patch überarbeitet die Statistik-Kacheln optisch, ohne die Berechnungslogik der Fasten- oder Ernährungsauswertung zu verändern.

### Verbessert

- größere und besser lesbare Symbole in den KPI-Karten
- Symbole sitzen jetzt mittig in einer klaren Icon-Fläche
- bessere Abstände in den Auswertungs-Kästchen
- dezente farbliche Akzente für Ernährungs- und Fasten-Symbole
- dieselbe Logik und dieselben Daten wie in v0.5.2
- Service-Worker-Cache: `mampfo-v0.5.2.1`

## Neu in v0.5.2 – Fastenauswertung

Der Bereich **Auswertung → Fasten** ist jetzt vollständig aktiviert. Er unterscheidet bewusst zwischen der **Fastenzeit eines Kalendertages** und einer **zusammenhängenden Fastenphase**.

### Kalendertägliche Fastenzeit

- Fasten-Sessions über Mitternacht werden wie im Fastenverlauf auf die betroffenen Kalendertage verteilt.
- Mehrere Fastenzeiträume eines Tages werden summiert.
- Das Tagesdiagramm zeigt die Fastenzeit auf einer festen 24-Stunden-Skala.
- Das jeweils damalige Fastenziel erscheint als dezente Referenzmarke.
- Eine laufende Session wird nur bis zur aktuellen Uhrzeit berechnet und mit **• / läuft** gekennzeichnet.
- Der heutige Tag bleibt sichtbar und wird standardmäßig nicht in Durchschnittswerte einbezogen.

### Zusammenhängende Fastenphasen

Mampfo zeigt zusätzlich:

- durchschnittliche Dauer einer abgeschlossenen Fastenphase
- längste Fastenphase
- kürzeste Fastenphase
- Liste der vollständigen Sessions mit Beginn, Ende, Dauer und historischem Ziel

Eine laufende Phase darf in der Liste sichtbar sein, wird aber nicht in die Kennzahlen für abgeschlossene Fastenphasen eingerechnet.

### Tagesdetails

Ein Tipp auf einen Fastenbalken öffnet die Fastenzeiten des Kalendertages, z. B. **00:00–09:00** und **19:00–24:00**, inklusive Tagessumme und Ziel. Von dort kann direkt der Fastenverlauf geöffnet werden.

### Datenlogik

- Tage vor Einrichtung des Fastenplans gelten als **keine Daten**.
- Tage mit aktivem Fastenplan können auch **0 min** Fastenzeit als echten Wert enthalten.
- Statistiken werden live aus `FastPlans` und `FastingSessions` berechnet; es entstehen keine Statistik-Snapshots.
- Historische Zielwerte bleiben erhalten.
- bestehende Ernährungs-, Rezept-, Lebensmittel- und Fastendaten bleiben unverändert
- Datenmodell bleibt Version 4
- Service-Worker-Cache: `mampfo-v0.5.2`


## Neu in v0.5.1 – Ernährungsauswertung

Das Hauptregister **Auswertung** wurde mit v0.5.1 aktiviert. Die Ernährungsauswertung bleibt unverändert verfügbar; Fasten ist ab v0.5.2 ebenfalls aktiv, Rhythmus folgt in v0.5.3.

### Zeitraum

Wählbar sind:

- letzte 7 Tage
- letzte 30 Tage
- dieser Monat
- letzter Monat
- eigener Zeitraum

Der aktuelle Tag bleibt sichtbar, wird standardmäßig aber nicht in Durchschnittswerte einbezogen. Über **Heute in Durchschnitt einbeziehen** kann dies bewusst geändert werden.

### Ernährung

Ausgewertet werden:

- Kalorien
- Protein
- Ballaststoffe
- Fett
- Kohlenhydrate

Mampfo zeigt Durchschnittswerte und Tagesdiagramme. Für Kalorien und Protein erscheinen die persönlichen Tagesziele als dezente Referenz. Ein Tipp auf einen erfassten Tagesbalken öffnet die Detailwerte und ermöglicht den direkten Sprung zum entsprechenden Tagebuchtag.

### Datenqualität

- Tage ohne Ernährungseinträge gelten als **keine Daten** und nicht als 0.
- Fehlt bei mindestens einem Eintrag eines Tages ein bestimmter Nährstoff, wird dieser Tageswert als **teilweise erfasst** markiert.
- Ein unvollständiger Tageswert wird für den Durchschnitt des betreffenden Nährstoffs nicht verwendet.
- Die Datenbasis zeigt, an wie vielen Tagen Ernährung beziehungsweise einzelne Nährstoffe vollständig erfasst wurden.

### Technik

- keine externe Diagrammbibliothek
- alle Auswertungen werden lokal aus den vorhandenen Tagebucheinträgen berechnet
- keine separaten Statistik-Snapshots
- bestehende Daten aus v0.4.3 bleiben unverändert
- Datenmodell bleibt Version 4
- Service-Worker-Cache: `mampfo-v0.5.1`

## Neu in v0.4.3 – Ernährung ↔ Fasten

v0.4.3 verbindet den Essenszeitpunkt mit dem Fastenverlauf. Entscheidend ist nicht, wann ein Eintrag in Mampfo erfasst wird, sondern **wann tatsächlich gegessen wurde**.

### Verhalten

Liegt der Zeitpunkt eines neuen Ernährungseintrags innerhalb einer gespeicherten Fastenphase, fragt Mampfo:

- **Fasten um HH:MM beenden** – die betroffene Fastenphase endet zum Essenszeitpunkt.
- **Nur Essen speichern** – der Tagebucheintrag wird gespeichert, die Fastenphase bleibt unverändert.
- **Abbrechen** – es wird noch nichts gespeichert oder verändert.

Die Prüfung gilt für:

- normale manuelle Ernährungseinträge
- gespeicherte Lebensmittel
- Rezept-Einträge
- rückwirkend erfasste Mahlzeiten
- Tagebucheinträge, deren Datum oder Uhrzeit nachträglich verändert wird

### Rückwirkendes Beispiel

Fasten laut Verlauf:

**02.09. 19:30 → 03.09. 09:30**

Am 03.09. um 12:00 wird nachträglich ein Essen für **08:30** erfasst. Mampfo erkennt, dass 08:30 innerhalb der historischen Fastenphase liegt. Bei **Fasten um 08:30 beenden** wird daraus:

**02.09. 19:30 → 03.09. 08:30**

Der Tagesverlauf wird anschließend entsprechend neu berechnet.

### Schutzregeln

- Die Fastenzeit wird niemals stillschweigend verändert.
- Zukunftseinträge verändern keine Fastenphase.
- Einträge exakt an einer Phasengrenze lösen keine Abfrage aus.
- Beim Bearbeiten wird nur dann erneut geprüft, wenn Datum oder Uhrzeit geändert wurden.
- Datenmodell und vorhandene Speicherbereiche bleiben unverändert.

## Neu in v0.4.2.2 – Zeitlogik und Zukunftsschutz

v0.4.2.2 korrigiert einen Fehler, durch den zukünftige oder unpassende Fasten-Sessions die aktuell angezeigte Phase überschreiben konnten.

### Korrigiert

- Abgeschlossene Fastenphasen dürfen nicht mehr in der Zukunft enden.
- Bereits vorhandene ungültige Zukunfts-Sessions werden beim nächsten Abgleich automatisch entfernt und geplante Sessions anschließend aus dem gültigen Fastenplan neu aufgebaut.
- Die Erkennung **„Fasten vorzeitig beendet“** berücksichtigt nur noch Sessions, die das aktuell laufende geplante Fastenfenster tatsächlich überlappen.
- Ein alter Datensatz vom Vortag kann dadurch nicht mehr fälschlich eine Essensphase auslösen.
- Der Fastenverlauf zeigt eine aktuell laufende Fastenphase nur bis **jetzt** und kennzeichnet sie mit **„läuft“**. Es werden keine zukünftigen Minuten als bereits gefastet dargestellt.
- Beim Nachtragen oder Bearbeiten einer abgeschlossenen Fastenphase kann kein Endzeitpunkt in der Zukunft mehr gespeichert werden.
- Ein laufender Zeitraum im Verlauf öffnet beim Antippen die Bearbeitung der laufenden Fastenphase.

### Beispiel

Bei einem Plan mit Essensbeginn um 09:00 zeigt Mampfo um 08:45 korrekt:

- Startseite: **Heute · 🌙 Fasten**
- Timer: Fasten seit dem tatsächlichen Beginn, Ende um **09:00**
- Verlauf heute: z. B. **00:00–08:45 · 8 h 45 min Fasten · läuft**

Erst nach 09:00 wird der Tagesabschnitt als abgeschlossen dargestellt.

### Daten und Update

- bestehende korrekte Fasten-Sessions bleiben erhalten
- ungültige abgeschlossene Sessions mit Zukunftsende werden automatisch bereinigt
- Fastenpläne, Tagebuch, Lebensmittel und Rezepte bleiben unverändert
- Datenmodell bleibt Version 4
- Service-Worker-Cache auf v0.4.2.2 aktualisiert


## Neu in v0.4.2.1 – Fastenverlauf nach Kalendertagen

Der Fastenverlauf trennt jetzt die technische **Fastenphase** von der für einen Kalendertag sichtbaren **Fastenzeit**.

Eine zusammenhängende Session wie `31.08. 19:00 → 01.09. 09:00` bleibt intern unverändert gespeichert. In der Tagesansicht des Verlaufs wird davon am 01.09. nur der Anteil `00:00 → 09:00` angezeigt. Beginnt am 01.09. um 19:00 die nächste Session, erscheint zusätzlich `19:00 → 24:00`.

Damit zeigt ein typischer 14:10-Tag beispielsweise:

- **00:00–09:00** – 9 h Fasten
- **19:00–24:00** – 5 h Fasten
- **Fastenzeit an diesem Tag: 14 h**

### Bearbeiten und Nachtragen

Die Tagesabschnitte sind nur eine Darstellung. Ein Tipp auf einen Abschnitt öffnet weiterhin die vollständige zugrunde liegende Fastenphase mit ihrem echten Beginn und Ende. Auch beim Nachtragen werden weiterhin vollständige Fastenphasen erfasst.

### Historische Ziele

Der damalige Zielwert bleibt sichtbar. Falls innerhalb eines Kalendertags durch einen Planwechsel unterschiedliche Ziele vorkommen, weist Mampfo darauf hin.

### Daten und Update

- keine Migration der bestehenden Fasten-Sessions erforderlich
- bestehende Fastenphasen bleiben unverändert
- Tagebuch, Lebensmittel, Rezepte und Fastenpläne bleiben unverändert
- Datenmodell bleibt Version 4
- Service-Worker-Cache auf v0.4.2.1 aktualisiert

## Neu in v0.4.2 – Tatsächliche Fastenphasen und Verlauf

v0.4.2 erweitert den Fastenplan aus v0.4.1 um echte, lokal gespeicherte Fasten-Sessions.

### Fasten starten und beenden

Im Timer kann eine Fastenphase unabhängig vom Standardplan bewusst früher gestartet oder beendet werden:

- **Fasten jetzt beginnen**
- **Fasten jetzt beenden**
- **Zeit bearbeiten** für Beginn und geplantes Ende der laufenden Fastenphase

Eine einmalige Abweichung verändert den allgemeinen 12:12-, 14:10-, 16:8- oder benutzerdefinierten Plan nicht. Der reguläre Rhythmus wird beim nächsten passenden Zyklus fortgesetzt.

### Automatische Aufzeichnung

Geplante Fastenphasen werden anhand des gespeicherten Plans rekonstruiert. Dadurch bleiben Fastenzeiten nachvollziehbar, auch wenn Mampfo während des Phasenwechsels geschlossen oder das Gerät im Standby war.

Jede Fastenphase speichert unter anderem:

- tatsächlichen Beginn
- tatsächliches Ende
- geplantes Ende
- damaliges Fastenziel
- verwendeten Fastenplan
- Herkunft von Beginn und Ende (Plan oder manuell)

Historische Fastenzeiten bleiben damit stabil, auch wenn der Fastenplan später geändert wird.

### Verlauf

Unter **Fasten → Verlauf** werden abgeschlossene Fastenphasen chronologisch angezeigt.

Fastenphasen können:

- geöffnet und bearbeitet
- gelöscht
- nachträglich ergänzt

werden. Mampfo verhindert dabei überschneidende Fastenzeiträume.

### Startseite

Der bisherige breite „Heute“-Balken wurde durch einen kompakten, zentrierten Status ersetzt.

Am aktuellen Tag zeigt Mampfo bei eingerichtetem Fastenplan:

- **Heute · 🌙 Fasten**
- **Heute · 🍴 Essensphase**

Ohne Fastenplan erscheint nur **Heute**.

Bei einem anderen ausgewählten Datum erscheint stattdessen:

**↩ Zum heutigen Tag**

Damit dient das Element gleichzeitig als schneller Rücksprung zum aktuellen Datum.

### Daten und Update

- bestehende Tagebuchdaten bleiben unverändert
- gespeicherte Lebensmittel bleiben unverändert
- Rezepte bleiben unverändert
- Fastenpläne aus v0.4.1 bleiben erhalten
- Fasten-Sessions werden unter `mampfo.fastingSessions.v4` gespeichert
- Datenmodell bleibt Version 4
- Fasten funktioniert weiterhin vollständig lokal und offline


## v0.4.1 – Fastenplan und Timer

Das Hauptregister **Fasten** ist jetzt aktiv. v0.4.1 bildet den ersten Schritt des Fastenmoduls und konzentriert sich bewusst auf Plan und Timer.

### Fastenrhythmen

- **12:12** – 12 Stunden Fasten, 12 Stunden Essensphase
- **14:10** – 14 Stunden Fasten, 10 Stunden Essensphase
- **16:8** – 16 Stunden Fasten, 8 Stunden Essensphase
- **Eigener Rhythmus** – Fastendauer frei zwischen 1 und 23 Stunden festlegen

Als Orientierung kann entweder **Essensphase beginnt** oder **Fasten beginnt** gewählt werden. Dazu wird eine Uhrzeit hinterlegt. Mampfo berechnet daraus automatisch beide täglichen Zeitfenster.

### Timer

Der Timer läuft technisch nicht als dauerhafte Stoppuhr im Hintergrund. Mampfo berechnet die aktuelle Phase jederzeit aus Plan und Uhrzeit neu. Dadurch bleibt die Anzeige korrekt, wenn die PWA geschlossen, das Gerät gesperrt oder später wieder geöffnet wird.

Die Timeransicht zeigt abhängig von der aktuellen Phase unter anderem:

- Fasten oder Essensphase
- Startzeit der aktuellen Phase
- bereits vergangene Fastenzeit bzw. verbleibende Essenszeit
- verbleibende Fastenzeit
- geplante Wechselzeit
- Fortschrittsbalken
- aktuellen Fastenplan

Während die App geöffnet ist, wird die Anzeige regelmäßig aktualisiert und beim Zurückkehren aus dem Standby sofort neu berechnet.

### Planänderungen

Der erste Fastenplan wird sofort aktiviert. Wird ein bestehender Plan geändert, speichert Mampfo den neuen Rhythmus für den nächsten passenden Startzeitpunkt des neuen Plans. Damit wird ein laufender Tagesrhythmus nicht mitten in einer Phase umgestellt.

Fastenpläne werden als eigene Datensätze mit `activeFrom` gespeichert. v0.4.2 nutzt diese Historie nun zur Zuordnung tatsächlicher Fastenphasen.

### Daten und Update

- bestehende Tagebucheinträge bleiben unverändert
- gespeicherte Lebensmittel bleiben unverändert
- Rezepte bleiben unverändert
- neue Fastenpläne werden unter `mampfo.fastPlans.v4` gespeichert
- der Datenstand wird auf Version 4 erweitert
- Fasten funktioniert vollständig lokal und offline

## Neu in v0.3.3 – Zutatenbasierte Rezepte

Rezepte können jetzt auf zwei Arten angelegt und bearbeitet werden:

- **Nährwerte direkt:** wie bisher Gesamtwerte des Rezepts eingeben und durch die Portionszahl teilen lassen.
- **Aus Zutaten:** einzelne Zutaten hinterlegen und die Gesamtwerte automatisch von Mampfo berechnen lassen.

### Gespeicherte Lebensmittel als Zutaten

- gespeicherte Lebensmittel können direkt als Rezeptzutat ausgewählt werden
- die Menge wird in der zum Lebensmittel gespeicherten Einheit festgelegt
- Kalorien, Protein, Ballaststoffe, Fett und Kohlenhydrate werden automatisch auf die gewählte Menge skaliert
- der aktuelle Stand wird als **Snapshot** im Rezept gespeichert
- spätere Änderungen am gespeicherten Lebensmittel verändern bestehende Rezepte nicht automatisch

### Manuelle Zutaten

Eine Zutat kann auch unabhängig von der Lebensmitteldatenbank erfasst werden:

- Name
- Menge
- Einheit: g, ml, Stück oder Portion
- Kalorien
- Protein
- Ballaststoffe
- Fett
- Kohlenhydrate

Kalorien sind erforderlich, die übrigen Nährwerte bleiben optional.

Bei einer neuen manuellen Zutat kann optional **„Auch als Lebensmittel speichern“** gewählt werden. Existiert bereits ein Lebensmittel mit demselben Namen und anderen Werten, entscheidet der Nutzer, ob die gespeicherte Vorlage aktualisiert oder die Zutat nur für das Rezept verwendet werden soll.

### Automatische Rezeptberechnung

Mampfo summiert die Zutaten und berechnet daraus automatisch die Werte pro Portion.

Beispiel:

- 250 g Rote Linsen = 875 kcal
- 400 g Tomaten = 72 kcal
- Rezept gesamt = 947 kcal
- 4 Portionen = rund 237 kcal pro Portion

Fehlende optionale Nährwerte werden nicht als echte Null interpretiert. Fehlt beispielsweise bei mindestens einer Zutat der Ballaststoffwert, bleibt der Ballaststoff-Gesamtwert des Rezepts **offen**. Eine bewusst eingetragene `0` gilt dagegen als echter Nullwert.

### Zutatenverwaltung im Rezept

- Zutaten können nachträglich geöffnet und bearbeitet werden
- Mengen von Lebensmittel-Snapshots können geändert und automatisch neu skaliert werden
- manuelle Zutaten können vollständig geändert werden
- Zutaten können einzeln aus dem Rezept entfernt werden
- Rezeptdetail zeigt die Zutatenliste samt Menge und Kalorien

### Rezeptsuche

Die Suche im Rezeptregister und unter **Erfassen → Rezepte** findet jetzt:

- Rezeptnamen
- Namen enthaltener Zutaten

## Historische Stabilität

Die bestehende Snapshot-Logik bleibt erhalten:

- Änderungen an gespeicherten Lebensmitteln verändern bestehende Rezepte nicht rückwirkend
- Änderungen an Rezepten verändern bereits protokollierte Tagebucheinträge nicht rückwirkend
- gelöschte Lebensmittel entfernen keine Zutaten aus bestehenden Rezepten

## Bestehende Funktionen

- Tagesziele für Kalorien und Protein
- Tagesübersicht mit Kalorien, Protein und Ballaststoffen
- Fett und Kohlenhydrate als sekundäre Tageswerte
- Essen mit Datum und Uhrzeit erfassen
- Einträge bearbeiten und löschen
- gespeicherte Lebensmittel, Favoriten, Zuletzt/Häufig
- intelligente Suchvorschläge
- alte Tagebucheinträge nachträglich als Lebensmittel speichern
- Bezugsmenge und Einheiten g, ml, Stück und Portion
- automatische Skalierung gespeicherter Lebensmittel
- Rezepte mit direkter Nährwerteingabe
- freie Portionsmengen bei Rezepten
- Rezepte direkt unter **Erfassen** auswählen
- lokale Speicherung und Offline-PWA

## Datenmigration

v0.3.3 verwendet weiterhin `dataVersion = 3` und dieselben `mampfo.*`-Speicherbereiche.

Bestehende Rezepte aus v0.3.2.x werden automatisch als:

- `calculationMode = manual`
- `ingredients = []`

weitergeführt. Bestehende Lebensmittel, Tagebucheinträge, Rezepte und Einstellungen bleiben erhalten.

## Veröffentlichung auf GitHub Pages

Es gibt keinen Build-Prozess und keine externen Abhängigkeiten. Den Inhalt dieses Ordners direkt in das bestehende Repository kopieren und die vorhandenen Dateien ersetzen.

Der Service Worker verwendet einen versionsbezogenen Cache-Namen. Falls ein Gerät zunächst noch die alte Version zeigt, die installierte PWA einmal vollständig schließen und erneut öffnen.

## Lokaler Test

```bash
python -m http.server 8080
```

Danach `http://localhost:8080` im Browser öffnen.

## Noch Platzhalter

- Auswertung
- externe Lebensmitteldatenbank / Bundeslebensmittelschlüssel
- Cloud-Synchronisation

## Datenschutz

Mampfo speichert die Daten weiterhin ausschließlich lokal im jeweiligen Browser bzw. auf dem jeweiligen Gerät. Es gibt keine Anmeldung, keinen Server und keine Cloud-Synchronisation.

## Version

0.4.2


## Neu in v0.3.3.1

- Lebensmittel als eigener Reiter unter **Erfassen**
- Lebensmitteldatenbank weiterhin zusätzlich über Einstellungen erreichbar
- Neues Lebensmittel direkt aus der Datenbank anlegen
- Änderung der Bezugsmenge skaliert bei gleicher Einheit alle vorhandenen Nährwerte proportional
- Änderung einzelner Nährwerte verändert keine anderen Werte
- Einheitenwechsel wird bewusst nicht automatisch umgerechnet
- Komfortbutton **Auf 100 g umrechnen** bzw. **Auf 100 ml umrechnen**
- Historische Tagebucheinträge und Rezept-Snapshots bleiben unverändert
