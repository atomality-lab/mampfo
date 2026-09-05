# Mampfo v0.6.2 – Supabase und Geräteabgleich

v0.6.2 erweitert das Supabase-Fundament aus v0.6.1 um den **bidirektionalen Geräteabgleich**. Mampfo bleibt Local-first: Eingaben werden weiterhin zuerst lokal gespeichert; Supabase dient als gemeinsamer Synchronisationspunkt zwischen den angemeldeten Geräten.

## Update von v0.6.1

Wenn du Supabase bereits für **v0.6.1** eingerichtet und `SUPABASE_SETUP.sql` ausgeführt hast, ist **keine Datenbankmigration erforderlich**. Das vorhandene Schema enthält bereits alle benötigten Felder, einschließlich der Löschmarken (`deleted_at`).

Wichtig beim GitHub-Update: **deine bereits ausgefüllte `supabase-config.js` behalten** oder Project URL und Publishable Key anschließend wieder eintragen. Die ZIP-Datei enthält aus Sicherheitsgründen nur Platzhalter.

## Neueinrichtung

### 1. Eigenes Supabase-Projekt

Für Mampfo ein eigenes Projekt verwenden. Wenn möglich eine EU-Region wählen.

### 2. Datenbank einrichten

Im Supabase Dashboard den **SQL Editor** öffnen, den kompletten Inhalt von `SUPABASE_SETUP.sql` einfügen und ausführen.

Das Skript erzeugt Tabellen für:

- Ernährungseinträge
- gespeicherte Lebensmittel
- Rezepte
- Fastenpläne
- Fasten-Sessions
- Einstellungen
- Synchronisationsstatus

Auf allen Tabellen ist **Row Level Security (RLS)** aktiv. Angemeldete Benutzer können nur ihre eigenen Datensätze lesen oder verändern.

### 3. Anmeldung

Unter **Authentication** E-Mail/Passwort aktivieren. Bei aktivierter E-Mail-Bestätigung muss das neue Konto zunächst über die Bestätigungs-Mail freigeschaltet werden.

### 4. Project URL und Publishable Key

Im Supabase Dashboard über **Connect** bzw. **Settings → API Keys** kopieren:

- Project URL, z. B. `https://abcxyz.supabase.co`
- Publishable Key, typischerweise `sb_publishable_...`

In `supabase-config.js` eintragen:

```js
window.MAMPFO_SUPABASE = {
  url: 'https://abcxyz.supabase.co',
  publishableKey: 'sb_publishable_...'
};
```

**Nie** Secret- oder `service_role`-Keys in der PWA verwenden.

## Erster Cloud-Stand

Ist die persönliche Mampfo-Cloud noch leer:

1. **Einstellungen → Datenaustausch** öffnen.
2. anmelden.
3. Cloud-Status prüfen.
4. **Lokale Daten erstmals in Cloud übernehmen** wählen.
5. Upload bestätigen.

Danach ist die Cloud initialisiert und der normale Geräteabgleich aktiv.

## Zweites oder weiteres Gerät

Auf dem weiteren Gerät:

1. dieselbe Mampfo-Version veröffentlichen/öffnen,
2. dieselbe `supabase-config.js` verwenden,
3. unter **Einstellungen → Datenaustausch** mit demselben Mampfo-Konto anmelden,
4. **Jetzt synchronisieren** wählen.

Mampfo führt Datensätze mit unterschiedlichen IDs automatisch zusammen. Änderungen an bereits gemeinsam bekannten Datensätzen werden über einen lokalen Vergleichsstand erkannt.

## Konflikte

Wurde derselbe Datensatz seit dem letzten gemeinsamen Stand **auf beiden Seiten unterschiedlich geändert**, überschreibt Mampfo nichts automatisch.

Unter **Konflikte lösen** erscheinen beide Fassungen:

- **Dieses Gerät verwenden**
- **Cloud-Version verwenden**
- **Später entscheiden**

Das gilt auch für Löschung gegen Bearbeitung und für unterschiedliche Tagesziele.

## Löschungen

Gelöschte Cloud-Datensätze werden intern zunächst als Löschmarken gespeichert. Dadurch kann ein auf Gerät A gelöschter Eintrag auf Gerät B nicht durch eine spätere Synchronisation wieder auftauchen.

Fasten-Sessions behalten zusätzlich ihre lokale Tombstone-Information, damit automatisch rekonstruierte Fastenphasen nicht erneut entstehen.

## Automatischer Abgleich

Nach erfolgreicher Initialisierung synchronisiert Mampfo automatisch:

- nach gespeicherten lokalen Änderungen
- beim App-Start
- bei Rückkehr in die App
- wenn die Internetverbindung wieder verfügbar ist
- zusätzlich jederzeit manuell über **Jetzt synchronisieren**

Während eines offenen Bearbeitungsformulars oder Dialogs startet kein automatischer Pull, damit ungespeicherte Eingaben nicht verdrängt werden.
