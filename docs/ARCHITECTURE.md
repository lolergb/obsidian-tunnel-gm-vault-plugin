# GM Vault Exporter Plugin Architecture

## 📐 Design Decisions

This plugin is designed with a simple and modular architecture for the **local-first** approach:

### 1. Separation of Concerns

Each module has a single responsibility:

- **`PluginController`**: Orchestration and coordination (commands, state)
- **`VaultExporter`**: Exports vault to JSON with embedded HTML
- **Markdown-it**: Renders Markdown to HTML (external library)

### 2. Local-First Approach

The plugin works completely offline:
- ✅ No HTTP server required
- ✅ No tunnels or external connections required
- ✅ Generates a static JSON file with all content embedded
- ✅ Pre-rendered HTML with Notion styles

### 3. Two-Pass Processing

The exporter uses a two-pass approach:

1. **Pass 1: Build page mapping**
   - Scans all markdown files
   - Generates unique IDs for each page
   - Creates a name → ID mapping to resolve mentions

2. **Pass 2: Export with resolved mentions**
   - Exports folder structure
   - Converts wiki links to mentions using generated IDs
   - Renders markdown to HTML with Notion styles

### 4. Automatic Conversions

The plugin performs several automatic conversions:

- **Wiki Links** `[[page]]` → Clickable mentions with `data-mention-page-id`
- **Tags** `#tag` → Colored Notion-style badges (`notion-tag`)
- **Markdown** → HTML with Notion classes (`notion-paragraph`, `notion-heading-1`, etc.)
- **Titles with markdown** → Rendered correctly (e.g., `**Calvin**` → bold)

### 5. File Structure

```
src/
├── main.js              # Entry point (Obsidian API only)
├── PluginController.js  # Command orchestration
└── exporters/
    └── VaultExporter.js # Export logic (framework-agnostic)
```

### 6. Framework-Agnostic Core

The `VaultExporter` is completely independent:
- Doesn't depend on Obsidian directly (receives `app` as parameter)
- Can be easily tested
- Can be reused in other contexts

## 🔄 Export Flow

```
User runs "Export vault to JSON"
    ↓
PluginController.exportVaultToJson()
    ↓
VaultExporter.exportVault(folder)
    ↓
[Pass 1] _buildPageMap() → Generates IDs for all pages
    ↓
[Pass 2] _exportFolder() → Exports structure with resolved mentions
    ↓
    ├─ _exportPage() → Renders markdown, converts mentions/tags
    └─ _exportImageGallery() → Creates galleries for image folders
    ↓
JSON generated with embedded htmlContent
    ↓
File saved in vault root
```

## 🎨 Markdown Rendering

The rendering process includes:

1. **Markdown → HTML**: Using `markdown-it`
2. **Process images**: External URLs kept, local ones replaced
3. **Convert wiki links**: `[[page]]` → `<span class="notion-mention">`
4. **Convert tags**: `#tag` → `<span class="notion-tag">`
5. **Apply Notion classes**: Adds CSS classes to all elements
6. **Wrap structure**: Adds page title with `notion-page-title`

## 🔮 Future Extensibility

The architecture easily allows for:

- **Export filters**: Export only certain folders
- **Customization options**: Styles, tag colors, etc.
- **Incremental export**: Only export changes
- **Dataview support**: Integrate Dataview queries
- **Multiple formats**: Export to other formats besides JSON

---

**Simple architecture, clean code, easy to maintain** ✨
