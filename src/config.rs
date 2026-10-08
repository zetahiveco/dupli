use anyhow::{anyhow, bail, Context, Result};
use serde::Deserialize;
use serde_json::Value;
use std::collections::BTreeMap;
use std::io::{self, Write};
use std::path::{Path, PathBuf};

const GLOBAL_CONFIG_PATH: &str = ".config/dupli/dupli.json";
const PROJECT_CONFIG_PATHS: &[&str] = &["dupli.json", ".dupli/dupli.json"];

#[derive(Clone, Copy, Debug, PartialEq, Eq, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
    #[serde(alias = "claude")]
    Anthropic,
    OpenAi,
    #[serde(alias = "google")]
    Gemini,
    Fireworks,
}

impl Provider {
    pub fn parse(value: &str) -> Result<Self> {
        match value.to_ascii_lowercase().as_str() {
            "anthropic" | "claude" => Ok(Self::Anthropic),
            "openai" => Ok(Self::OpenAi),
            "gemini" | "google" => Ok(Self::Gemini),
            "fireworks" => Ok(Self::Fireworks),
            _ => bail!(
                "Unknown provider '{value}'. Choose anthropic, openai, gemini, or fireworks."
            ),
        }
    }

    pub fn parse_or_print(value: &str) -> Self {
        Self::parse(value).unwrap_or(Self::Anthropic)
    }

    pub fn id(self) -> &'static str {
        match self {
            Self::Anthropic => "anthropic",
            Self::OpenAi => "openai",
            Self::Gemini => "gemini",
            Self::Fireworks => "fireworks",
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            Self::Anthropic => "Anthropic",
            Self::OpenAi => "OpenAI",
            Self::Gemini => "Gemini",
            Self::Fireworks => "Fireworks",
        }
    }

    pub fn key_env(self) -> &'static str {
        match self {
            Self::Anthropic => "ANTHROPIC_API_KEY",
            Self::OpenAi => "OPENAI_API_KEY",
            Self::Gemini => "GEMINI_API_KEY",
            Self::Fireworks => "FIREWORKS_API_KEY",
        }
    }

    pub fn default_model(self) -> &'static str {
        match self {
            Self::Anthropic => "claude-sonnet-4-20250514",
            Self::OpenAi => "gpt-4.1",
            Self::Gemini => "gemini-2.5-flash",
            Self::Fireworks => "accounts/fireworks/models/glm-5p3-flash",
        }
    }

    pub fn all() -> [Provider; 4] {
        [Self::Anthropic, Self::OpenAi, Self::Gemini, Self::Fireworks]
    }
}

/// Per-server MCP configuration (`mcpServers` in config files).
#[derive(Clone, Debug, Deserialize)]
pub struct McpServerConfig {
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub env: BTreeMap<String, String>,
}

/// Per-language LSP server configuration (`lspServers` in config files).
#[derive(Clone, Debug, Deserialize)]
pub struct LspServerConfig {
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
}

/// Fully resolved configuration: defaults < global config < project config < CLI flags.
#[derive(Clone, Debug)]
pub struct Config {
    pub provider: Option<Provider>,
    pub model: Option<String>,
    pub theme: String,
    pub sandbox: bool,
    pub sandbox_image: String,
    pub max_turns: usize,
    pub auto_approve: bool,
    pub web_port: u16,
    pub mcp_servers: BTreeMap<String, McpServerConfig>,
    pub lsp_servers: BTreeMap<String, LspServerConfig>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            provider: None,
            model: None,
            theme: "dupli".to_owned(),
            sandbox: false,
            sandbox_image: "ubuntu:24.04".to_owned(),
            max_turns: 8,
            auto_approve: false,
            web_port: 8620,
            mcp_servers: BTreeMap::new(),
            lsp_servers: BTreeMap::new(),
        }
    }
}

