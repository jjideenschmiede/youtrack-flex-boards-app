# Flex-Boards für YouTrack

Dieses Repository enthält die YouTrack-App „Flex-Boards“ der J&J Ideenschmiede GmbH. Die App ergänzt YouTrack um eine eigene Board-Seite im Hauptmenü, die Spalten, Swimlanes, Kartenfelder und Farben direkt aus den bestehenden Agile Boards übernimmt. Wird eine Karte in eine Spalte gezogen, die mehrere Status zusammenfasst, fragt Flex-Boards nach dem genauen Status, statt wie im Standard immer den ersten zu setzen. Administratoren können den Spalten zusätzlich eigene Namen geben.

## Funktionen

- Übernimmt Spalten, WIP-Limits, Swimlanes (nach Attribut und nach Ticket), Farbkodierung, Schätzfeld und Kartenfelder aus dem gewählten Agile Board
- Auswahldialog mit den Status der Zielspalte beim Ablegen in eine kombinierte Spalte
- Fragt Pflichtfelder wie die Resolution ab, wenn ein Workflow sie beim Verschieben verlangt
- Eigene Spaltennamen je Board, nur für Administratoren (Berechtigung `ADMIN_UPDATE_APP`), gespeichert im globalen Speicher der App
- Filter für Karten auf dem Board, einklappbare Swimlanes und Öffnen des Tickets per Doppelklick in einem neuen Tab
- Oberfläche auf Deutsch oder Englisch, abhängig von der Sprache des Nutzers in YouTrack

## Development

1. Repository klonen
2. Abhängigkeiten installieren: `npm install`
3. App bauen: `npm run build`
4. Code prüfen: `npm run lint`

## Installation

Die App kann auf zwei Wegen in YouTrack installiert werden:

**Per CLI:**

```bash
npm run build
npm run upload -- --host https://project.ideasfactory.dev --token <token>
```

**Per ZIP-Datei:**

```bash
npm run build && npm run pack
```

Anschließend in YouTrack unter `Administration > Apps > App hochladen` die generierte `youtrack-flex-boards-app.zip` auswählen.

> [!NOTE]
> Updates immer über die bestehende App hochladen. Wird die App gelöscht, entfernt YouTrack auch die gespeicherten Spaltennamen.

## Hilfe & Fragen

Bei Fragen kannst du dich jederzeit per [Slack](https://jj-ideenschmiede.slack.com/archives/D037CE6GBFW) oder per E-Mail an Jonas Kwiedor ([jonas.kwiedor@jj-ideenschmiede.de](mailto:jonas.kwiedor@jj-ideenschmiede.de)) wenden.
