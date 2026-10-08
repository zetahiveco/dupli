use crate::config::LspServerConfig;
use anyhow::{bail, Context, Result};
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::mpsc::{channel, Receiver, RecvTimeoutError};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

type Diagnostics = Arc<Mutex<BTreeMap<String, Vec<Value>>>>;

enum Incoming {
    Response,
    Notification,
}

/// Minimal LSP client: spawns a language server over stdio and collects
/// `textDocument/publishDiagnostics` notifications. Used by the
/// `/diagnostics` command and the `diagnostics` action.
pub struct LspClient {
    name: String,
    child: Child,
    stdin: std::process::ChildStdin,
    diagnostics: Diagnostics,
    receiver: Receiver<Incoming>,
    opened: Vec<String>,
}

impl LspClient {
    pub fn start(name: &str, config: &LspServerConfig) -> Result<Self> {
        let mut child = Command::new(&config.command)
            .args(&config.args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .with_context(|| {
                format!(
                    "Cannot start LSP server '{name}' ({} {}). Is it installed?",
                    config.command,
                    config.args.join(" ")
                )
            })?;
        let mut stdin = child.stdin.take().context("LSP server has no stdin")?;
        let stdout = child.stdout.take().context("LSP server has no stdout")?;
        let diagnostics: Diagnostics = Arc::new(Mutex::new(BTreeMap::new()));

        let (sender, receiver) = channel::<Incoming>();
        let diagnostics_for_reader = diagnostics.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                let Ok(line) = line else { return };
                let Ok(value) = serde_json::from_str::<Value>(&line) else { continue };
                if value.get("method").is_some_and(|m| m.is_string()) {
                    let method = value["method"].as_str().unwrap().to_owned();
                    let params = value.get("params").cloned().unwrap_or(Value::Null);
                    if method == "textDocument/publishDiagnostics" {
                        let uri = params
                            .pointer("/uri")
                            .and_then(Value::as_str)
                            .unwrap_or_default()
                            .to_owned();
                        let items = params
                            .pointer("/diagnostics")
                            .and_then(Value::as_array)
                            .cloned()
                            .unwrap_or_default();
                        diagnostics_for_reader
                            .lock()
                            .unwrap()
                            .insert(uri, items);
                    }
                    if sender.send(Incoming::Notification).is_err() {
                        return;
                    }
                } else if value.get("id").is_some() {
                    if sender.send(Incoming::Response).is_err() {
                        return;
                    }
                }
            }
        });

        // Frame helper: LSP messages are `Content-Length`-prefixed.
        let write_frame = |stdin: &mut std::process::ChildStdin, payload: &Value| -> Result<()> {
            let text = serde_json::to_string(payload)?;
            write!(stdin, "Content-Length: {}\r\n\r\n{}", text.len(), text)?;
            stdin.flush()?;
            Ok(())
        };
        write_frame(
            &mut stdin,
            &json!({
                "jsonrpc": "2.0", "id": 1, "method": "initialize",
                "params": {
                    "processId": std::process::id(),
                    "capabilities": {},
                    "rootUri": "file:///"
                }
            }),
        )?;
        // The initialize response is consumed by the reader thread; a
        // minimal client does not need to inspect it.

        write_frame(
            &mut stdin,
            &json!({
                "jsonrpc": "2.0", "method": "initialized", "params": {}
            }),
        )?;

        Ok(Self {
            name: name.to_owned(),
            child,
            stdin,
            diagnostics,
            receiver,
            opened: Vec::new(),
        })
    }

    fn send(&mut self, payload: &Value) -> Result<()> {
        let text = serde_json::to_string(payload)?;
        write!(self.stdin, "Content-Length: {}\r\n\r\n{}", text.len(), text)?;
        self.stdin.flush()?;
        Ok(())
    }

    /// Opens a file with the server (required before diagnostics flow).
    pub fn did_open(&mut self, path: &std::path::Path, language: &str) -> Result<()> {
        let text = std::fs::read_to_string(path)
            .with_context(|| format!("Cannot read {}", path.display()))?;
        let uri = path_to_uri(path);
        self.send(&json!({
            "jsonrpc": "2.0", "method": "textDocument/didOpen",
            "params": {"textDocument": {
                "uri": uri, "languageId": language, "version": 1, "text": text
            }}
        }))?;
        self.opened.push(uri);
        Ok(())
    }

    /// Waits up to `timeout` for diagnostics for a path, then formats them.
    pub fn wait_diagnostics(&mut self, path: &std::path::Path, timeout_secs: u64) -> Result<String> {
        let uri = path_to_uri(path);
        let deadline = Instant::now() + Duration::from_secs(timeout_secs);
        loop {
            {
                let map = self.diagnostics.lock().unwrap();
                if map.contains_key(&uri) {
                    break;
                }
            }
            // Keep the reader thread's channel drained.
            match self.receiver.recv_timeout(Duration::from_millis(200)) {
                Ok(_) => {}
                Err(RecvTimeoutError::Timeout) => {}
                Err(RecvTimeoutError::Disconnected) => bail!("LSP server '{}' died", self.name),
            }
            if Instant::now() > deadline {
                break;
            }
        }
        let map = self.diagnostics.lock().unwrap();
        let items = map.get(&uri).cloned().unwrap_or_default();
        if items.is_empty() {
            return Ok(format!(
                "No diagnostics reported for {} by '{}'.",
                path.display(),
                self.name
            ));
        }
        let mut out = format!("Diagnostics from '{}' for {}:\n", self.name, path.display());
        for item in items {
            let severity = item
                .pointer("/severity")
                .and_then(Value::as_u64)
                .map(|s| match s {
                    1 => "error",
                    2 => "warning",
                    3 => "info",
                    _ => "hint",
                })
                .unwrap_or("info");
            let line = item
                .pointer("/range/start/line")
                .and_then(Value::as_u64)
                .map(|l| l + 1)
                .unwrap_or(0);
            let message = item
                .get("message")
                .and_then(Value::as_str)
                .unwrap_or_default();
            out.push_str(&format!("  L{line} [{severity}] {message}\n"));
        }
        Ok(out)
    }

    pub fn shutdown(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

impl Drop for LspClient {
    fn drop(&mut self) {
        self.shutdown();
    }
}

fn path_to_uri(path: &std::path::Path) -> String {
    let absolute = path
        .canonicalize()
        .unwrap_or_else(|_| path.to_path_buf());
    format!("file://{}", absolute.display())
}
