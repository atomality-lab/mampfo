# Update von Mampfo v0.6.4 auf v0.7.1

1. Die Dateien aus diesem Paket über die bestehenden Mampfo-Dateien im GitHub-Repository kopieren.
2. Die bereits vorhandene `supabase-config.js` im Repository **behalten**. Sie ist absichtlich nicht Bestandteil dieses ZIPs.
3. Es ist **keine Änderung an Supabase und kein neues SQL-Skript** nötig.
4. GitHub Pages vollständig deployen lassen.
5. Mampfo danach einmal hart neu laden bzw. die installierte PWA komplett schließen und neu öffnen.
6. Version **0.7.1** prüfen.
7. Unter **Erfassen → Lebensmittel → BLS 4.0** die offizielle BLS-Hauptdatei einmalig importieren.

## Wichtig zur BLS-Datenbank

Die BLS-Referenzdaten werden lokal in IndexedDB gespeichert und nicht über deine persönliche Supabase-Synchronisation verteilt. Übernommene einzelne BLS-Lebensmittel werden dagegen ganz normal als persönliche Lebensmittel synchronisiert.
