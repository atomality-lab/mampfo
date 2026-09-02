# Mampfo v0.4.2

Mampfo ist eine persönliche, lokal gespeicherte PWA zum Ernährungstracking.

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
