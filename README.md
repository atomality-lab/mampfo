# Ernährungs-App – Prototyp v0.1.0

Arbeitsname / neutraler Prototyp. Der endgültige App-Name ist noch offen.

## Enthalten

- PWA-Grundgerüst, offlinefähig
- Ersteinrichtung für Kalorien- und Proteinziel
- Tagesübersicht mit Kalorien, Protein und Ballaststoffen
- Tagesnavigation vor/zurück und Sprung zu Heute
- Ernährungseinträge mit Datum und Uhrzeit
- Einträge erstellen, bearbeiten und löschen
- lokale Speicherung im Browser via localStorage
- Einstellungen für Tagesziele
- Platzhalter für Rezepte, Fasten und Auswertung
- responsives Smartphone-/Tablet-Layout
- pastelliges Design nach dem abgestimmten Prototyp

## Starten

### Lokal

Da Service Worker nicht zuverlässig über `file://` funktionieren, die Dateien am besten über einen kleinen lokalen Webserver starten:

```bash
python -m http.server 8080
```

Dann im Browser `http://localhost:8080` öffnen.

### GitHub Pages / Netlify

Der Inhalt dieses Ordners kann direkt veröffentlicht werden. Es gibt keine Build-Abhängigkeiten und keine externen Bibliotheken.

## App-Namen später ändern

Der sichtbare Name ist zentral in `config.js` hinterlegt. Zusätzlich sollten bei Festlegung des endgültigen Namens `manifest.webmanifest` und der `<title>`-Fallback in `index.html` angepasst werden.

## Datenspeicherung

v0.1 speichert alle Daten ausschließlich lokal im jeweiligen Browser/Gerät. Ein Export, Import oder Geräte-Sync ist noch nicht enthalten.

## Version

0.1.0
