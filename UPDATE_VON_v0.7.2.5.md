# Update von Mampfo v0.7.2.5 auf v0.7.2.6

1. Die Dateien aus v0.7.2.6 über die bisherigen Mampfo-Dateien im GitHub-Repository kopieren.
2. Die bestehende `supabase-config.js` im Repository behalten und nicht ersetzen oder löschen.
3. `SUPABASE_SETUP.sql` ist für dieses Update nicht erforderlich.
4. GitHub Pages vollständig deployen lassen.
5. Auf dem betroffenen Gerät Mampfo hart neu laden bzw. die installierte PWA vollständig schließen und neu öffnen.
6. In Einstellungen → Datenaustausch einmal **Jetzt synchronisieren** ausführen.
7. Bei identischen Beständen und ohne offene Konflikte sollte der Status anschließend dauerhaft **Alles aktuell** anzeigen.

Der Patch verändert keine fachlichen Ernährungs- oder Fastendaten. Er räumt ausschließlich veraltete lokale Sync-Metadaten und technische Fasten-Tombstones auf.
