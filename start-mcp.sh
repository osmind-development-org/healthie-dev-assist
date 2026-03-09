#!/bin/bash

# MCP Server startup script
# This fixes the ENOENT error when MCP host apps don't inherit PATH

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENTRY_SCRIPT="$SCRIPT_DIR/src/server.ts"

TSX_BIN="$SCRIPT_DIR/node_modules/.bin/tsx"
[ -x "$TSX_BIN" ] || { echo "Error: tsx not found. Run 'npm install' in $SCRIPT_DIR"; exit 1; }
[ -f "$ENTRY_SCRIPT" ] || { echo "Error: server.ts not found at $ENTRY_SCRIPT"; exit 1; }

cd "$SCRIPT_DIR"
exec "$TSX_BIN" "$ENTRY_SCRIPT" "$@"