# Update von Mampfo v0.7.1 auf v0.7.2

## Dateien aktualisieren

Kopiere die Dateien aus dem v0.7.2-Paket über die bestehenden Dateien im GitHub-Repository.

**Nicht überschreiben / nicht löschen:**

- `supabase-config.js` – bleibt mit deiner bestehenden Project URL und deinem Publishable Key im Repository
- das bereits in Supabase ausgeführte Setup-SQL muss nicht erneut ausgeführt werden

Das v0.7.2-ZIP enthält deshalb weder `supabase-config.js` noch `SUPABASE_SETUP.sql`.

## Neu hinzugekommen

- `off.js` – Open-Food-Facts-/Search-a-licious-Anbindung

## Nach dem Upload

1. GitHub-Pages-Deployment abschließen lassen.
2. Mampfo hart neu laden bzw. die installierte PWA einmal vollständig schließen und neu öffnen.
3. Version **0.7.2** prüfen.
4. Unter **Erfassen → Lebensmittel → Produkte** z. B. nach einem bekannten Markenprodukt suchen.
5. Einen Treffer in **Meine Lebensmittel** übernehmen und anschließend den Geräteabgleich testen.

Für v0.7.2 ist keine Datenbankmigration in Supabase erforderlich.
