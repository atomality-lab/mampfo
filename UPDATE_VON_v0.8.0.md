# Update von v0.8.0 auf v0.8.1

v0.8.1 ist ein **reiner Synchronisations-Recovery-Patch**. Barcode-Scanner und übrige Funktionen aus v0.8.0 bleiben unverändert.

## Wichtig bei aktuell auseinander gelaufenen Geräten

1. **v0.9.0 noch nicht einspielen.**
2. Auf beiden Geräten Mampfo zunächst schließen und keine weiteren Einträge löschen oder Konflikte lösen.
3. v0.8.1 veröffentlichen.
4. Zuerst das Gerät öffnen, auf dem die **vollständigsten aktuellen Daten** sichtbar sind. Sind die fehlenden heutigen Ernährungseinträge auf beiden Geräten vorhanden, kann der Desktop mit dem größeren Gesamtbestand zuerst verwendet werden.
5. Version **0.8.1** kontrollieren und einmal **Jetzt synchronisieren**.
6. Danach in Mampfo die lokalen/Cloud-Mengen prüfen und in Supabase kontrollieren, ob die fehlenden heutigen Ernährungseinträge und gescannten Lebensmittel angekommen sind.
7. Erst danach das zweite Gerät auf v0.8.1 öffnen und **Jetzt synchronisieren**.
8. Eventuelle echte Konflikte anschließend prüfen. Fachlich bereits identische Konflikte werden von v0.8.1 automatisch bereinigt.

## Was v0.8.1 repariert

- Neue lokale Datensätze können nicht mehr durch einen parallel laufenden älteren Sync-Snapshot überholt werden.
- Fehlt eine aktive, lokal vorhandene ID physisch in Supabase, wird sie erneut hochgeladen.
- Harmlose technische Unterschiede erzeugen keinen Endloskonflikt mehr.
- Der Sync startet automatisch neu, wenn während des Abgleichs neue lokale Änderungen entstehen.

## Supabase

Für v0.8.1 ist **keine Änderung am Supabase-Schema** erforderlich.

`supabase-config.js` und `SUPABASE_SETUP.sql` sind nicht Bestandteil des Update-Pakets. Die vorhandene `supabase-config.js` im Repository beibehalten.
