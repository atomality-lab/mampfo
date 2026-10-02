# Update von v0.8.1 auf v0.8.2

v0.8.2 ist ein gezielter Synchronisations-Patch. Barcode-Scanner und übrige Funktionen bleiben unverändert.

## Wichtig vor dem Update

- **v0.9.0 noch nicht einspielen.**
- Keine Einträge manuell in Supabase löschen.
- Auf dem betroffenen Smartphone **keine Website-Daten / kein LocalStorage löschen**. Dort liegen eventuell noch offene lokale Löschmarken, die v0.8.2 korrekt in die Cloud übertragen kann.
- Ein normales bzw. hartes Neuladen der PWA ist in Ordnung.

## Empfohlener Ablauf

1. v0.8.2 auf GitHub veröffentlichen.
2. Zuerst das betroffene Smartphone vollständig schließen und neu öffnen.
3. Unter Einstellungen die Version **0.8.2** kontrollieren.
4. **Jetzt synchronisieren** ausführen.
5. Danach lokale und Cloud-Mengen erneut prüfen.
   - Cloud-Datensätze ohne lokale Löschmarke werden heruntergeladen.
   - Bewusst lokal gelöschte Datensätze mit Löschmarke werden in der Cloud gelöscht/tombstoned und erscheinen nicht wieder.
6. Erst wenn das Smartphone einen stabilen Stand zeigt, den Desktop ebenfalls auf v0.8.2 aktualisieren und synchronisieren.
7. Eventuelle verbliebene echte Konflikte erst danach prüfen.

## Supabase

Keine Schemaänderung erforderlich. Die vorhandene `supabase-config.js` im Repository beibehalten. `supabase-config.js` und `SUPABASE_SETUP.sql` sind nicht Bestandteil des Update-Pakets.
