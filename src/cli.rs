use crate::agent::Agent;
use crate::config::{self, Provider};
use crate::picker;
use crate::protocol::ChatMessage;
use crate::report::TerminalReporter;
use crate::session::Session;
use crate::slash::{self, SlashHelper};
use crate::themes;
use crate::web;
use anyhow::{bail, Context, Result};
use rustyline::error::ReadlineError;
use rustyline::history::DefaultHistory;
use rustyline::{CompletionType, Config as RlConfig, Editor};
use std::env;

enum Flow {
    Continue,
    Exit,
}

pub async fn run() -> Result<()> {
    let options = config::parse_args()?;
    let root = env::current_dir()?.canonicalize()?;
    let loaded = config::load(&root)?;
    let cfg = config::resolve(loaded, &options)?;
    let theme = themes::get(&cfg.theme);

    // Web UI mode: serve the axum + leptos app and exit the TUI path.
    if options.web {
        let (provider, model) = pick_provider_model(&cfg)?;
        let mut agent = Agent::new(root.clone(), cfg.clone(), provider, model)?;
        print_startup_notes(&mut agent, theme);
        return web::serve(agent, cfg.web_port).await;
    }

    // Print mode: run a single prompt and exit.
    if let Some(prompt) = options.prompt.clone() {
        let (provider, model) = pick_provider_model(&cfg)?;
        let mut agent = Agent::new(root.clone(), cfg, provider, model)?;
        print_startup_notes(&mut agent, theme);
        let mut reporter = TerminalReporter { theme };
        return agent.run_prompt(prompt, &mut reporter).await;
    }

    // Interactive mode.
    let mut loaded_session = None;
    if options.continue_session {
        loaded_session = Some(Session::latest().context("No saved sessions to continue.")?);
    } else if let Some(id) = &options.session_id {
        loaded_session = Some(Session::load(id)?);
    }

    let (provider, model) = match &loaded_session {
        Some(session) => (
            Provider::parse(&session.provider)
                .unwrap_or(cfg.provider.unwrap_or(Provider::Anthropic)),
            session.model.clone(),
        ),
        None => pick_provider_model(&cfg)?,
    };

    let mut agent = Agent::new(root.clone(), cfg.clone(), provider, model)?;
    let resumed = loaded_session.is_some();
    if let Some(session) = &loaded_session {
        agent.resume(&session.id)?;
    }
    print_startup_notes(&mut agent, theme);
    if resumed {
        print_history(&agent, theme);
    }

    let mut reporter = TerminalReporter { theme };
    banner(&agent, theme);

    let rl_config = RlConfig::builder()
        .completion_type(CompletionType::List)
        .build();
    let mut rl = Editor::<SlashHelper, DefaultHistory>::with_config(rl_config)?;
    rl.set_helper(Some(SlashHelper::new()));

    loop {
        let readline = rl.readline("\u{00bb} ");
        match readline {
            Ok(line) => {
                let line = line.trim().to_owned();
                if line.is_empty() {
                    continue;
                }
                let _ = rl.add_history_entry(&line);
                if slash::is_command(&line) {
                    match handle_command(&mut agent, &line, &mut reporter).await? {
                        Flow::Continue => continue,
                        Flow::Exit => break,
                    }
                } else if let Err(error) = agent.run_prompt(line, &mut reporter).await {
                    eprintln!("{}Error: {error:#}{}", theme.error, theme.reset);
                }
            }
            Err(ReadlineError::Interrupted) | Err(ReadlineError::Eof) => break,
            Err(error) => return Err(error.into()),
        }
    }
    Ok(())
}

fn pick_provider_model(cfg: &config::Config) -> Result<(Provider, String)> {
    let provider = match cfg.provider {
        Some(provider) => provider,
        None => {
            let provider = config::choose_provider()?;
            // First-run choice: remember it so we don't ask again next time.
            if let Err(error) = config::save_global_provider(provider) {
                eprintln!(
                    "Warning: could not save the provider choice: {error:#}. \
                     You may be asked again."
                );
            }
            provider
        }
    };
    let model = match &cfg.model {
        Some(model) => model.clone(),
        None => config::choose_model(provider)?,
    };
    Ok((provider, model))
}

fn banner(agent: &Agent, theme: &'static themes::Theme) {
    println!(
        "{accent}Dupli {version}{reset} — {provider} / {model} — {root}\n{dim}/help for slash commands. Tab completes them. Shell actions require approval.{reset}",
        accent = theme.accent,
        reset = theme.reset,
        dim = theme.dim,
        version = env!("CARGO_PKG_VERSION"),
        provider = agent.provider.name(),
        model = agent.model,
        root = agent.root.display(),
    );
}

