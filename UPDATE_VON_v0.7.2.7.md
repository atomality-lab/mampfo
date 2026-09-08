# Update von Mampfo v0.7.2.7 auf v0.7.3

1. Die Dateien aus **v0.7.3** über die bisherigen App-Dateien im GitHub-Repository kopieren.
2. Die vorhandene **`supabase-config.js` nicht löschen oder überschreiben**. Sie ist absichtlich nicht im ZIP enthalten.
3. Es ist **kein SQL-/Supabase-Schema-Update** notwendig.
4. GitHub Pages fertig deployen lassen.
5. Mampfo auf jedem Gerät vollständig schließen und neu öffnen bzw. einmal hart neu laden.
6. In den Einstellungen prüfen, dass **v0.7.3** angezeigt wird.
7. Unter **Erfassen** die neue gemeinsame Suche testen. Eigene Lebensmittel, Rezepte und BLS erscheinen sofort; Open Food Facts wird mit **Suchen** ergänzt.

## Direktes Erfassen externer Treffer

Bei einem noch nicht gespeicherten BLS- oder Open-Food-Facts-Treffer kannst du Menge, Datum und Uhrzeit wählen und danach entweder:

- **Nur erfassen**: nur ein Tagebuch-Snapshot wird gespeichert.
- **Erfassen & speichern**: zusätzlich wird das Lebensmittel in „Meine Lebensmittel“ gespeichert und mit dem Eintrag verknüpft.

Bereits gespeicherte externe Treffer werden automatisch erkannt.
