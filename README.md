# GM Vault Exporter - Obsidian Plugin

Obsidian plugin that exports your vault to a JSON file compatible with **[GM Vault](https://owlbear-gm-vault.netlify.app)** for [Owlbear Rodeo](https://www.owlbear.rodeo/).

## 🎯 What is this?

This plugin is a companion tool for **GM Vault**, an Owlbear Rodeo extension that allows Game Masters to organize and share content during tabletop RPG sessions.

**GM Vault Exporter** allows you to:
- ✅ Export your complete Obsidian vault to GM Vault format
- ✅ Render Markdown to HTML with Notion styles
- ✅ Convert wiki links `[[page]]` into clickable mentions
- ✅ Convert tags `#tag` into Notion-style badges
- ✅ Work completely offline (local-first approach)
- ✅ Generate JSON files ready to import into GM Vault

> **Note:** This plugin generates static JSON files that you import into GM Vault. It does not require an HTTP server or external connections.

## 🚀 Quick Start

### 1. Installation

1. Copy this folder to `.obsidian/plugins/gm-vault-exporter/` in your vault
2. Reload Obsidian
3. Enable the plugin in **Settings → Community plugins**

### 2. Select session folder

1. Run the command: **"Select session folder"**
   - Or use `Cmd/Ctrl + P` and search for "Select session folder"
2. Select the folder that contains your session notes

### 3. Export vault

1. Run the command: **"Export vault to JSON"**
   - Or use `Cmd/Ctrl + P` and search for "Export vault to JSON"
2. The JSON file will be created in the root of your vault with the name: `gm-vault-[folder-name]-[date].json`

### 4. Import into GM Vault

1. Open **GM Vault** in Owlbear Rodeo
2. Go to **Settings → Import JSON**
3. Select the generated JSON file
4. Done! Your vault will be available in GM Vault

## 📋 Vault Structure

The plugin exports the complete folder and markdown file structure of your vault:

- **Folders** → Converted to **categories** in GM Vault
- **`.md` files** → Converted to **pages** with rendered HTML
- **Image-only folders** → Converted to **image galleries**

### Special Features

- **Wiki links** `[[page]]` → Converted to clickable mentions that navigate between pages
- **Tags** `#tag` → Converted to colored Notion-style badges
- **Markdown** → Fully rendered (bold, italic, lists, tables, etc.)
- **External images** → Kept (URLs with `http://` or `https://`)
- **Local images** → Replaced with placeholders (use external URLs to include images)

## 📝 Usage Example

```
My Vault/
├── Characters/
│   ├── Player 1.md          → Page "Player 1"
│   └── NPCs/
│       └── Goblin.md        → Page "Goblin" in category "NPCs"
├── Locations/
│   └── Tavern.md            → Page "Tavern"
└── Sessions/
    └── Session 1.md         → Page "Session 1"
```

Exported as:
```json
{
  "categories": [
    {
      "name": "Characters",
      "items": [
        { "type": "page", "name": "Player 1", "htmlContent": "..." },
        {
          "type": "category",
          "name": "NPCs",
          "items": [
            { "type": "page", "name": "Goblin", "htmlContent": "..." }
          ]
        }
      ]
    },
    {
      "name": "Locations",
      "items": [
        { "type": "page", "name": "Tavern", "htmlContent": "..." }
      ]
    },
    {
      "name": "Sessions",
      "items": [
        { "type": "page", "name": "Session 1", "htmlContent": "..." }
      ]
    }
  ]
}
```

## 🎨 Features

### Wiki Links (Mentions)

Obsidian wiki links are automatically converted to clickable mentions:

```markdown
The character [[Player 1]] visited [[Tavern]].
```

They become mentions that navigate between pages in GM Vault, just like Notion mentions.

### Tags

Tags are converted to colored Notion-style badges:

```markdown
tags: #character, #npc, #location
```

Each tag gets a consistent color based on its name, matching GM Vault's Notion-style UI.

### Full Markdown Support

- **Bold**: `**text**` → `<strong>text</strong>`
- **Italic**: `*text*` → `<em>text</em>`
- **Lists**: Rendered with Notion styles
- **Tables**: Rendered with Notion styles
- **Code**: Rendered with Notion styles
- **External links**: Open in new tab

## 🔒 Security and Privacy

- ✅ **100% local**: All processing happens on your machine
- ✅ **No servers**: No internet connection required
- ✅ **No shared data**: JSON is generated locally
- ✅ **Full control**: You decide when to export and what to share

## 🐛 Troubleshooting

### "No session folder selected"

1. Run the "Select session folder" command
2. Select the folder that contains your notes

### Images don't appear

- Local images are omitted by design
- Use external URLs to include images: `![alt](https://example.com/image.png)`
- Or upload images to a hosting service (Imgur, Cloudinary, etc.)

### Mentions don't work

- Make sure file names match the wiki links
- Wiki links are case-insensitive: `[[Player 1]]` and `[[player 1]]` work the same

### Import error in GM Vault

- Verify the JSON file was generated correctly
- Check the GM Vault console for error messages
- Ensure the JSON structure matches GM Vault's expected format

## 📝 Notes

- The plugin **does not modify** your Obsidian notes
- It's **read-only** (you can't edit from GM Vault)
- Changes in Obsidian require **re-exporting** the vault
- The JSON file is overwritten each time you export

## 🔗 Related Projects

- **[GM Vault](https://owlbear-gm-vault.netlify.app)** - The Owlbear Rodeo extension this plugin exports to
- **[Owlbear Rodeo](https://www.owlbear.rodeo/)** - Virtual tabletop for tabletop RPGs

## 🏗️ Architecture

The plugin is designed with a simple and modular architecture:

- **`PluginController`**: Orchestrates commands and state
- **`VaultExporter`**: Exports vault to JSON with embedded HTML
- **Markdown-it**: Renders Markdown to HTML
- **Notion styles**: Applies Notion CSS classes for visual consistency with GM Vault

## 🔮 Future Improvements

- Dataview queries support
- Export filters (export only certain folders)
- Style customization options
- Incremental export (only changes)
- Direct integration with GM Vault (future)

## 💬 Support

For questions, bug reports, or feature requests:

1. **Check the documentation**: See [docs/INSTALACION.md](docs/INSTALACION.md) for installation help
2. **GM Vault support**: Visit the [GM Vault support page](https://solid-jingle-6ee.notion.site/2d8d4856c90e8129b5f7ebf776e82335?pvs=106)
3. **Report issues**: Open an issue in the project repository

---

**Developed with ❤️ for the tabletop RPG GM community**

Part of the **GM Vault** ecosystem for Owlbear Rodeo.
