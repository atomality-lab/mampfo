# Mampfo v0.6.1 – Supabase einrichten

v0.6.1 legt das Fundament für den späteren Datenaustausch zwischen mehreren Geräten. **Die Version führt noch keinen automatischen bidirektionalen Merge durch.** Sie kann ein Mampfo-Konto anlegen/anmelden, die persönliche Cloud prüfen und einen kontrollierten Erst-Upload durchführen, wenn diese Cloud leer ist.

## 1. Eigenes Supabase-Projekt anlegen

Für Mampfo sollte ein eigenes Projekt verwendet werden. Wenn möglich eine EU-Region wählen, z. B. Frankfurt.

## 2. Datenbank einrichten

Im Supabase Dashboard den **SQL Editor** öffnen, den gesamten Inhalt von `SUPABASE_SETUP.sql` einfügen und ausführen.

Das Skript erzeugt getrennte Tabellen für:

- Ernährungseinträge
- gespeicherte Lebensmittel
- Rezepte
- Fastenpläne
- Fasten-Sessions
- Einstellungen
- Synchronisationsstatus

Auf allen Tabellen wird **Row Level Security (RLS)** aktiviert. Angemeldete Benutzer können ausschließlich ihre eigenen Datensätze lesen oder verändern.

## 3. Anmeldung prüfen

Unter **Authentication** muss E-Mail/Passwort als Anmeldeart aktiviert sein. Bei aktivierter E-Mail-Bestätigung erhält ein neu angelegtes Konto zunächst eine Bestätigungs-Mail. Danach kann es sich in Mampfo anmelden.

Für Bestätigungslinks sollte in den Auth-/URL-Einstellungen die GitHub-Pages-Adresse von Mampfo als Site URL bzw. erlaubte Redirect URL hinterlegt werden.

## 4. Project URL und Publishable Key eintragen

Im Supabase Dashboard über **Connect** bzw. **Settings → API Keys** kopieren:

- Project URL, z. B. `https://abcxyz.supabase.co`
- **Publishable key**, beginnt typischerweise mit `sb_publishable_`

Beides in `supabase-config.js` eintragen:

```js
window.MAMPFO_SUPABASE = {
  url: 'https://abcxyz.supabase.co',
  publishableKey: 'sb_publishable_...'
};
```

**Niemals** einen Secret Key oder `service_role` Key in Mampfo eintragen. Mampfo läuft im Browser; dort gehört nur der Publishable Key hin.

## 5. Dateien auf GitHub aktualisieren

Alle Dateien aus dem Ordner `Mampfo_v0.6.1` ins bestehende Repository übernehmen. Neu hinzugekommen sind insbesondere:

- `cloud.js`
- `supabase-config.js`
- `SUPABASE_SETUP.sql`
- `SUPABASE_SETUP.md`

## 6. Ersten Upload durchführen

In Mampfo:

1. **Einstellungen → Datenaustausch** öffnen.
2. Konto erstellen oder anmelden.
3. **Cloud prüfen**.
4. Mampfo zeigt lokale und Cloud-Datenmengen an.
5. Nur wenn die Cloud leer ist, wird **Lokale Daten in Cloud übernehmen** angeboten.
6. Upload ausdrücklich bestätigen.

Die lokalen Daten werden dabei nicht gelöscht oder verändert.

## Verhalten bei bereits vorhandenen Cloud-Daten

v0.6.1 führt absichtlich **keinen Merge** aus. Findet ein zweites Gerät bereits Mampfo-Daten in Supabase, wird der Erst-Upload dort blockiert. Dadurch kann kein Gerät versehentlich den bestehenden Cloud-Stand überschreiben.

Der sichere bidirektionale Abgleich folgt mit v0.6.2.
