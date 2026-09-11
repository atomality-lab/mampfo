# Update von v0.7.3 auf v0.8.0

1. Vorhandene Mampfo-Dateien im GitHub-Pages-Repository durch den Inhalt dieses Ordners ersetzen.
2. Die vorhandene `supabase-config.js` **nicht löschen oder überschreiben**. Sie ist absichtlich nicht im Paket enthalten.
3. Deployment abwarten und Mampfo auf den Geräten vollständig schließen.
4. App neu öffnen bzw. hart neu laden und **Version 0.8.0** kontrollieren.
5. Unter **Erfassen** den neuen Button **Barcode scannen** testen. Beim ersten Start Kamerazugriff erlauben.

Für v0.8.0 ist **keine Änderung am Supabase-Schema** erforderlich.

Hinweis: Die Produktabfrage nach dem Barcode verwendet Open Food Facts und benötigt Internet. Die Kamera-Erkennung nutzt bei unterstützten Android-Browsern die native Barcode Detection API und sonst bei Bedarf ZXing Browser 0.2.1 als Netzwerk-Fallback.
