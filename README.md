# Tag Group Organizer

Tag Group Organizer is an Obsidian community plugin for arranging existing vault tags into custom groups and blocks without changing the tags themselves.

## Features

- Organize tags into custom groups and blocks.
- Drag tags between blocks or into a new block.
- Lock groups to prevent accidental changes.
- Sort tags and groups by name or usage frequency.
- Search tags from the organizer pane.
- Rename tags across Markdown content and frontmatter.
- Use the interface in English or Chinese based on Obsidian's language.

## Development

Requirements:

- Node.js 18 or later
- npm

Install dependencies and build the plugin:

```bash
npm install
npm run build
```

Run the development watcher:

```bash
npm run dev
```

Run lint checks:

```bash
npm run lint
```

## Manual installation

Copy these files into `<vault>/.obsidian/plugins/tag-group-organizer/`:

- `main.js`
- `manifest.json`
- `styles.css`

Reload Obsidian, then enable **Tag Group Organizer** under **Settings → Community plugins**.

## Release files

Each release requires `main.js`, `manifest.json`, and `styles.css`. The release tag must exactly match the version in `manifest.json` and must not use a leading `v`.

## Privacy

Tag Group Organizer works locally inside the Obsidian vault. It does not include telemetry or send vault data to external services.

## License

0-BSD
