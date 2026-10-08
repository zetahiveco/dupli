use crate::config::{Config, Provider};
use crate::history::FileHistory;
use crate::lsp::LspClient;
use crate::mcp::{self, McpConnection, McpTool};
use crate::protocol::{system_prompt, Action, AgentResponse, ChatMessage};
use crate::report::Reporter;
use crate::session::Session;
use crate::skills::{self, Skill};
use crate::tools::{self, ToolCtx};
use anyhow::Result;
use reqwest::Client;
use std::collections::HashMap;
use std::path::PathBuf;

pub struct Agent {
    pub root: PathBuf,
    pub config: Config,
    pub provider: Provider,
    pub model: String,
    client: Client,
    pub history: Vec<ChatMessage>,
    pub file_history: FileHistory,
    pub skills: Vec<Skill>,
    pub mcp: Vec<McpConnection>,
    pub lsp: HashMap<String, LspClient>,
    pub session: Session,
    /// Non-fatal problems noticed while starting (e.g. an MCP server that
    /// failed to launch).
    pub startup_notes: Vec<String>,
}

impl Agent {
    pub fn new(root: PathBuf, config: Config, provider: Provider, model: String) -> Result<Self> {
        let client = Client::builder().build()?;
        let dirs = skills::directories(&root);
        let skills = skills::scan(&dirs);
        let session = Session::new(provider.id(), &model);

        let mut startup_notes = Vec::new();
        let mut mcp = Vec::new();
        for (name, server_config) in &config.mcp_servers {
            match McpConnection::start(name, server_config) {
                Ok(connection) => mcp.push(connection),
                Err(error) => startup_notes.push(format!("{error:#}")),
            }
        }

        Ok(Self {
            root,
            config,
            provider,
            model,
            client,
            history: Vec::new(),
            file_history: FileHistory::default(),
            skills,
            mcp,
            lsp: HashMap::new(),
            session,
            startup_notes,
        })
    }

    pub fn set_provider(&mut self, provider: Provider) {
        self.provider = provider;
        self.session.provider = provider.id().to_owned();
    }

    pub fn set_model(&mut self, model: String) {
        self.model = model.clone();
        self.session.model = model;
    }

    pub fn mcp_tools_summary(&self) -> String {
        let mut out = String::new();
        for connection in &self.mcp {
            out.push_str(&mcp::tools_summary(&connection.name, &connection.tools));
        }
        out
    }

    pub fn skills_summary(&self) -> String {
        skills::summary(&self.skills)
    }

    /// Runs one user prompt through the agent loop: stream a response,
    /// execute the requested actions, feed the results back, repeat.
    pub async fn run_prompt<R: Reporter>(&mut self, prompt: String, reporter: &mut R) -> Result<()> {
        if self.session.title.is_empty() {
            self.session.title = short_title(&prompt);
        }
        self.history.push(ChatMessage {
            role: "user".to_owned(),
            content: prompt,
        });

        let max_turns = self.config.max_turns;
        for turn in 0..max_turns {
            let skills_summary = self.skills_summary();
            let mcp_tools = self.mcp_tools_summary();
            let raw = {
                let streamed = crate::providers::complete(
                    &self.client,
                    self.provider,
                    &self.model,
                    &self.root,
                    &self.history,
                    &skills_summary,
                    &mcp_tools,
                    self.config.sandbox,
                    reporter,
                )
                .await?;
                streamed.raw
            };
            self.history.push(ChatMessage {
                role: "assistant".to_owned(),
                content: raw.clone(),
            });

            let response = match serde_json::from_str::<AgentResponse>(&raw) {
                Ok(response) => response,
                Err(_) => break,
            };
            if response.actions.is_empty() {
                break;
            }

            let mut results = Vec::new();
            for action in response.actions {
                let result = self.run_action(&action, reporter).await;
                reporter.status(&result);
                results.push(result);
            }
            self.history.push(ChatMessage {
                role: "user".to_owned(),
                content: format!("Action results:\n{}", results.join("\n\n")),
            });
            if turn + 1 == max_turns {
                reporter.status(&format!(
                    "Stopped after {max_turns} action rounds. Send another message to continue."
                ));
            }
        }

        self.session.messages = self.history.clone();
        self.session.save()?;
        Ok(())
    }

    async fn run_action<R: Reporter>(&mut self, action: &Action, reporter: &mut R) -> String {
        match self.execute_action(action, reporter).await {
            Ok(result) => result,
            Err(error) => format!("Action failed: {error:#}"),
        }
    }

