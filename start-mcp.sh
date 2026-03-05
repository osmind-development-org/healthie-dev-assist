#!/bin/bash

# MCP Server startup script
# This fixes the ENOENT error when MCP host apps don't inherit PATH

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENTRY_SCRIPT="$SCRIPT_DIR/src/server.ts"

NPX_BIN=$(command -v npx) || { echo "Error: npx not found. Please install Node.js."; exit 1; }
[ -f "$ENTRY_SCRIPT" ] || { echo "Error: server.ts not found at $ENTRY_SCRIPT"; exit 1; }

exec "$NPX_BIN" tsx "$ENTRY_SCRIPT" "$@"