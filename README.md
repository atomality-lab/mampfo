# Mampfo v0.7.3


## Neu in v0.7.3 – eine Suche für alles Essbare

- Zentrale Suche oben unter **Erfassen** über eigene Lebensmittel, eigene Rezepte, BLS 4.0 und Open Food Facts.
- Eigene Lebensmittel und Rezepte werden priorisiert. Rezepte werden auch über ihre Zutaten gefunden.
- BLS wird lokal bereits beim Tippen durchsucht. Open Food Facts wird bewusst erst mit **Suchen** abgefragt.
- Externe BLS-/Open-Food-Facts-Treffer lassen sich direkt als gegessen erfassen.
- Bei externen Treffern gibt es **Nur erfassen** und **Erfassen & speichern**. Beim zweiten Weg wird zusätzlich ein normales persönliches Lebensmittel mit stabiler Quellen-ID angelegt.
- Bereits gespeicherte BLS-/Open-Food-Facts-Treffer werden erkannt und direkt über die persönliche Lebensmittelversion erfasst.
- Tagebucheinträge bleiben Snapshots. Spätere Änderungen am gespeicherten Lebensmittel verändern alte Einträge nicht.
- Keine Änderung am Supabase-Schema. BLS bleibt pro Gerät lokal importiert; nur übernommene persönliche Lebensmittel werden synchronisiert.
- Service-Worker-Cache: `mampfo-v0.7.3`.

Mampfo ist eine persönliche **Local-first-PWA** zum Ernährungstracking. Die App funktioniert weiterhin vollständig mit lokalen Daten und kann angemeldete Geräte über die persönliche Supabase-Cloud abgleichen.

## Neu in v0.7.2.7 – lokale Fasten-Dubletten bereinigen

Dieser Patch behebt einen Altzustand auf einzelnen Geräten, bei dem lokal eine zusätzliche aktive Fastenphase vorhanden war, obwohl die Cloud bereits den bereinigten kanonischen Bestand enthielt.

- fachlich exakt gleiche Fasten-Sessions werden anhand von `cycleKey`, Start, Ende, geplantem Ende, Plan und Ziel erkannt
- existiert die kanonische aktive Session bereits in der Cloud, wird eine zusätzliche rein lokale UUID entfernt
- alte Baseline-/Löschmarker der Dublette werden mit aufgeräumt
- echte unterschiedliche Fastenzeiten bleiben unangetastet und werden weiterhin über die Konfliktlogik behandelt
- keine Änderung am Supabase-Schema
- Service-Worker-Cache: `mampfo-v0.7.2.7`

## Neu in v0.7.2.6 – stabiler Synchronisationsstatus

Dieser Patch behebt einen rein lokalen Nachlaufzustand, der vor allem nach der Fasten-Dublettenbereinigung auftreten konnte: Der eigentliche Sync war abgeschlossen und zeigte kurz **Alles aktuell**, danach setzte eine verwaiste technische Fasten-Löschmarke oder eine alte Baseline-ID den Status wieder auf **Lokaler Stand muss abgeglichen werden**.

### Korrigiert

- erledigte technische Fasten-Tombstones werden nicht mehr als offene lokale Änderung gewertet
- verwaiste Tombstones werden beim Vollsync entfernt, wenn eine aktive Session derselben `cycleKey` vorhanden ist
- alte Baseline-IDs ohne lokalen und ohne Cloud-Datensatz werden bereinigt
- Cloud-Pulls erzeugen nach Abschluss nicht direkt wieder neue Fasten-Reparaturänderungen
- bestehende Daten, Supabase-Schema und Konfliktlogik bleiben unverändert
- Service-Worker-Cache: `mampfo-v0.7.2.6`

## Neu in v0.7.2.5 – Fasten-Reparatur

Dieser Patch behebt zwei miteinander verknüpfte Probleme in der Fastenlogik.

- identische geplante Fastenphasen derselben `cycleKey` werden nicht mehr doppelt geführt
- rein technische Unterschiede zwischen zwei sonst identischen Fasten-Sessions erzeugen keinen Sync-Konflikt mehr
- ein letztes Essen kurz nach dem geplanten Fastenbeginn verschiebt den **Start der Fastenphase** auf die Essenszeit
- ein erstes Essen am Morgen beendet die Fastenphase weiterhin vorzeitig
- bekannte historische Fehlphasen werden beim Start automatisch repariert und überzählige Dubletten beim nächsten Sync in der Cloud entfernt

