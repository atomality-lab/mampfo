# Update von v0.8.2 auf v0.8.3

v0.8.3 behebt einen Cache-Fehler, durch den ein Gerät beim Synchronisieren veraltete Supabase-Antworten lesen konnte. Datenmodell und Supabase-Schema bleiben unverändert.

## Wichtig vor dem Update

- **v0.9.0 noch nicht einspielen.**
- Keine Website-Daten und keinen LocalStorage löschen.
- `supabase-config.js` im Repository beibehalten.

## Empfohlener Ablauf

1. v0.8.3 auf GitHub veröffentlichen.
2. Mampfo auf Smartphone und Desktop vollständig schließen.
3. Zuerst das Smartphone neu öffnen und kontrollieren, dass **Version 0.8.3** angezeigt wird.
4. Auf dem Smartphone **Jetzt synchronisieren** ausführen. Der neue gescannte Artikel und die neuen Ernährungseinträge sollen dabei in die Cloud geschrieben bzw. bestätigt werden.
5. Danach Mampfo auf dem Desktop neu öffnen und ebenfalls Version **0.8.3** kontrollieren.
6. Auf dem Desktop **Jetzt synchronisieren** ausführen. Die Smartphone-Daten sollen jetzt aus dem aktuellen Supabase-Stand übernommen werden.
7. Danach lokale und Cloud-Mengen vergleichen. Der Status soll sich auf **Alles aktuell** stabilisieren, sofern keine echten Konflikte offen sind.

## Technische Korrektur

- Der Service Worker greift nur noch auf GET-Anfragen derselben Origin zu und cached keine externen APIs mehr.
- Supabase-REST-GETs werden zusätzlich mit `cache: no-store` ausgeführt.
- Offline-App-Cache bleibt erhalten.
- Keine Änderung am Supabase-Schema.

`supabase-config.js` und `SUPABASE_SETUP.sql` sind nicht Bestandteil des Update-Pakets.
