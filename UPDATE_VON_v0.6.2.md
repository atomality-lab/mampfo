# Mampfo – Update von v0.6.2 auf v0.6.3

## Wichtig: Supabase-Dateien bleiben im Repository

Dieses Update-Paket enthält bewusst **keine `supabase-config.js`** und **keine `SUPABASE_SETUP.sql`**.

Beim Hochladen der v0.6.3-Dateien in dein bestehendes GitHub-Repository:

1. vorhandene `supabase-config.js` **nicht löschen**
2. kein SQL-Skript erneut ausführen
3. die Dateien aus dem v0.6.3-Paket über die gleichnamigen App-Dateien legen
4. GitHub-Pages-Deployment abwarten
5. Mampfo einmal hart neu laden bzw. PWA neu öffnen
6. unter **Einstellungen → Datenaustausch** prüfen, ob Version 0.6.3 aktiv ist und die Cloud als bereit erscheint

## Was beim ersten Sync neu ist

Vor dem Abgleich legt Mampfo lokal einen Rücksprungpunkt an. Danach funktioniert der normale bidirektionale Geräteabgleich wie in v0.6.2.

Wenn das Gerät offline ist, kannst du Mampfo normal verwenden. Der Cloud-Bereich zeigt den ausstehenden Abgleich an und startet nach Rückkehr der Verbindung erneut.

## Wiederherstellen

Unter **Einstellungen → Datenaustausch** erscheint nach dem ersten Sync die Aktion:

**Lokalen Stand vor letztem Cloud-Pull wiederherstellen**

Sie setzt nur dieses Gerät auf den lokalen Stand vor dem letzten Sync zurück. Diese Wiederherstellung wird anschließend als neue lokale Änderung mit der Cloud abgeglichen.
