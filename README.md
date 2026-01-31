# GM Vault Exporter (Tunnel) - Obsidian Plugin

Obsidian plugin that exposes a local HTTP endpoint with a public HTTPS tunnel to generate GM Vault–compatible JSON from your session notes.

> ⚠️ **Note**: This is the version with HTTP server and tunnel. For the local-first version (no server), see the main plugin.

## 🎯 What is this?

This plugin lets tabletop RPG Game Masters (GMs) use their Obsidian notes directly with **GM Vault**, an Owlbear Rodeo extension that organizes and displays content during sessions.

The plugin:
- ✅ Reads a **Session Page** you select in Obsidian
- ✅ Exposes its structure as JSON at `http://localhost:3000/gm-vault`
- ✅ Renders individual pages as HTML at `http://localhost:3000/pages/:slug`
- ✅ Runs only on localhost (private and secure)
- ✅ Is off by default (you must enable it explicitly)

## 📋 What is a Session Page?

A **Session Page** is an Obsidian note that organizes your game content using a specific structure:

- **Headings (H1/H2)** represent **categories** (folders in GM Vault)
- **Wiki links** `[[name|text]]` under a heading represent **pages**
- **Special headings** set block types:
  - `## Tables` → pages with `blockTypes: ["table"]`
  - `## Quotes` → pages with `blockTypes: ["quote"]`
  - `## Images` → pages with `blockTypes: ["image"]`
  - `## Enemies` → creates subcategories for enemies

### Session Page example

```markdown
# My Adventure

## Act I

- [[Scene 1|The arrival]]
- [[Scene 2|The encounter]]

## Tables

- [[Random encounter table]]

## Enemies

- [[Goblin]]
- [[Orc]]
```

This becomes:
- Category "Act I" with two pages
- Category "Tables" with one page (type "table")
- Category "Enemies" with two subcategories (one per enemy)

## 🚀 How to use

### 1. Installation

1. Copy this folder to `.obsidian/plugins/gm-vault-exporter/` in your vault
2. Reload Obsidian
3. Enable the plugin in Settings → Plugins

> 💡 **Note**: The plugin will automatically download `cloudflared` (Cloudflare's tunnel tool) the first time you enable the server. No manual installation required!

### 2. Select a Session Page

1. Open the note you want to use as the session page
2. Run the command: **"Select session page"**
   - Or press `Cmd/Ctrl + P` and search for "Select session page"

### 3. Enable access

1. Run the command: **"Enable GM Vault access"**
   - The server will start locally
   - **A public HTTPS tunnel will be created automatically** (using cloudflared)
   - You’ll see a notification with the **public HTTPS URL**: `https://random-name.trycloudflare.com`

### 4. Connect GM Vault

In GM Vault (Owlbear Rodeo):

**Use the public HTTPS URL (recommended):**
1. Go to Settings in GM Vault
2. Under "Import JSON", paste the **public HTTPS URL** from the notification: `https://random-name.trycloudflare.com/gm-vault`
3. GM Vault will load your session structure

> 💡 **Note**:
> - The public URL is **HTTPS** (secure) and temporary (changes each time you start the server)
> - It's **free** and **no sign-up** required
> - `cloudflared` is downloaded automatically on first use (~25MB)
> - This is the only URL you need (the local HTTP server is internal only)

### 5. View the public URL (when needed)

Run the command: **"Show tunnel public URL"**
- Shows the current public URL
- Copies it to the clipboard
- Useful if you forgot the URL or need to share it

### 6. Disable (when finished)

Run the command: **"Disable GM Vault access"**
- Stops both the local server and the public tunnel

## 🔒 Security

- ✅ The server **listens only on localhost** (127.0.0.1)
- ✅ **Optional public HTTPS tunnel** via cloudflared (Cloudflare)
  - The public URL is temporary and randomly generated (e.g. `https://random-name.trycloudflare.com`)
  - It only works while the server is running
  - Free and no registration
  - `cloudflared` is downloaded automatically on first use
- ✅ **CORS is enabled** so the browser can connect
  - Includes Private Network Access support (Chrome)
- ✅ The server is **off by default**
- ✅ It only runs when you enable it explicitly

> ⚠️ **Important**: If you use the public tunnel, anyone with the URL can access your notes while the server is running. Only share the URL with people you trust.

## 📡 HTTP endpoints

### `GET /gm-vault`

Returns the full session JSON in GM Vault format.

**Response:**
```json
{
  "categories": [
    {
      "name": "Act I",
      "pages": [
        {
          "name": "The arrival",
          "url": "http://localhost:3000/pages/scene-1"
        }
      ]
    }
  ]
}
```

### `GET /pages/:slug`

Renders a Markdown page as HTML.

**Example:** `GET /pages/scene-1` → HTML for the note "Scene 1"

## 🏗️ Architecture

The plugin uses a clear, modular design:

- **`PluginController`**: Orchestrates modules and commands
- **`ServerManager`**: Manages the HTTP server (start/stop/routes)
- **`TunnelManager`**: Manages the public HTTPS tunnel with cloudflared (auto-download)
- **`SessionParser`**: Reads and parses Obsidian notes → domain models
- **`GMVaultJSONBuilder`**: Converts models → GM Vault JSON
- **`MarkdownRenderer`**: Converts Markdown → HTML
- **Domain models**: `Session`, `Category`, `Page` (framework-agnostic)

This makes it easier to:
- ✅ Add tests
- ✅ Extend (Dataview, multiple sessions, etc.)
- ✅ Maintain and debug

## 🐛 Troubleshooting

### "Port 3000 is already in use"

Change the port in `PluginController.js` (line `this.port = 3000`).

### "No session page selected"

1. Open the note you want to use
2. Run "Select session page"

### Pages don’t load in GM Vault

1. Check that the server is running (you should see a notification)
2. Open `http://localhost:3000/gm-vault` in your browser to verify
3. Check the browser console in GM Vault for errors

## 📝 Notes

- The plugin **does not modify** your Obsidian notes
- It is **read-only** (you can’t edit from GM Vault)
- Changes in Obsidian require a **reload** in GM Vault
- The server stops automatically when you disable the plugin

## 🔮 Future improvements

The architecture can easily support:
- Dataview query support
- Multiple simultaneous sessions
- More block types
- Export to other formats
- Optional authentication

---

**Made with ❤️ for the tabletop GM community**