Beispiel: Bei Plan `19:00–09:00` und letztem Essen um `19:12` lautet der korrekte Verlauf anschließend `19:12–09:00`, nicht `19:00–19:12`.

Es ist keine Änderung an Supabase erforderlich.

## Neu in v0.7.2.4 – Sync-Status stabilisiert

Der Patch bereinigt veraltete lokale Löschmarken, die auf einzelnen Geräten trotz vollständig synchronisierter Daten dauerhaft den Status **„Lokaler Stand muss abgeglichen werden“** auslösen konnten.

- bereits bestätigte Löschungen werden lokal aufgeräumt
- echte offene Löschungen bleiben geschützt
- keine Änderung an Supabase erforderlich
- Daten- und Konfliktlogik bleiben unverändert

## Neu in v0.7.2.3 – Sync-Status normalisiert

Dieser kleine Patch korrigiert eine rein lokale Statusabweichung nach erfolgreichem Geräteabgleich. Ältere Mampfo-Datensätze können beim Laden um harmlose Standardfelder ergänzt werden. Dadurch konnte der interne JSON-Hash vom zuletzt gespeicherten Sync-Hash abweichen, obwohl fachlich dieselben Daten vorhanden waren.

### Geändert

- **„Lokaler Stand muss abgeglichen werden“** wird nicht mehr allein durch kosmetische Hash-Unterschiede ausgelöst.
- Für die zusätzliche Statusprüfung zählen nur noch strukturelle Unterschiede: neue/fehlende IDs, echte Tombstones und explizite Löschmarken.
- Normale lokale Bearbeitungen bleiben weiterhin zuverlässig sichtbar, weil sie den persistenten Status **„Abgleich ausstehend“** setzen.
- Die eigentliche Drei-Wege-Synchronisation, Konfliktlogik und Löschlogik wurden nicht verändert.
- Keine Änderung an Supabase oder am Datenmodell erforderlich.
- Service-Worker-Cache: `mampfo-v0.7.2.3`.

## Neu in v0.7.2.2 – Sicherer Geräteabgleich

Dieser Patch korrigiert die Lösch- und Wiederherstellungslogik der Cloud-Synchronisation. Ein Datensatz, der auf einem Gerät lokal fehlt, wird nicht mehr automatisch als bewusst gelöscht interpretiert.

- Nur ein echter Löschvorgang in Mampfo erzeugt eine lokale Löschmarke.
- Fehlt ein aktiver Cloud-Datensatz lokal ohne solche Marke, lädt Mampfo ihn beim Sync wieder auf das Gerät.
- Bestehende Cloud-Daten können damit unvollständige lokale Gerätebestände reparieren.
- Unterschiedliche lokale und Cloud-Datenmengen werden in den Einstellungen nicht mehr fälschlich als vollständig aktuell dargestellt.

Für Geräte, die bereits vor diesem Patch Daten vermissen, ist die Cloud bewusst die sichere Wiederherstellungsquelle, solange der Cloud-Datensatz dort noch aktiv vorhanden ist.

## Neu in v0.7.2.1 – Produktsuche korrigiert

Die in v0.7.2 verwendete Search-a-licious-URL konnte im Browser eine HTML-Demoseite statt JSON zurückgeben. v0.7.2.1 verwendet deshalb für die Volltextsuche den weiterhin verfügbaren Open-Food-Facts-v1-Suchendpunkt.

Zusätzlich prüft Mampfo jetzt das Antwortformat, bevor JSON verarbeitet wird. Unerwartete HTML-Antworten werden als verständlicher Suchfehler angezeigt. Die Übernahme von Produkten, Barcodes, Nährwert-Snapshots und die Quellen-Deduplizierung bleiben unverändert.

## Neu in v0.7.2 – Open Food Facts & Quellen-Deduplizierung

Mampfo ergänzt die lokale BLS-Referenz um **Open Food Facts** für konkrete Marken- und Handelsprodukte. Unter **Erfassen → Lebensmittel** stehen jetzt drei Quellen bereit:

- **Meine Lebensmittel** – persönliche, synchronisierte Mampfo-Lebensmittel
- **BLS 4.0** – lokal importierte deutsche Referenzlebensmittel
- **Produkte** – Online-Suche in Open Food Facts

### Open-Food-Facts-Suche

