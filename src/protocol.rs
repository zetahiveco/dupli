use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ImageAttachment {
    /// MIME type, e.g. `image/png`.
    pub media_type: String,
    /// Base64-encoded image bytes.
    pub data: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    /// Images attached by the user (always empty on assistant messages).
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub images: Vec<ImageAttachment>,
}

#[derive(Deserialize)]
pub struct AgentResponse {
    #[serde(default)]
    pub message: String,
    #[serde(default)]
    pub actions: Vec<Action>,
}

#[derive(Clone, Deserialize)]
pub struct Action {
    #[serde(rename = "type")]
    pub kind: String,
    pub path: Option<String>,
    pub content: Option<String>,
    pub command: Option<String>,
    pub server: Option<String>,
    pub tool: Option<String>,
    pub name: Option<String>,
    pub language: Option<String>,
    #[serde(default)]
    pub arguments: serde_json::Value,
}

/// Builds the system prompt. Skills and MCP tools discovered from the
/// config are injected so the model knows what it can reach.
pub fn system_prompt(root: &Path, skills_summary: &str, mcp_tools: &str, sandbox: bool) -> String {
    let mut prompt = format!(
        "You are Dupli, a minimal coding agent working in the user's project at {}. \
         Reply with exactly one JSON object and no markdown: \
         {{\"message\":\"short user-facing update\",\"actions\":[...]}}. \
         Supported actions:\n\
         {{\"type\":\"read_file\",\"path\":\"relative/path\"}}\n\
         {{\"type\":\"list_dir\",\"path\":\"relative/path\"}}\n\
         {{\"type\":\"write_file\",\"path\":\"relative/path\",\"content\":\"full file contents\"}}\n\
         {{\"type\":\"run\",\"command\":\"shell command\"}}\n\
         {{\"type\":\"load_skill\",\"name\":\"skill-name\"}}\n\
         {{\"type\":\"diagnostics\",\"path\":\"relative/path\",\"language\":\"rust\"}}\n\
         Use an empty actions array when finished or when you need clarification. \
         Work in small, understandable steps. Never claim an action succeeded unless its result says so. \
         Paths must stay inside the project. Shell commands require user approval.",
        root.display()
    );
    if sandbox {
        prompt.push_str(
            "\nShell commands run inside a Docker sandbox with the project mounted at /workspace.",
        );
    }
    if !mcp_tools.is_empty() {
        prompt.push_str(&format!(
            "\nMCP tools are available. Call one with:\n\
             {{\"type\":\"mcp_tool\",\"server\":\"server-name\",\"tool\":\"tool-name\",\"arguments\":{{...}}}}\n\
             {mcp_tools}"
        ));
    }
    if !skills_summary.is_empty() {
        prompt.push_str(skills_summary);
    }
    prompt
}
