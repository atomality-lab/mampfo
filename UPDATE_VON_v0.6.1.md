# Update von Mampfo v0.6.1 auf v0.6.2

## Wichtig: `supabase-config.js` behalten

Wenn du Project URL und Publishable Key bereits in deiner laufenden v0.6.1 eingetragen hast, **überschreibe diese Datei beim Update nicht mit der Platzhalterdatei aus dem ZIP**.

Entweder:

- die vorhandene `supabase-config.js` im GitHub-Repository unverändert lassen, oder
- Project URL und Publishable Key nach dem Upload erneut eintragen.

## Supabase-Datenbank

Wenn `SUPABASE_SETUP.sql` für v0.6.1 bereits erfolgreich ausgeführt wurde, musst du das SQL-Skript **nicht erneut ausführen**. v0.6.2 verwendet dasselbe kompatible Tabellenschema.

## Nach dem Upload

1. GitHub Pages vollständig aktualisieren lassen.
2. Mampfo einmal hart neu laden bzw. den Service Worker aktualisieren, falls noch die alte Version angezeigt wird.
3. Unter **Einstellungen → Datenaustausch** prüfen, ob du noch angemeldet bist.
4. **Jetzt synchronisieren** auswählen.
5. Auf einem zweiten Gerät mit demselben Mampfo-Konto anmelden und dort ebenfalls einmal **Jetzt synchronisieren** ausführen.

Danach übernimmt Mampfo den ereignisbasierten automatischen Abgleich.