Die Produktsuche wird bewusst erst über **Suchen** gestartet und nicht bei jedem Tastendruck. Mampfo zeigt bis zu 20 Treffer mit Produktname, Marke, Barcode, Packungsgröße sowie den für Mampfo relevanten Nährwerten.

Verwendet werden die normalisierten Werte pro **100 g bzw. bei Flüssigkeiten pro 100 ml**:

- Kalorien
- Protein
- Ballaststoffe
- Fett
- Kohlenhydrate

Fehlende Werte bleiben wie in der restlichen App offen. Produkte ohne Energieangabe können nicht direkt übernommen werden.

Mit **In meine Lebensmittel übernehmen** entsteht ein normaler persönlicher Mampfo-Snapshot. Er enthält den Barcode als `sourceId`, wird über Supabase synchronisiert und kann danach wie jedes andere Lebensmittel bearbeitet, favorisiert, in Rezepten genutzt und ins Tagebuch eingetragen werden. Die Open-Food-Facts-Suche selbst benötigt Internet.

### Doppelte externe Lebensmittel verhindern

BLS-Code und Open-Food-Facts-Barcode werden beim Geräteabgleich als stabile Quellenkennungen verwendet. Wird dasselbe BLS-/OFF-Lebensmittel auf zwei Geräten unabhängig übernommen, vereinheitlicht Mampfo die interne Lebensmittel-ID beim nächsten Sync und aktualisiert dazugehörige Tagebuch- und Rezeptverknüpfungen.

Sind die eigentlichen Lebensmittelwerte auf beiden Geräten unterschiedlich verändert worden, werden sie weiterhin nicht still überschrieben; die normale Konfliktlogik bleibt zuständig.

### Cloud / Update

Für v0.7.2 ist **keine Supabase-SQL-Änderung** erforderlich. Wie gewünscht enthält das Update weder `supabase-config.js` noch `SUPABASE_SETUP.sql`.

## Neu in v0.7.1 – BLS 4.0

Mampfo kann jetzt die offizielle deutsche Nährstoffdatenbank **Bundeslebensmittelschlüssel (BLS) 4.0** als lokale Referenz verwenden.

### Einmalige Einrichtung pro Gerät

Unter **Erfassen → Lebensmittel → BLS 4.0** führt Mampfo durch den Import:

1. offizielle BLS-Downloadseite öffnen
2. die Hauptdatei `BLS_4_0_Daten_2025_DE.xlsx` herunterladen
3. diese Datei in Mampfo auswählen
4. Mampfo extrahiert lokal die für die App benötigten Werte

Die große Originaldatei wird nicht dauerhaft in Mampfo gespeichert. Gespeichert werden nur die kompakt benötigten Referenzdaten. Danach funktioniert die BLS-Suche offline.

### Suche und Übernahme

Die BLS-Suche zeigt bis zu 40 passende Treffer und berücksichtigt deutsche Namen, englische Namen und BLS-Codes. Ein Treffer zeigt die Mampfo-relevanten Nährwerte pro 100 g essbarem Anteil.

Mit **In meine Lebensmittel übernehmen** wird daraus ein normales persönliches Mampfo-Lebensmittel mit 100 g Bezugsmenge. Dieses persönliche Lebensmittel wird wie gewohnt über Supabase zwischen Geräten synchronisiert und kann später bearbeitet, favorisiert, in Rezepten verwendet oder mit beliebigen Mengen ins Tagebuch eingetragen werden.

Die vollständige BLS-Referenzdatenbank selbst wird bewusst nicht in deine persönliche Supabase-Cloud kopiert. Deshalb muss sie auf jedem Gerät einmal lokal importiert werden.

### Datenqualität

Mampfo verwendet aus BLS 4.0 aktuell:

- Energie / Kalorien (`ENERCC`)
- Protein (`PROT625`)
- Fett (`FAT`)
- verfügbare Kohlenhydrate (`CHO`)
- Gesamtballaststoffe (`FIBT`)

Fehlende Werte bleiben offen und werden nicht künstlich zu Null.

### Quelle und Lizenz

Max Rubner-Institut (2025): **Bundeslebensmittelschlüssel (BLS), Version 4.0 – Deutsche Nährstoffdatenbank**. Karlsruhe. DOI: `10.25826/Data20251217-134202-0`. Lizenz: **CC BY 4.0**.

