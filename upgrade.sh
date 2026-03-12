#!/bin/bash
#
# Healthie Dev Assist — single-command upgrade script
# Usage: curl -fsSL https://raw.githubusercontent.com/healthie/healthie-dev-assist/main/upgrade.sh | bash
#

set -euo pipefail

REPO_URL="https://github.com/healthie/healthie-dev-assist/archive/refs/heads/main.tar.gz"

echo "Healthie Dev Assist — Upgrade"
echo "=============================="

# ── Find existing install directory from Claude Desktop config ────────────────

INSTALL_DIR=""
CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

if [ -f "$CONFIG_FILE" ]; then
  # Try to extract install dir from "healthie-dev-assist" or "healthie" config entries
  for key in "healthie-dev-assist" "healthie"; do
    # Look for the command or args path in the MCP entry
    SCRIPT_PATH=$(python3 -c "
import json, sys
try:
    config = json.load(open('$CONFIG_FILE'))
    entry = config.get('mcpServers', {}).get('$key', {})
    # Check 'command' field (v2 style — path to start-mcp.sh)
    cmd = entry.get('command', '')
    if cmd and '/' in cmd:
        print(cmd)
        sys.exit(0)
    # Check 'args' field (v1 style — path to setup.js or server file)
    args = entry.get('args', [])
    for arg in args:
        if '/' in str(arg) and ('healthie' in str(arg).lower() or 'setup' in str(arg).lower() or 'server' in str(arg).lower()):
            print(arg)
            sys.exit(0)
except Exception:
    pass
" 2>/dev/null || true)

    if [ -n "$SCRIPT_PATH" ]; then
      INSTALL_DIR="$(dirname "$SCRIPT_PATH")"
      # If the path pointed into src/, go up one more level
      if [ "$(basename "$INSTALL_DIR")" = "src" ]; then
        INSTALL_DIR="$(dirname "$INSTALL_DIR")"
      fi
      break
    fi
  done
fi

if [ -z "$INSTALL_DIR" ] || [ ! -d "$INSTALL_DIR" ]; then
  # Fall back to current directory if it looks like a healthie-dev-assist checkout
  if [ -f "package.json" ] && grep -q "healthie-dev-assist" package.json 2>/dev/null; then
    INSTALL_DIR="$(pwd)"
  else
    echo "Error: Could not find existing healthie-dev-assist installation."
    echo "Run this script from the healthie-dev-assist directory, or ensure Claude Desktop is configured."
    exit 1
  fi
fi

echo "Found installation at: $INSTALL_DIR"

# ── Preserve user files ──────────────────────────────────────────────────────

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

for file in .env environments.json; do
  if [ -f "$INSTALL_DIR/$file" ]; then
    cp "$INSTALL_DIR/$file" "$TEMP_DIR/$file"
    echo "Preserved $file"
  fi
done

# ── Download latest version ──────────────────────────────────────────────────

echo "Downloading latest version..."
curl -fsSL "$REPO_URL" | tar xz -C "$TEMP_DIR"

# tar extracts to healthie-dev-assist-main/ — copy contents over
rsync -a --delete \
  --exclude='.env' \
  --exclude='environments.json' \
  --exclude='node_modules' \
  --exclude='schemas' \
  --exclude='.git' \
  "$TEMP_DIR/healthie-dev-assist-main/" "$INSTALL_DIR/"

echo "Updated to latest version."

# ── Restore preserved files ──────────────────────────────────────────────────

for file in .env environments.json; do
  if [ -f "$TEMP_DIR/$file" ]; then
    cp "$TEMP_DIR/$file" "$INSTALL_DIR/$file"
    echo "Restored $file"
  fi
done

# ── Run setup (handles npm install, schema regen, config update, key migration)

echo ""
cd "$INSTALL_DIR"

# Ensure dependencies are installed before running setup
if [ ! -f "node_modules/.bin/tsx" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Running setup..."
npx tsx setup.ts

echo ""
echo "Upgrade complete. Restart Claude Desktop to apply changes."
