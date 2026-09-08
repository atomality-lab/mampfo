# Update von Mampfo v0.7.2.6 auf v0.7.2.7

1. Die Dateien aus v0.7.2.7 über die bisherigen App-Dateien im GitHub-Repository kopieren.
2. Die vorhandene `supabase-config.js` im Repository **nicht löschen oder überschreiben**. Sie ist im Update-Paket nicht enthalten.
3. Es ist **kein neues SQL-Skript** in Supabase erforderlich.
4. GitHub-Pages-Deployment abwarten.
5. Auf dem betroffenen Smartphone die PWA vollständig schließen und neu öffnen; falls nötig hart neu laden.
6. Unter Einstellungen → Datenaustausch einmal **Jetzt synchronisieren** auslösen.
7. Bei einem Bestand von zuvor 8 lokalen und 7 Cloud-Fastenphasen sollte die rein lokale fachlich identische Dublette entfernt werden und anschließend 7 / 7 angezeigt werden.
8. Danach den Fastenverlauf des 06.09. prüfen.

Der Patch entfernt nur Fasten-Sessions, die fachlich exakt einer vorhandenen aktiven Cloud-Session entsprechen und deren eigene lokale ID in der Cloud nicht mehr aktiv ist. Unterschiedliche Fastenzeiten werden nicht automatisch gelöscht.