Weitere Hinweise stehen in `BLS_IMPORT.md` und `THIRD_PARTY_LICENSES.md`.

## Neu in v0.6.4 – Sync-Komfort & Transparenz

v0.6.4 baut auf dem stabilen Geräteabgleich aus v0.6.3 auf. Die Synchronisations- und Supabase-Datenstruktur bleibt unverändert; der Schwerpunkt liegt auf einer verständlicheren Bedienung und sichtbaren Zuständen.

### Neuer Sync-Status

Unter **Einstellungen → Datenaustausch** zeigt Mampfo jetzt deutlich einen der Zustände:

- **Alles aktuell**
- **Synchronisierung läuft**
- **Abgleich ausstehend**
- **Offline**
- **Konflikte offen**
- **Letzter Abgleich fehlgeschlagen**

Zusätzlich werden angezeigt:

- letzter erfolgreicher Abgleich
- letzter Synchronisationsversuch
- Anzahl der beim letzten Erfolg hoch- und heruntergeladenen Datensätze
- offene Konflikte nach Datenart

### Gerätename

Jedes Gerät erhält automatisch einen lokalen Namen wie **Windows-PC**, **iPad** oder **Android-Smartphone**. Der Name kann in den Cloud-Einstellungen geändert werden. Er dient nur der Orientierung und wird nicht in Supabase gespeichert.

### Verbesserte Fehlermeldungen

Typische Anmelde-, Netzwerk-, Sitzungs- und Berechtigungsfehler werden verständlicher formuliert. Bei Netzproblemen bleibt weiterhin alles lokal erhalten.

### Update-Dateien

Wie gewünscht enthält das v0.6.4-Paket **weder `supabase-config.js` noch `SUPABASE_SETUP.sql`**. Die bereits eingerichteten Dateien im Repository bleiben bestehen. Es ist keine SQL-Migration erforderlich.

- Datenmodell bleibt Version 4
- bestehende Supabase-Tabellen/RLS bleiben unverändert
- Service-Worker-Cache: `mampfo-v0.6.4`

## Neu in v0.6.3 – Robuster Sync, Offline-Warteschlange & Rücksprungpunkt

v0.6.3 härtet den Geräteabgleich aus v0.6.2 ab. Die Datenstruktur in Supabase bleibt unverändert; es ist **keine SQL-Migration** erforderlich.

### Offline-Verhalten

- Mampfo arbeitet offline unverändert lokal weiter.
- Lokale Änderungen werden als **Synchronisierung ausstehend** vorgemerkt.
- Sobald die Internetverbindung zurückkehrt, wird der Abgleich erneut angestoßen.
- Läuft ein Supabase-Token während Offline-Betrieb ab, wird die lokale Anmeldung nicht mehr vorschnell gelöscht. Die Sitzung wird erst bei einem echten Authentifizierungsfehler verworfen.
- In **Einstellungen → Datenaustausch** ist der Offline-Zustand sichtbar; Cloud-Aktionen bleiben bis zur Rückkehr der Verbindung deaktiviert.

### Sicherer Wiederanlauf

Der Drei-Wege-Abgleich bleibt transaktionsähnlich aufgebaut: Der lokale Baseline-Stand wird erst nach einem vollständigen erfolgreichen Durchlauf aktualisiert. Wird ein Sync während einzelner Uploads unterbrochen, kann der nächste Durchlauf bereits übertragene Datensätze wiedererkennen und den Abgleich fortsetzen, statt sie als neue Version zu duplizieren.

### Lokaler Rücksprungpunkt

Vor einem regulären Cloud-Abgleich speichert Mampfo genau **einen lokalen Rücksprungpunkt** des aktuellen Datenbestands. Wird bei einem Cloud-Pull oder einer Konfliktentscheidung die Cloud-Version lokal übernommen, kann unter **Einstellungen → Datenaustausch** der vorherige lokale Stand wiederhergestellt werden.

Die Wiederherstellung gilt als neue lokale Änderung. Beim nächsten erfolgreichen Sync wird dieser wiederhergestellte Stand deshalb regulär mit der Cloud abgeglichen.

Der Rücksprungpunkt liegt nur lokal auf dem jeweiligen Gerät unter `mampfo.syncBackup.v3.<userId>` und ist kein zusätzliches Cloud-Backup.

### Konflikte und Löschungen

