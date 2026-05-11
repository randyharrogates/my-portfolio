# Blender MCP setup

Goal: have Claude Code (running in this repo) drive your Blender session via the
Model Context Protocol. After setup, asking Claude *"build a hex tessellated
wall panel"* will execute `bpy` commands inside your running Blender and
produce geometry in the viewport.

We use the community [**ahujasid/blender-mcp**](https://github.com/ahujasid/blender-mcp)
(MIT-licensed). Two implementations of "Blender MCP" exist in the wild:

| Option | Path | Why we picked one |
|---|---|---|
| Official `blender.org/lab/mcp-server/` | Drag-and-drop install link → Blender. Documented for **Claude Desktop**. | Doesn't ship a documented `.mcp.json` config for Claude Code. |
| `ahujasid/blender-mcp` (community, MIT) | `uvx blender-mcp` + a downloadable `addon.py`. Works directly with Claude Code via `.mcp.json`. | ✅ This is what `.mcp.json` is wired to. |

If/when the official Blender Lab server publishes first-class Claude Code
support, we can revisit — the `.mcp.json` swap is one line.

## Prerequisites

- macOS Apple Silicon (this repo's setup; the addon supports Linux + Windows too).
- **Blender 4.x** at `/Applications/Blender.app`. Install via:
  ```bash
  brew install --cask blender
  ```
- **uv / uvx** on your `$PATH`. Already installed at `~/.local/bin/uvx`.

## Install the Blender addon

`addon.py` from the upstream repo is staged at `blender/mcp-setup/addon.py`
(≈112 KB, MIT-licensed, see attribution at top of file).

**Recommended — one-liner headless install** (already run once by Claude on this
machine; re-run to update after pulling a new `addon.py`):

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b \
  -P blender/mcp-setup/install-addon.py
```

The script copies `addon.py` into Blender's addons directory, enables it,
and saves user preferences. Persists across Blender sessions.

**Alternative — GUI install**:

1. Open Blender.
2. Go to **Edit → Preferences → Add-ons**.
3. Click **Install from disk…** (top-right corner; UI may say "Install…" in
   older Blender versions).
4. Navigate to this repo and select `blender/mcp-setup/addon.py`.
5. Tick the checkbox next to **"Interface: Blender MCP"** to enable it.

To verify, press **N** in the 3D viewport to open the sidebar. You should see
a **BlenderMCP** tab.

## Start the addon's socket server inside Blender

Each session you want Claude to control:

1. Press **N** in the 3D viewport → open the **BlenderMCP** tab.
2. Click **Connect to Claude** (or **Start MCP Server** — wording varies by
   addon version).
3. The button flips state to show the server is listening on TCP port 9876
   (the addon's default).

## Verify Claude Code sees the server

`.mcp.json` at the repo root is already wired:

```json
{
  "mcpServers": {
    "blender": {
      "command": "uvx",
      "args": ["blender-mcp"]
    }
  }
}
```

`uvx blender-mcp` boots a stdio MCP server that bridges to the addon over TCP
9876. Steps:

1. In Claude Code, run `/mcp` — `blender` should appear in the list. If not,
   restart Claude Code (`.mcp.json` is read once at session start).
2. With Blender open + addon listening, ask Claude in this repo:
   > *"Using the Blender MCP, add a default cube at the origin."*
3. The cube appears in your Blender viewport. ✅

## Common gotchas

- **`uvx blender-mcp` not on PATH**: re-run `uv tool install blender-mcp`
  once; subsequent `uvx` invocations re-use the installed env. To prefetch
  manually:
  ```bash
  uv tool install blender-mcp
  ```
- **Port 9876 already in use**: the addon's panel has a port-override
  setting; bump it, then matching `BLENDER_MCP_PORT` env var on the `uvx`
  side (see upstream README for the exact env var name).
- **Stale `.mcp.json`**: edits don't take effect mid-session. Restart Claude
  Code after changes.
- **Server "Connection refused" in logs**: you didn't click **Connect** in
  Blender's BlenderMCP sidebar. The addon socket only listens while that
  button is toggled on.
- **macOS Gatekeeper on first Blender launch**: right-click Blender.app →
  Open → confirm. (Brew cask installs are usually pre-signed but the first
  launch can still prompt.)
- **Headless reproducibility**: every meaningful change must end up in a
  committed `blender/scripts/**/*.py`. Headless re-runs (`blender -b
  scenes/x.blend -P scripts/x.py`) must produce equivalent geometry. If they
  don't, the script isn't done.

## Updating the addon

When upstream `ahujasid/blender-mcp` ships a new version:

```bash
curl -sL https://raw.githubusercontent.com/ahujasid/blender-mcp/main/addon.py \
  -o blender/mcp-setup/addon.py
uv tool upgrade blender-mcp
```

Then in Blender: **Preferences → Add-ons →** disable + remove the old "Blender MCP"
entry → re-install from the new `addon.py`.

## License

The staged `addon.py` is © Siddharth Ahuja, MIT-licensed. The upstream repo
is at <https://github.com/ahujasid/blender-mcp>.
