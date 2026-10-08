use crate::config::McpServerConfig;
use anyhow::{bail, Context, Result};
use serde::Deserialize;
use serde_json::{json, Value};
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};

/// A tool exposed by an MCP server.
#[derive(Clone, Debug, Deserialize)]
pub struct McpTool {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default, rename = "inputSchema")]
    pub input_schema: Option<Value>,
}

/// Minimal MCP client over stdio: newline-delimited JSON-RPC 2.0.
pub struct McpConnection {
    pub name: String,
    pub tools: Vec<McpTool>,
    child: Child,
    stdin: ChildStdin,
    reader: BufReader<std::process::ChildStdout>,
    next_id: u64,
}

impl McpConnection {
    /// Spawns the server process and performs the initialize handshake.
    pub fn start(name: &str, config: &McpServerConfig) -> Result<Self> {
        let mut child = Command::new(&config.command)
            .args(&config.args)
            .envs(&config.env)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .with_context(|| {
                format!(
                    "Cannot start MCP server '{name}' ({} {}). Is it installed?",
                    config.command,
                    config.args.join(" ")
                )
            })?;
        let stdin = child
            .stdin
            .take()
            .context("MCP server has no stdin pipe")?;
        let stdout = child
            .stdout
            .take()
            .context("MCP server has no stdout pipe")?;

        let mut connection = Self {
            name: name.to_owned(),
            tools: Vec::new(),
            child,
            stdin,
            reader: BufReader::new(stdout),
            next_id: 1,
        };

        let response = connection.request(
            "initialize",
            json!({
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "dupli", "version": env!("CARGO_PKG_VERSION")}
            }),
        )?;
        connection.notify("notifications/initialized", json!({}))?;

        let tools_response = connection.request("tools/list", json!({}))?;
        connection.tools = tools_response
            .pointer("/result/tools")
            .and_then(|tools| serde_json::from_value(tools.clone()).ok())
            .unwrap_or_default();
        let _ = response;
        Ok(connection)
    }

    fn send(&mut self, value: &Value) -> Result<()> {
        let line = serde_json::to_string(value)?;
        self.stdin.write_all(line.as_bytes())?;
        self.stdin.write_all(b"\n")?;
        self.stdin.flush()?;
        Ok(())
    }

    fn notify(&mut self, method: &str, params: Value) -> Result<()> {
        self.send(&json!({"jsonrpc": "2.0", "method": method, "params": params}))
    }

    /// Sends a request and waits for the matching response, skipping
    /// notifications and out-of-order messages.
    fn request(&mut self, method: &str, params: Value) -> Result<Value> {
        let id = self.next_id;
        self.next_id += 1;
        self.send(&json!({
            "jsonrpc": "2.0", "id": id, "method": method, "params": params
        }))?;
        loop {
            let mut line = String::new();
            let bytes = self.reader.read_line(&mut line)?;
            if bytes == 0 {
                bail!("MCP server '{}' closed the connection", self.name);
            }
            let value: Value = match serde_json::from_str(line.trim()) {
                Ok(value) => value,
                Err(_) => continue,
            };
            if value.get("id").and_then(Value::as_u64) == Some(id) {
                if let Some(error) = value.get("error") {
                    bail!("MCP server '{}' returned an error: {error}", self.name);
                }
                return Ok(value);
            }
        }
    }

    /// Calls a tool on this server and returns a text summary of the result.
    pub fn call(&mut self, tool: &str, arguments: &Value) -> Result<String> {
        let response = self.request(
            "tools/call",
            json!({"name": tool, "arguments": arguments}),
        )?;
        let result = response
            .get("result")
            .cloned()
            .unwrap_or(Value::Null);
        if let Some(text) = result.get("isError").and_then(Value::as_bool) {
            if text {
                let content = result.get("content").cloned().unwrap_or(Value::Null);
                return Ok(format!("Tool reported an error: {content}"));
            }
        }
        if let Some(content) = result.get("content").and_then(Value::as_array) {
            let mut out = String::new();
            for item in content {
                if let Some(text) = item.get("text").and_then(Value::as_str) {
                    out.push_str(text);
                    out.push('\n');
                }
            }
            if !out.is_empty() {
                return Ok(out);
            }
        }
        Ok(serde_json::to_string_pretty(&result)?)
    }

    pub fn shutdown(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

impl Drop for McpConnection {
    fn drop(&mut self) {
        self.shutdown();
    }
}

/// Human-readable list of a server's tools.
pub fn tools_summary(name: &str, tools: &[McpTool]) -> String {
    let mut out = String::new();
    for tool in tools {
        out.push_str(&format!(
            "- {}/{}: {}\n",
            name,
            tool.name,
            tool.description.as_deref().unwrap_or("(no description)")
        ));
    }
    out
}
