#!/usr/bin/env bash
# Install Noctis Blue. This script does not patch VS Code itself.
set -euo pipefail

EXTENSION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VSCODE_CLI="${VSCODE_CLI:-}"

if [[ -z "$VSCODE_CLI" ]]; then
  if command -v code >/dev/null 2>&1; then
    VSCODE_CLI="$(command -v code)"
  elif [[ -x '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code' ]]; then
    VSCODE_CLI='/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'
  else
    printf '[noctis-blue] ERROR: VS Code CLI was not found\n' >&2
    exit 1
  fi
fi

if ! command -v npm >/dev/null 2>&1; then
  printf '[noctis-blue] ERROR: npm is required\n' >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
VSIX="$TMP_DIR/noctis-blue.vsix"

(
  cd "$EXTENSION_DIR"
  # vsce invokes vscode:prepublish (build + test). Avoid running it twice.
  npx --yes @vscode/vsce@4.0.0 package --no-dependencies --skip-license --out "$VSIX"
)

"$VSCODE_CLI" --install-extension "$VSIX" --force
# Verify the requested extension without changing other installed extensions.
if ! installed_extensions="$("$VSCODE_CLI" --list-extensions)"; then
  printf '[noctis-blue] ERROR: could not list installed extensions.\n' >&2
  exit 1
fi
if ! printf '%s\n' "$installed_extensions" | grep -Fxi 'takashit16833.noctis-blue' >/dev/null; then
  printf '[noctis-blue] ERROR: Noctis Blue is not listed after installation.\n' >&2
  exit 1
fi
printf '[noctis-blue] Noctis Blue installed. Use Developer: Reload Window when you want generated CSS changes to appear.\n'
