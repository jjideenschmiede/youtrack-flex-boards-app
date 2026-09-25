# YouTrack Flex-Boards App

An agile board view for YouTrack with custom column names that asks for the exact state when a card is dropped into a column that combines several states.

---

<div>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/youtrack-certified-partner-white.svg">
    <img src="docs/images/youtrack-certified-partner-black.svg" alt="YouTrack Certified Partner" align="middle">
  </picture>
  <img src="docs/images/spacer.png" width="40" height="1" alt="" align="middle">
  <img src="docs/images/youtrack-honored-app-creator.png" alt="Honored YouTrack App Creator" height="120" align="middle">
</div>

## YouTrack Apps, TeamCity Plugins & more

### J&J Ideenschmiede GmbH - Your Partner for JetBrains Solutions

We are **YouTrack Certified** and **TeamCity Certified** developers, specializing in custom solutions for JetBrains products.

👉🏼 Visit our [website](https://www.jj-ideenschmiede.de) to learn more about our services.

---

## Features

The App adds a Flex-Boards page to the YouTrack main menu that shows your existing agile boards with their columns, swimlanes, card fields and colors. When a card is dropped into a column that combines several states, a dialog asks for the exact state instead of always setting the first one.

- Takes columns, WIP limits, swimlanes, color coding, estimation field and card fields from the selected agile board
- State picker when a card is dropped into a combined column
- Asks for required fields such as the resolution when a workflow demands them
- Custom column names per board for app admins, board owners and everyone who can edit the board settings
- Card filter, collapsible swimlanes and opening issues in a new tab by double-click
- User interface in English and German, based on the user's YouTrack language

## Requirements

- YouTrack 2026.2 or later

## Installation

1. Download the latest release from the [marketplace](https://plugins.jetbrains.com/plugin/34529)
2. Go to the YouTrack Administration area
3. Navigate to Apps
4. Click "Upload app zip"
5. Select the downloaded zip file

> [!NOTE]
> Always install updates over the existing app. Deleting the app also removes the saved column names.

## Development

> [!NOTE]
> You need to have Node.js and npm installed to install, build, and pack the app.

You can clone this repository and build the app locally. Make sure you have Node.js and npm installed. Install the dependencies and build the app using:

```bash
npm install
```

After that, you can run the following command to build the app:

```bash
npm run build
```

If you want to pack the app for distribution, you can use:

```bash
npm run pack
```

## Help & Support

If you have any questions or need support, feel free to reach out to us via [e-mail](mailto:support@jj-ideenschmiede.de) or visit our [website](https://www.jj-ideenschmiede.de).
