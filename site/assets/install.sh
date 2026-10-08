#!/bin/sh
# Dupli installer — https://github.com/zetahiveco/dupli
# Usage:  curl -fsSL https://dupli-zetahive.vercel.app/install.sh | sh
set -e

REPO="zetahiveco/dupli"
INSTALL_DIR="${DUPLI_INSTALL_DIR:-$HOME/.local/bin}"

os=$(uname -s)
arch=$(uname -m)

case "$os" in
  Darwin)
    case "$arch" in
      arm64) target="aarch64-apple-darwin" ;;
      x86_64) target="x86_64-apple-darwin" ;;
      *) target="" ;;
    esac
    ;;
  Linux)
    case "$arch" in
      x86_64) target="x86_64-unknown-linux-gnu" ;;
      aarch64) target="aarch64-unknown-linux-gnu" ;;
      *) target="" ;;
    esac
    ;;
  *) target="" ;;
esac

if [ -n "$target" ]; then
  url="https://github.com/$REPO/releases/latest/download/dupli-$target.tar.gz"
  tmp=$(mktemp -d)
  if curl -fsSL "$url" -o "$tmp/dupli.tar.gz" 2>/dev/null; then
    tar -xzf "$tmp/dupli.tar.gz" -C "$tmp"
    mkdir -p "$INSTALL_DIR"
    mv "$tmp/dupli" "$INSTALL_DIR/dupli"
    chmod +x "$INSTALL_DIR/dupli"
    rm -rf "$tmp"
    echo "Installed dupli to $INSTALL_DIR/dupli"
    case ":$PATH:" in
      *":$INSTALL_DIR:"*) ;;
      *) echo "NOTE: $INSTALL_DIR is not on your PATH. Add it:  export PATH=\"$INSTALL_DIR:\$PATH\"" ;;
    esac
    exit 0
  fi
  echo "No prebuilt binary for $target — installing from source with cargo."
else
  echo "Unsupported platform ($os $arch) — installing from source with cargo."
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo not found. Install Rust first: https://rustup.rs"
  exit 1
fi
cargo install --locked --git "https://github.com/$REPO" dupli
echo "Installed dupli via cargo."