impl Config {
    /// Merge a JSON value (from a config file) into this config.
    fn apply_json(&mut self, value: &Value) -> Result<()> {
        let file: FileConfig = serde_json::from_value(value.clone())
            .with_context(|| format!("Invalid config file: {value}"))?;
        if file.provider.is_some() {
            self.provider = file.provider;
        }
        if file.model.is_some() {
            self.model = file.model;
        }
        if let Some(theme) = file.theme {
            self.theme = theme;
        }
        if let Some(sandbox) = file.sandbox {
            self.sandbox = sandbox;
        }
        if let Some(image) = file.sandbox_image {
            self.sandbox_image = image;
        }
        if let Some(max_turns) = file.max_turns {
            self.max_turns = max_turns;
        }
        if let Some(auto_approve) = file.auto_approve {
            self.auto_approve = auto_approve;
        }
        if let Some(port) = file.web_port {
            self.web_port = port;
        }
        if let Some(servers) = file.mcp_servers {
            self.mcp_servers.extend(servers);
        }
        if let Some(servers) = file.lsp_servers {
            self.lsp_servers.extend(servers);
        }
        Ok(())
    }
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct FileConfig {
    provider: Option<Provider>,
    model: Option<String>,
    theme: Option<String>,
    sandbox: Option<bool>,
    sandbox_image: Option<String>,
    max_turns: Option<usize>,
    auto_approve: Option<bool>,
    web_port: Option<u16>,
    /// Accepts both `mcpServers` (camelCase) and `mcp_servers` (snake_case).
    #[serde(alias = "mcp_servers")]
    mcp_servers: Option<BTreeMap<String, McpServerConfig>>,
    #[serde(alias = "lsp_servers")]
    lsp_servers: Option<BTreeMap<String, LspServerConfig>>,
}

pub fn global_config_path() -> Option<PathBuf> {
    dirs::home_dir().map(|home| home.join(GLOBAL_CONFIG_PATH))
}

pub fn project_config_path(root: &Path) -> Option<PathBuf> {
    PROJECT_CONFIG_PATHS
        .iter()
        .map(|relative| root.join(relative))
        .find(|path| path.is_file())
}

/// Deep-merges two JSON objects; arrays and scalars are replaced.
fn merge_json(base: &mut Value, overlay: &Value) {
    match (base, overlay) {
        (Value::Object(base_map), Value::Object(overlay_map)) => {
            for (key, value) in overlay_map {
                match base_map.get_mut(key) {
                    Some(existing) => merge_json(existing, value),
                    None => {
                        base_map.insert(key.clone(), value.clone());
                    }
                }
            }
        }
        (base, overlay) => *base = overlay.clone(),
    }
}

fn read_json(path: &Path) -> Result<Value> {
    let text = std::fs::read_to_string(path)
        .with_context(|| format!("Cannot read config file {}", path.display()))?;
    let value: Value = serde_json::from_str(&text)
        .with_context(|| format!("Invalid JSON in {}", path.display()))?;
    // Normalize snake_case aliases into camelCase by parsing and re-serializing.
    let _: FileConfig = serde_json::from_value(value.clone())
        .with_context(|| format!("Invalid config schema in {}", path.display()))?;
    Ok(value)
}

/// Loads layered configuration: defaults < global < project file.
pub fn load(root: &Path) -> Result<Config> {
    let mut config = Config::default();

    let mut global_value = None;
    if let Some(global_path) = global_config_path() {
        if global_path.is_file() {
            global_value = Some(read_json(&global_path)?);
        }
    }

    let project_value = project_config_path(root).map(|path| read_json(&path)).transpose()?;

    // Project config wins over global config for scalar fields; server maps merge.
    match (global_value, project_value) {
        (Some(global), Some(project)) => {
            let mut merged = global.clone();
            merge_json(&mut merged, &project);
            config.apply_json(&merged)?;
            // Ensure project-level server entries win on key collisions.
            let project: FileConfig = serde_json::from_value(project)?;
            if let Some(servers) = project.mcp_servers {
                config.mcp_servers.extend(servers);
            }
            if let Some(servers) = project.lsp_servers {
                config.lsp_servers.extend(servers);
            }
        }
        (Some(global), None) => config.apply_json(&global)?,
        (None, Some(project)) => config.apply_json(&project)?,
        (None, None) => {}
    }

    Ok(config)
}

#[derive(Debug)]
pub struct CliOptions {
    pub provider: Option<Provider>,
    pub model: Option<String>,
    pub theme: Option<String>,
    pub sandbox: bool,
    pub web: bool,
    pub web_port: Option<u16>,
    pub continue_session: bool,
    pub session_id: Option<String>,
    pub prompt: Option<String>,
}

/// Applies CLI flag overrides on top of the loaded config.
pub fn resolve(mut config: Config, options: &CliOptions) -> Result<Config> {
    if options.provider.is_some() {
        config.provider = options.provider;
    }
    if options.model.is_some() {
        config.model = options.model.clone();
    }
    if let Some(theme) = &options.theme {
        if crate::themes::names().iter().any(|name| name == theme) {
            config.theme = theme.clone();
        } else {
            bail!(
                "Unknown theme '{}'. Available: {}",
                theme,
                crate::themes::names().join(", ")
            );
        }
    }
    if options.sandbox {
        config.sandbox = true;
    }
    if let Some(port) = options.web_port {
        config.web_port = port;
    }
    Ok(config)
}

pub fn parse_args() -> Result<CliOptions> {
    let mut args = std::env::args().skip(1);
    let mut provider = None;
    let mut model = None;
    let mut theme = None;
    let mut sandbox = false;
    let mut web = false;
    let mut web_port = None;
    let mut continue_session = false;
    let mut session_id = None;
    let mut prompt = None;

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--provider" | "-p" => {
                let value = args.next().ok_or_else(|| anyhow!("{arg} requires a value"))?;
                provider = Some(Provider::parse(&value)?);
            }
            "--model" | "-m" => {
                model = Some(args.next().ok_or_else(|| anyhow!("{arg} requires a value"))?);
            }
            "--theme" | "-t" => {
                theme = Some(args.next().ok_or_else(|| anyhow!("{arg} requires a value"))?);
            }
            "--sandbox" => sandbox = true,
            "--web" => web = true,
            "--web-port" => {
                let value = args.next().ok_or_else(|| anyhow!("{arg} requires a value"))?;
                web_port = Some(value.parse().context("Invalid --web-port value")?);
            }
            "--continue" | "-c" => continue_session = true,
            "--session" | "-s" => {
                session_id = Some(args.next().ok_or_else(|| anyhow!("{arg} requires a value"))?);
            }
            "--print" => {
                prompt = Some(args.next().ok_or_else(|| anyhow!("{arg} requires a value"))?);
            }
            "--help" | "-h" => {
                print_help();
                std::process::exit(0);
            }
            "--version" | "-v" => {
                println!("dupli {}", env!("CARGO_PKG_VERSION"));
                std::process::exit(0);
            }
            other => bail!("Unknown argument '{other}'. Use --help for usage."),
        }
    }

    Ok(CliOptions {
        provider,
        model,
        theme,
        sandbox,
        web,
        web_port,
        continue_session,
        session_id,
        prompt,
    })
}

