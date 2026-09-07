# Update von Mampfo v0.7.2.1 auf v0.7.2.2

## Wichtig bei unvollständigen lokalen Daten

Wenn auf einem Gerät weniger Ernährungseinträge als in der Cloud angezeigt werden, ist v0.7.2.2 als Wiederherstellungspatch gedacht.

1. Dateien aus v0.7.2.2 ins bestehende GitHub-Repository übernehmen.
2. Die vorhandene `supabase-config.js` unverändert im Repository lassen.
3. `SUPABASE_SETUP.sql` ist für dieses Update nicht erforderlich.
4. GitHub Pages vollständig deployen lassen.
5. Mampfo auf dem betroffenen Gerät hart neu laden bzw. die PWA komplett schließen und neu öffnen.
6. Unter **Einstellungen → Datenaustausch** den Cloud-Stand prüfen.
7. **Jetzt synchronisieren** ausführen.

Aktive Cloud-Datensätze, die lokal ohne echte Löschmarke fehlen, werden wiederhergestellt.

### Hinweis zu alten Löschungen

Vor v0.7.2.2 kann Mampfo nicht sicher unterscheiden, ob ein fehlender lokaler Datensatz bewusst gelöscht wurde oder durch einen Sync-Fehler fehlt. Deshalb entscheidet dieser Reparaturpatch im Zweifel zugunsten der vorhandenen Cloud-Daten. Ein früher bewusst gelöschter Datensatz kann dadurch einmalig wieder erscheinen. Wird er unter v0.7.2.2 erneut gelöscht, wird die Löschung künftig eindeutig synchronisiert.