- Konflikte aus v0.6.2 bleiben erhalten und werden niemals automatisch überschrieben.
- Die Wahl **Cloud-Version verwenden** legt vorher ebenfalls einen lokalen Rücksprungpunkt an.
- synchronisierte Löschmarken und Fasten-Tombstones bleiben unverändert erhalten.
- ein Verbindungsabbruch löscht weder Konflikte noch Baseline noch lokale Nutzdaten.

### Update-Paket

Auf Wunsch enthält das v0.6.3-ZIP **nicht** mehr:

- `supabase-config.js`
- `SUPABASE_SETUP.sql`

Die bereits konfigurierte `supabase-config.js` und das vorhandene Supabase-Schema im Repository bleiben damit unangetastet. Das ZIP ist deshalb als **Update über die bestehende Installation** gedacht, nicht als frische Supabase-Ersteinrichtung.

### Technik

- keine Änderung am Supabase-Schema
- Datenmodell bleibt Version 4
- neue lokale Sicherheitskopie `mampfo.syncBackup.v3.<userId>`
- Sync-Status merkt zusätzlich ausstehende Offline-Abgleiche
- Service-Worker-Cache: `mampfo-v0.6.3`

## Neu in v0.6.2 – Geräteübergreifende Synchronisation

v0.6.2 aktiviert den eigentlichen bidirektionalen Abgleich zwischen mehreren Mampfo-Geräten. Die App bleibt **Local-first**: Daten werden lokal gespeichert und anschließend über die persönliche Supabase-Cloud abgeglichen.

### Automatisch synchronisiert werden

- Ernährungseinträge
- gespeicherte Lebensmittel und Favoriten
- Rezepte inklusive Zutaten-Snapshots
- Fastenpläne
- Fasten-Sessions
- Tagesziele / Einstellungen

### Abgleichslogik

- neue Datensätze mit unterschiedlichen IDs werden automatisch zusammengeführt
- nur lokal geänderte Datensätze werden in die Cloud übertragen
- nur in der Cloud geänderte Datensätze werden lokal übernommen
- identische Änderungen auf beiden Seiten werden ohne Konflikt akzeptiert
- unterschiedliche Änderungen desselben Datensatzes werden **nicht** automatisch überschrieben
- Konflikte können mit **Dieses Gerät verwenden** oder **Cloud-Version verwenden** gelöst werden

### Löschungen

Löschungen werden mit synchronisiert. Dafür nutzt die Cloud Löschmarken, sodass ein auf einem Gerät gelöschter Datensatz auf einem anderen Gerät nicht wieder auftaucht. Fasten-Sessions behalten zusätzlich die für die bestehende Fastenlogik wichtigen Tombstones.

### Automatischer Sync

Mampfo stößt den Abgleich an:

- nach gespeicherten lokalen Änderungen
- beim App-Start
- bei Rückkehr aus dem Hintergrund
- wenn die Internetverbindung wieder verfügbar ist
- manuell über **Jetzt synchronisieren**

Während eines offenen Bearbeitungsformulars oder Dialogs wird kein automatischer Cloud-Pull gestartet.

### Update von v0.6.1

Das Supabase-Schema aus v0.6.1 ist bereits kompatibel; es ist keine Datenbankmigration nötig. Beim Aktualisieren auf GitHub die bereits ausgefüllte **`supabase-config.js` unbedingt behalten** oder die beiden Werte anschließend wieder eintragen.

### Technik

- bestehende Mampfo-Daten bleiben unter denselben LocalStorage-Schlüsseln
- Datenmodell bleibt Version 4
- neuer lokaler Sync-Vergleichsstand `mampfo.syncBaseline.v2.<userId>`
- offene Konflikte werden lokal unter `mampfo.syncConflicts.v2.<userId>` gespeichert
- Cloud-Löschungen nutzen die bereits vorhandene Spalte `deleted_at`
- kein Realtime-Zwang; Synchronisation erfolgt ereignisbasiert
- Service-Worker-Cache: `mampfo-v0.6.2`

## Neu in v0.6.1 – Mampfo Cloud: Fundament

v0.6.1 führt noch **keine automatische Synchronisation** durch. Die Version schafft bewusst zuerst einen sicheren Ausgangspunkt.

### Neu