pub fn print_help() {
    println!(
        "Dupli — a minimal Rust coding agent

Usage: dupli [OPTIONS] [PROMPT]

Options:
  -p, --provider <NAME>    Provider: anthropic, openai, gemini, fireworks
  -m, --model <MODEL>      Model ID for the provider
  -t, --theme <NAME>       Color theme: {}
      --sandbox            Run shell commands inside a Docker sandbox
      --web                Start the web UI (axum + leptos) instead of the TUI
      --web-port <PORT>    Port for the web UI (default: 8620)
  -c, --continue           Resume the most recent session
  -s, --session <ID>       Resume a specific session
      --print <PROMPT>     Run one prompt and exit (print mode)
  -h, --help               Show this help
  -v, --version            Show version

Configuration (layered, later wins):
  ~/.config/dupli/dupli.json   global config
  ./dupli.json                 per-folder config (or .dupli/dupli.json)",
        crate::themes::names().join(", ")
    );
}

pub fn choose_provider() -> Result<Provider> {
    println!("Choose a provider:\n  1) Anthropic / Claude\n  2) OpenAI\n  3) Gemini\n  4) Fireworks");
    print!("Provider [1-4]: ");
    io::stdout().flush()?;
    let mut choice = String::new();
    io::stdin().read_line(&mut choice)?;
    match choice.trim() {
        "1" => Ok(Provider::Anthropic),
        "2" => Ok(Provider::OpenAi),
        "3" => Ok(Provider::Gemini),
        "4" => Ok(Provider::Fireworks),
        _ => bail!("Choose a provider from 1 to 4"),
    }
}

pub fn choose_model(provider: Provider) -> Result<String> {
    let default = provider.default_model();
    print!("Model [\x1b[90m{default}\x1b[0m]: ");
    io::stdout().flush()?;
    let mut model = String::new();
    io::stdin().read_line(&mut model)?;
    let model = model.trim();
    Ok(if model.is_empty() {
        default.to_owned()
    } else {
        model.to_owned()
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn merge_json_overlays_nested_objects() {
        let mut base = json!({"mcpServers": {"a": {"command": "x"}}, "theme": "nord"});
        merge_json(&mut base, &json!({"mcpServers": {"b": {"command": "y"}}, "theme": "mono"}));
        assert_eq!(base["theme"], "mono");
        assert!(base["mcpServers"].get("b").is_some());
        assert!(base["mcpServers"].get("a").is_some());
    }

    #[test]
    fn project_config_path_prefers_root_file() {
        let root = std::env::temp_dir().join("dupli-config-test");
        std::fs::create_dir_all(&root).unwrap();
        assert!(project_config_path(&root).is_none());
    }
}
