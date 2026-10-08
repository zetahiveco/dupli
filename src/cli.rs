use crate::agent::Agent;
use crate::config::{self, Provider};
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
    if let Some(session) = &loaded_session {
        agent.resume(&session.id)?;
    }
    print_startup_notes(&mut agent, theme);

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
                    match handle_command(&mut agent, &line, &mut reporter)? {
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
        None => config::choose_provider()?,
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

fn print_startup_notes(agent: &mut Agent, theme: &'static themes::Theme) {
    for note in &agent.startup_notes {
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

fn handle_command(
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
                for (id, title, _created) in sessions.iter().take(10) {
                    println!("  {id}  {title}");
                }
            }
        }
        "resume" => {
            if arg.is_empty() {
                bail!("/resume needs a session id. List them with /sessions.");
            }
            println!("{}", agent.resume(arg)?);
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