/// Replay a resumed session's conversation so the user sees where they
/// left off. Assistant messages are stored as raw provider JSON; show the
/// `message` field when present.
fn print_history(agent: &Agent, theme: &'static themes::Theme) {
    let transcript: Vec<ChatMessage> = agent
        .history
        .iter()
        .filter(|message| {
            !(message.role == "user" && message.content.starts_with("Action results:"))
        })
        .cloned()
        .collect();
    if transcript.is_empty() {
        println!("{}(This session has no messages yet.){}", theme.dim, theme.reset);
        return;
    }
    println!(
        "{}── previous history ──────────────{}",
        theme.dim, theme.reset
    );
    for message in &transcript {
        match message.role.as_str() {
            "user" => {
                println!(
                    "{}you{}: {}",
                    theme.accent, theme.reset, message.content
                );
            }
            "assistant" => {
                let text = serde_json::from_str::<serde_json::Value>(&message.content)
                    .ok()
                    .and_then(|value| {
                        value.get("message").and_then(|text| text.as_str()).map(str::to_owned)
                    })
                    .unwrap_or_else(|| message.content.clone());
                println!(
                    "{}dupli{}: {text}",
                    theme.accent, theme.reset
                );
            }
            _ => {}
        }
    }
    println!("{}──────────────────────────────────{}", theme.dim, theme.reset);
}

/// UTC date for a unix timestamp, no chrono dependency.
fn format_time(created: &u64) -> String {
    let secs = *created;
    let days = secs / 86_400;
    // Civil date from days since 1970-01-01 (Howard Hinnant's algorithm).
    let z = days as i64 + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let year = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if month <= 2 { year + 1 } else { year };
    let time_of_day = secs % 86_400;
    let (hour, minute) = (time_of_day / 3600, (time_of_day % 3600) / 60);
    format!("{year:04}-{month:02}-{day:02} {hour:02}:{minute:02}")
}

fn print_startup_notes(agent: &mut Agent, theme: &'static themes::Theme) {    for note in &agent.startup_notes {
        eprintln!("{}{note}{}", theme.warning, theme.reset);
    }
    if !agent.skills.is_empty() {
        println!(
            "{}{} skill{} loaded: {}{}",
            theme.dim,
            agent.skills.len(),
            if agent.skills.len() == 1 { "" } else { "s" },
            agent
                .skills
                .iter()
                .map(|skill| skill.name.clone())
                .collect::<Vec<_>>()
                .join(", "),
            theme.reset,
        );
    }
    if !agent.mcp.is_empty() {
        let tools: usize = agent.mcp.iter().map(|server| server.tools.len()).sum();
        println!(
            "{}{} MCP server{} connected ({tools} tool{}){}",
            theme.dim,
            agent.mcp.len(),
            if agent.mcp.len() == 1 { "" } else { "s" },
            if tools == 1 { "" } else { "s" },
            theme.reset,
        );
    }
}

