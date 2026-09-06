# BLS 4.0 in Mampfo einrichten

## Benötigte Datei

Mampfo benötigt die offizielle Hauptdatei des Bundeslebensmittelschlüssels 4.0:

`BLS_4_0_Daten_2025_DE.xlsx`

Die Datei erhältst du auf der offiziellen Downloadseite des Bundeslebensmittelschlüssels. In Mampfo findest du unter **Erfassen → Lebensmittel → BLS 4.0** dafür den Button **Offizielle BLS-Downloadseite**.

## Import

1. BLS-Hauptdatei herunterladen.
2. In Mampfo **BLS-XLSX auswählen** anklicken.
3. `BLS_4_0_Daten_2025_DE.xlsx` auswählen.
4. Mampfo liest die Datei lokal ein.
5. Nach Abschluss steht die BLS-Suche offline zur Verfügung.

Die Original-XLSX umfasst 7.140 Lebensmittel und 138 Nährstoffkomponenten. Mampfo übernimmt davon nur die für die aktuelle App relevanten Kernwerte.

## Pro Gerät

Die Referenzdatenbank muss einmal pro Browser/PWA-Installation importiert werden. Sie wird nicht in Supabase gespeichert. Einzelne BLS-Lebensmittel, die du in **Meine Lebensmittel** übernimmst, werden dagegen wie alle persönlichen Lebensmittel synchronisiert.

## Daten entfernen oder aktualisieren

In **Erfassen → Lebensmittel → BLS 4.0** findest du im Statuskasten das Menü `…`. Dort kannst du die BLS-Datei neu importieren oder die lokale BLS-Referenzdatenbank entfernen. Persönlich übernommene Lebensmittel werden dadurch nicht gelöscht.

## Quelle

Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0 – Deutsche Nährstoffdatenbank. Karlsruhe. DOI: 10.25826/Data20251217-134202-0. Lizenz: CC BY 4.0.