- neuer Bereich **Einstellungen → Datenaustausch**
- Supabase-Anmeldung mit E-Mail und Passwort
- neues Konto direkt in Mampfo anlegen
- Anmeldesitzung lokal speichern und bei Bedarf über das Refresh-Token erneuern
- lokalen Datenbestand und persönlichen Cloud-Bestand zählen/anzeigen
- kontrollierter **Erst-Upload** des vorhandenen lokalen Mampfo-Bestands
- Upload nur, wenn die persönliche Mampfo-Cloud leer ist
- bereits vorhandene Cloud-Daten werden nicht überschrieben oder zusammengeführt
- lokale Daten bleiben bei Upload-, Netzwerk- oder Loginfehlern unverändert

### Cloud-Datenbereiche

Der Erst-Upload umfasst:

- Ernährungseinträge
- gespeicherte Lebensmittel und Favoriten
- Rezepte inklusive Zutaten-Snapshots
- Fastenpläne
- Fasten-Sessions
- Tagesziele/Einstellungen

Die Auswertungen selbst werden weiterhin live aus diesen Daten berechnet und nicht separat gespeichert.

### Sicherheit

Im ursprünglichen v0.6.1-Paket lag `SUPABASE_SETUP.sql`. Das Skript aktiviert **Row Level Security (RLS)** auf allen Mampfo-Cloudtabellen und erlaubt angemeldeten Benutzern nur Zugriff auf ihre eigenen Zeilen. Im Browser wird ausschließlich ein **Publishable Key** verwendet. Secret- oder `service_role`-Keys dürfen niemals in Mampfo eingetragen werden.

### Einrichtung

Für die damalige Ersteinrichtung galt folgende Kurzfassung:

1. eigenes Supabase-Projekt für Mampfo anlegen
2. `SUPABASE_SETUP.sql` im SQL Editor ausführen
3. Project URL und Publishable Key in `supabase-config.js` eintragen
4. Dateien auf GitHub Pages veröffentlichen
5. in Mampfo anmelden, Cloud prüfen und Erst-Upload bestätigen

### Bewusste Grenze von v0.6.1

Ein zweites Gerät, das sich nach dem Erst-Upload anmeldet, erkennt zwar den vorhandenen Cloud-Bestand, lädt ihn aber noch **nicht automatisch herunter**. Der sichere bidirektionale Merge folgt in **v0.6.2**.

### Technik

- bestehende LocalStorage-Schlüssel und Datenmodell Version 4 bleiben erhalten
- neue Cloud-Session wird getrennt unter `mampfo.cloudSession.v1` gespeichert
- eindeutige lokale Geräte-ID unter `mampfo.deviceId.v1`
- keine externe JavaScript-Bibliothek erforderlich; Cloud-Zugriffe erfolgen über die Supabase Auth- und Data-API
- Service-Worker-Cache: `mampfo-v0.6.1`

## Neu in v0.5.3 – Rhythmus & Gesamtübersicht

Mit v0.5.3 ist die Auswertung vollständig: Neben Ernährung und Fasten analysiert Mampfo nun auch den tatsächlichen Essensrhythmus.

### Rhythmus

- erste Mahlzeit pro Tag
- letzte Mahlzeit pro Tag
- tatsächliches Essensfenster zwischen erster und letzter Mahlzeit
- Durchschnittswerte für alle drei Kennzahlen
- Tagesrhythmus auf einer 24-Stunden-Zeitlinie
- Fastenzeit des jeweiligen Kalendertages wird in der Rhythmuszeile mit angezeigt
- bei nur einem Ernährungseintrag wird kein künstliches Essensfenster berechnet
- Abweichungen vom damaligen geplanten Essensfenster werden neutral gekennzeichnet

### Gesamtübersicht und Vergleich

Die Übersicht zeigt zusätzlich die drei Rhythmus-Kennzahlen und einen neutralen Vergleich mit dem vorherigen Zeitraum. Verglichen werden Kalorien, Protein, Fastenzeit, Zeitpunkt der ersten Mahlzeit und Essensfenster. Veränderungen werden nur beschrieben, nicht bewertet.

### Technik

- keine neuen persistenten Statistikdaten
- bestehende Tagebuch-, Lebensmittel-, Rezept- und Fastendaten bleiben unverändert
- Datenmodell bleibt Version 4
- Service-Worker-Cache: `mampfo-v0.5.3`

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

Das Hauptregister **Auswertung** wurde mit v0.5.1 aktiviert. Die Ernährungsauswertung bleibt unverändert verfügbar; Fasten ist ab v0.5.2 und Rhythmus ab v0.5.3 aktiv.

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
