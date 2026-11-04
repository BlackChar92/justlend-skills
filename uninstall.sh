#!/bin/bash
# Uninstall JustLend Skills. Removes the local build/deps and the generated
# .env; MCP client entries and any editor symlinks are user-managed and must be
# removed manually (printed below) since this script can't safely edit them.

echo "🗑️  Uninstalling JustLend Skills..."

[ -d "node_modules" ] && rm -rf node_modules && echo "  removed node_modules/"
[ -f ".env" ] && rm -f .env && echo "  removed .env (contained your TronGrid key)"

cat <<'NOTE'

Manual cleanup (this script does not edit files it did not create):
  • Remove the "justlend" MCP entry from your client config, e.g.:
      - Claude Desktop: ~/Library/Application Support/Claude/claude_desktop_config.json
      - Claude Code:    .mcp.json (project), ~/.claude.json (local/user scope)
      - Cursor:         .cursor/mcp.json
      - Codex:          ~/.codex/  (see .codex/INSTALL.md)
      - OpenCode:       .opencode/ plugin entry
  • Delete the cloned justlend-skills directory itself if no longer needed.
NOTE

echo "✅ Uninstallation complete."
