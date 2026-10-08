#!/bin/sh
# Rebuild the leptos web client (WebAssembly) and regenerate the JS glue
# the server embeds from src/web/assets/pkg. Run from the repo root.
set -e

cd web-client
cargo build --target wasm32-unknown-unknown --release
cd ..

wasm-bindgen \
  "target/wasm32-unknown-unknown/release/dupli_web_client.wasm" \
  --out-dir src/web/assets/pkg \
  --target web

echo "Web client rebuilt: src/web/assets/pkg"
