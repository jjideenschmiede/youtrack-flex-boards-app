# Contributing

Thank you for your interest in contributing to the YouTrack Flex-Boards App!

> [!NOTE]
> This GitHub repository is a read-only mirror. We develop the app in our internal GitLab and push every change here automatically.

## Issues

If you found a bug or have an idea for a new feature, please open an issue using one of the issue templates. Describe the problem or idea as detailed as possible, including your YouTrack version and the steps to reproduce a bug.

## Pull Requests

Pull requests are welcome, but they cannot be merged on GitHub directly. We review your changes, apply them in our GitLab and they show up here with the next sync. Please keep pull requests small and focused on one change.

## Development

> [!NOTE]
> You need to have Node.js and npm installed to install, build, and pack the app.

Install the dependencies:

```bash
npm install
```

Build the app:

```bash
npm run build
```

Check the code:

```bash
npm run lint
```

## Commit Messages

Please write commit messages in English and follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification, for example:

```txt
feat: add a filter for assignees
fix: keep the column names after a board rename
```

## Code of Conduct

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.
