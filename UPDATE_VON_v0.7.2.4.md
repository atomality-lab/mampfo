# Update von Mampfo v0.7.2.4 auf v0.7.2.5

1. Die Dateien aus dem Ordner `Mampfo_v0.7.2.5` über die bisherigen Mampfo-Dateien im Repository kopieren.
2. Die vorhandene `supabase-config.js` **nicht löschen oder überschreiben**. Sie ist absichtlich nicht im Update-Paket enthalten.
3. Es muss kein SQL in Supabase ausgeführt werden.
4. GitHub Pages vollständig veröffentlichen lassen.
5. Mampfo auf **einem Gerät zuerst** hart neu laden und prüfen, dass Version `0.7.2.5` angezeigt wird.
6. Einmal `Jetzt synchronisieren` ausführen. Dabei werden eindeutige Fasten-Dubletten und bekannte falsch gerichtete Essenskorrekturen bereinigt.
7. Den Fastenverlauf kontrollieren. Für das Beispiel 06.09. mit letztem Essen 19:12 sollte `00:00–09:00` und `19:12–24:00` erscheinen.
8. Erst danach die übrigen Geräte auf v0.7.2.5 aktualisieren und synchronisieren.

Offene Fasten-Konflikte, die nur aus identischen Zeiten mit unterschiedlichen technischen Metadaten bestehen, sollten nach dem ersten Sync automatisch verschwinden.