async fn handle_command(
    agent: &mut Agent,
    line: &str,
    reporter: &mut TerminalReporter,
) -> Result<Flow> {
    let theme = reporter.theme;
    let parts: Vec<&str> = line.trim().split_whitespace().collect();
    let name = parts[0].trim_start_matches('/');
    let arg = parts.get(1).copied().unwrap_or("");

    match name {
        "help" => println!("{}", slash::help_text()),
        "exit" | "quit" => return Ok(Flow::Exit),
        "provider" => {
            if arg.is_empty() {
                println!(
                    "Current provider: {}. Options: {}",
                    agent.provider.name(),
                    Provider::all()
                        .iter()
                        .map(|provider| provider.id())
                        .collect::<Vec<_>>()
                        .join(", ")
                );
            } else {
                let provider = Provider::parse(arg)?;
                agent.set_provider(provider);
                println!("Switched to {}.", provider.name());
            }
        }
        "model" => {
            if arg.is_empty() {
                println!("Current model: {}", agent.model);
            } else {
                agent.set_model(arg.to_owned());
                println!("Switched to model {arg}.");
            }
        }
        "diff" => {
            println!("{}", agent.file_history.diff(&agent.root));
        }
        "undo" => match agent.file_history.undo(&agent.root)? {
            Some(message) => println!("{message}"),
            None => println!("Nothing to undo."),
        },
        "redo" => match agent.file_history.redo(&agent.root)? {
            Some(message) => println!("{message}"),
            None => println!("Nothing to redo."),
        },
        "navigate" => {
            if arg.is_empty() {
                println!("Conversation turns (use /navigate <turn> to rewind):");
                for (number, (index, text)) in agent.user_turns().iter().enumerate() {
                    let preview: String = text.chars().take(70).collect();
                    println!("  {}. [history {}] {}", number + 1, index, preview);
                }
            } else {
                let number: usize = arg
                    .parse()
                    .context("Turn number must be a positive integer")?;
                println!("{}", agent.navigate_to(number)?);
            }
        }
        "sessions" => {
            let sessions = Session::list();
            if sessions.is_empty() {
                println!("No saved sessions.");
            } else {
                let dim = theme.dim;
                let reset = theme.reset;
                let options: Vec<String> = sessions
                    .iter()
                    .take(12)
                    .map(|(id, title, created)| {
                        let date = format_time(created);
                        format!("{title}  {dim}{date} · {id}{reset}")
                    })
                    .collect();
                match picker::pick("Resume which session? (↑/↓ to move, Enter to pick, Esc to cancel)", &options)? {
                    Some(index) => {
                        let (id, _, _) = &sessions[index];
                        println!("{}", agent.resume(id)?);
                        print_history(agent, theme);
                    }
                    None => println!("Canceled."),
                }
            }
        }
        "theme" => {
            if arg.is_empty() {
                println!(
                    "Current theme: {}. Options: {}",
                    theme.name,
                    themes::names().join(", ")
                );
            } else if themes::names().contains(&arg) {
                reporter.theme = themes::get(arg);
                println!("Switched to the {arg} theme.");
            } else {
                bail!("Unknown theme '{arg}'. Options: {}", themes::names().join(", "));
            }
        }
        "skills" => {
            if agent.skills.is_empty() {
                println!(
                    "No skills found. Add SKILL.md files under .dupli/skills/<name>/ \
                     or ~/.config/dupli/skills/<name>/."
                );
            } else {
                for skill in &agent.skills {
                    println!("  {} — {}", skill.name, skill.description);
                }
            }
        }
        "mcp" => {
            let tools = agent.mcp_tool_list();
            if tools.is_empty() {
                println!(
                    "No MCP servers connected. Configure them under 'mcpServers' \
                     in dupli.json."
                );
            } else {
                for (server, tools) in tools {
                    println!("  {server}:");
                    for tool in tools {
                        println!(
                            "    {} — {}",
                            tool.name,
                            tool.description.as_deref().unwrap_or("(no description)")
                        );
                    }
                }
            }
        }
        "sandbox" => {
            let enabled = match arg {
                "on" => true,
                "off" => false,
                "" => !agent.config.sandbox,
                other => bail!("/sandbox takes 'on' or 'off', got '{other}'"),
            };
            agent.config.sandbox = enabled;
            println!(
                "Sandbox {}.",
                if enabled { "enabled (docker)" } else { "disabled (host shell)" }
            );
        }
        "diagnostics" => {
            if arg.is_empty() {
                bail!("/diagnostics needs a file path, e.g. /diagnostics src/main.rs");
            }
            let path = agent.root.join(arg);
            let language = detect_language(&path);
            let client = agent.lsp_for(&language)?;
            client.did_open(&path, &language)?;
            println!("{}", client.wait_diagnostics(&path, 5)?);
        }
        "image" => {
            if arg.is_empty() {
                bail!("/image needs a local path or an https URL, e.g. /image screenshot.png");
            }
            let message = agent.attach_image(arg).await?;
            println!("{message}");
        }
        other => bail!("Unknown command /{other}. Try /help."),
    }
    Ok(Flow::Continue)
}

fn detect_language(path: &std::path::Path) -> String {
    match path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or_default()
    {
        "rs" => "rust",
        "ts" | "tsx" => "typescript",
        "js" | "jsx" => "javascript",
        "py" => "python",
        "go" => "go",
        "json" => "json",
        "css" => "css",
        "html" => "html",
        "md" => "markdown",
        _ => "plaintext",
    }
    .to_owned()
}

#[cfg(test)]
mod tests {
    use super::format_time;

    #[test]
    fn format_time_renders_utc_dates() {
        // 2026-10-08 06:45:48 UTC
        assert_eq!(format_time(&1_791_441_948), "2026-10-08 06:45");
        // The epoch itself: 1970-01-01 00:00 UTC.
        assert_eq!(format_time(&0), "1970-01-01 00:00");
        // A leap day: 2024-02-29 12:00 UTC.
        assert_eq!(format_time(&1_709_208_000), "2024-02-29 12:00");
    }
}