    async fn execute_action<R: Reporter>(
        &mut self,
        action: &Action,
        reporter: &mut R,
    ) -> Result<String> {
        match action.kind.as_str() {
            "mcp_tool" => {
                let server = action
                    .server
                    .clone()
                    .ok_or_else(|| anyhow::anyhow!("mcp_tool requires a 'server' field"))?;
                let tool = action
                    .tool
                    .clone()
                    .ok_or_else(|| anyhow::anyhow!("mcp_tool requires a 'tool' field"))?;
                let connection = self
                    .mcp
                    .iter_mut()
                    .find(|item| item.name == server)
                    .ok_or_else(|| {
                        anyhow::anyhow!("No MCP server named '{server}' is connected")
                    })?;
                connection.call(&tool, &action.arguments)
            }
            "load_skill" => {
                let name = action
                    .name
                    .clone()
                    .ok_or_else(|| anyhow::anyhow!("load_skill requires a 'name' field"))?;
                skills::load(&self.root, &name)
            }
            "diagnostics" => {
                let path = action
                    .path
                    .clone()
                    .ok_or_else(|| anyhow::anyhow!("diagnostics requires a 'path' field"))?;
                let language = action
                    .language
                    .clone()
                    .unwrap_or_else(|| "plaintext".to_owned());
                let full = self.root.join(&path);
                if let Some(client) = self.lsp.get_mut(&language) {
                    client.did_open(&full, &language)?;
                    client.wait_diagnostics(&full, 5)
                } else {
                    Err(anyhow::anyhow!(
                        "No LSP server configured for language '{language}'. \
                         Add one under 'lspServers' in your config."
                    ))
                }
            }
            _ => {
                let mut ctx = ToolCtx {
                    root: &self.root,
                    sandbox: self.config.sandbox,
                    sandbox_image: &self.config.sandbox_image,
                    file_history: &mut self.file_history,
                    approve: &mut |command| reporter.approve(command),
                };
                tools::execute(&mut ctx, action)
            }
        }
    }

    // ----- conversation navigation (slash: /navigate) -----

    /// Real user turns (not action-result messages) as (history index, text).
    pub fn user_turns(&self) -> Vec<(usize, String)> {
        self.history
            .iter()
            .enumerate()
            .filter(|(_, message)| {
                message.role == "user" && !message.content.starts_with("Action results:")
            })
            .map(|(index, message)| (index, message.content.clone()))
            .collect()
    }

    /// Rewinds the conversation so it ends just before a given user turn.
    pub fn navigate_to(&mut self, turn_number: usize) -> Result<String> {
        let turns = self.user_turns();
        let index = turns
            .get(turn_number.saturating_sub(1))
            .map(|(index, _)| *index)
            .ok_or_else(|| anyhow::anyhow!("No turn {turn_number}. /navigate with no arguments lists turns."))?;
        self.history.truncate(index);
        self.session.messages = self.history.clone();
        self.session.save()?;
        Ok(format!(
            "Rewound to turn {turn_number}. The messages after it were dropped; continue with a new prompt."
        ))
    }

    // ----- sessions (slash: /sessions, /resume) -----

    pub fn resume(&mut self, id: &str) -> Result<String> {
        let session = Session::load(id)?;
        if let Ok(provider) = Provider::parse(&session.provider) {
            self.set_provider(provider);
        }
        self.set_model(session.model.clone());
        self.history = session.messages.clone();
        self.session = session;
        Ok(format!("Resumed session {id}."))
    }

    /// Syncs provider/model into the session record before saving.
    pub fn ensure_session_updated(&mut self) {
        self.session.provider = self.provider.id().to_owned();
        self.session.model = self.model.clone();
    }

    /// System prompt preview (used by tests and the web UI banner).
    pub fn current_system_prompt(&self) -> String {
        system_prompt(
            &self.root,
            &self.skills_summary(),
            &self.mcp_tools_summary(),
            self.config.sandbox,
        )
    }

    /// Start (or reuse) the LSP client for a language.
    pub fn lsp_for(&mut self, language: &str) -> Result<&mut LspClient> {
        if !self.lsp.contains_key(language) {
            let config = self
                .config
                .lsp_servers
                .get(language)
                .ok_or_else(|| {
                    anyhow::anyhow!(
                        "No LSP server configured for '{language}'. Add one under 'lspServers'."
                    )
                })?
                .clone();
            let client = LspClient::start(language, &config)?;
            self.lsp.insert(language.to_owned(), client);
        }
        Ok(self.lsp.get_mut(language).expect("just inserted"))
    }

    pub fn mcp_tool_list(&self) -> Vec<(String, Vec<McpTool>)> {
        self.mcp
            .iter()
            .map(|connection| (connection.name.clone(), connection.tools.clone()))
            .collect()
    }
}

fn short_title(prompt: &str) -> String {
    let cleaned = prompt.split_whitespace().collect::<Vec<_>>().join(" ");
    let mut title: String = cleaned.chars().take(60).collect();
    if cleaned.chars().count() > 60 {
        title.push('…');
    }
    title
}
