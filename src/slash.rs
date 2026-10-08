use crate::config::Provider;
use rustyline::completion::Completer;
use rustyline::highlight::Highlighter;
use rustyline::hint::Hinter;
use rustyline::validate::Validator;
use rustyline::Context;
use std::collections::HashMap;

pub struct CommandDef {
    pub name: &'static str,
    pub args: &'static str,
    pub desc: &'static str,
}

pub const COMMANDS: &[CommandDef] = &[
    CommandDef { name: "help", args: "", desc: "Show slash commands" },
    CommandDef { name: "exit", args: "", desc: "Leave Dupli" },
    CommandDef { name: "quit", args: "", desc: "Leave Dupli" },
    CommandDef { name: "provider", args: "[name]", desc: "Switch or show the active provider" },
    CommandDef { name: "model", args: "[model]", desc: "Switch or show the active model" },
    CommandDef { name: "diff", args: "", desc: "View file changes made this session" },
    CommandDef { name: "undo", args: "", desc: "Revert the last file write" },
    CommandDef { name: "redo", args: "", desc: "Re-apply an undone write" },
    CommandDef { name: "navigate", args: "[turn]", desc: "Rewind the conversation to a turn" },
    CommandDef { name: "sessions", args: "", desc: "List saved sessions" },
    CommandDef { name: "resume", args: "[id]", desc: "Resume a saved session" },
    CommandDef { name: "theme", args: "[name]", desc: "Switch the color theme" },
    CommandDef { name: "skills", args: "", desc: "List available skills" },
    CommandDef { name: "mcp", args: "", desc: "List connected MCP servers and tools" },
    CommandDef { name: "sandbox", args: "[on|off]", desc: "Toggle the Docker sandbox" },
    CommandDef { name: "diagnostics", args: "[path]", desc: "LSP diagnostics for a file" },
    CommandDef { name: "image", args: "<path|url>", desc: "Attach an image to your next message" },
];

pub fn help_text() -> String {
    let mut out = String::from("Slash commands:\n");
    for command in COMMANDS {
        out.push_str(&format!(
            "  /{} {}  —  {}\n",
            command.name,
            command.args,
            command.desc
        ));
    }
    out.push_str("\nAnything else is sent to the model.\n");
    out
}

pub fn is_command(line: &str) -> bool {
    line.trim_start().starts_with('/')
}

pub fn command_name(line: &str) -> &str {
    line.trim()
        .trim_start_matches('/')
        .split_whitespace()
        .next()
        .unwrap_or("")
}

/// rustyline completer: completes command names after `/` and arguments
/// after `/provider`, `/theme`, and `/resume`.
pub struct SlashHelper {
    pub providers: Vec<String>,
    pub themes: Vec<String>,
    pub session_ids: Vec<String>,
}

impl SlashHelper {
    pub fn new() -> Self {
        Self {
            providers: Provider::all()
                .iter()
                .map(|provider| provider.id().to_owned())
                .collect(),
            themes: crate::themes::names()
                .into_iter()
                .map(str::to_owned)
                .collect(),
            session_ids: crate::session::Session::list()
                .into_iter()
                .take(20)
                .map(|(id, _, _)| id)
                .collect(),
        }
    }

    fn arg_candidates(&self, command: &str) -> Vec<String> {
        match command {
            "provider" => self.providers.clone(),
            "theme" => self.themes.clone(),
            "resume" => self.session_ids.clone(),
            // Complete image files in the current directory for /image.
            "image" => {
                let mut files = Vec::new();
                if let Ok(entries) = std::fs::read_dir(".") {
                    for entry in entries.flatten() {
                        let name = entry.file_name().to_string_lossy().into_owned();
                        let lower = name.to_ascii_lowercase();
                        if lower.ends_with(".png")
                            || lower.ends_with(".jpg")
                            || lower.ends_with(".jpeg")
                            || lower.ends_with(".gif")
                            || lower.ends_with(".webp")
                        {
                            files.push(name);
                        }
                    }
                }
                files.sort();
                files
            }
            _ => Vec::new(),
        }
    }
}

impl Default for SlashHelper {
    fn default() -> Self {
        Self::new()
    }
}

impl Completer for SlashHelper {
    type Candidate = String;

    fn complete(
        &self,
        line: &str,
        pos: usize,
        _ctx: &Context<'_>,
    ) -> rustyline::Result<(usize, Vec<String>)> {
        if !line.starts_with('/') {
            return Ok((pos, Vec::new()));
        }
        let up_to = &line[..pos];
        let Some(space) = up_to.find(' ') else {
            // Complete the command name itself.
            let matches = COMMANDS
                .iter()
                .map(|command| format!("/{}", command.name))
                .filter(|candidate| candidate.starts_with(up_to))
                .collect();
            return Ok((0, matches));
        };
        let command = up_to[..space].trim_start_matches('/').to_owned();
        let arg_start = up_to.len();
        let arg = &up_to[space + 1..];
        let arg_start = arg_start - arg.len();
        let candidates = self.arg_candidates(&command);
        let matches = candidates
            .iter()
            .filter(|candidate| candidate.starts_with(arg))
            .cloned()
            .collect();
        Ok((arg_start, matches))
    }
}

impl Hinter for SlashHelper {
    type Hint = String;
}

impl Highlighter for SlashHelper {}

impl Validator for SlashHelper {}

impl rustyline::Helper for SlashHelper {}

pub type CandidateMap = HashMap<String, Vec<String>>;
