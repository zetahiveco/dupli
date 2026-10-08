use crate::themes::Theme;
use anyhow::Result;
use std::io::{self, Write};

/// Output sink used by the agent loop so the same core can drive both
/// the terminal UI and the web UI. Must be `Send` so the agent loop can
/// run inside tokio tasks.
pub trait Reporter: Send {
    /// Streamed model output (the user-facing message field).
    fn assistant_chunk(&mut self, text: &str) -> Result<()>;
    /// Streamed reasoning/thinking output.
    fn reasoning_chunk(&mut self, text: &str) -> Result<()>;
    /// A status line (action results, errors, notices).
    fn status(&mut self, text: &str);
    /// Ask whether a shell command may run.
    fn approve(&mut self, command: &str) -> bool;
}

/// Writes to stdout with theme colors (terminal mode).
pub struct TerminalReporter {
    pub theme: &'static Theme,
}

impl Reporter for TerminalReporter {
    fn assistant_chunk(&mut self, text: &str) -> Result<()> {
        print!("{text}");
        io::stdout().flush()?;
        Ok(())
    }

    fn reasoning_chunk(&mut self, text: &str) -> Result<()> {
        print!("{}{}{}", self.theme.thinking, text, self.theme.reset);
        io::stdout().flush()?;
        Ok(())
    }

    fn status(&mut self, text: &str) {
        println!("\n{}{}{}", self.theme.dim, text, self.theme.reset);
    }

    fn approve(&mut self, command: &str) -> bool {
        print!(
            "{}Allow command `{command}`? [y/N] {}",
            self.theme.warning,
            self.theme.reset
        );
        io::stdout().flush().is_ok() && {
            let mut approval = String::new();
            if io::stdin().read_line(&mut approval).is_ok() {
                matches!(
                    approval.trim().to_ascii_lowercase().as_str(),
                    "y" | "yes"
                )
            } else {
                false
            }
        }
    }
}

/// Forwards events over a channel as JSON strings (web UI mode).
#[derive(Clone)]
pub struct WebReporter {
    pub tx: tokio::sync::mpsc::UnboundedSender<String>,
}

impl WebReporter {
    fn send(&self, event: &str, data: &str) {
        let payload = serde_json::json!({"type": event, "data": data});
        let _ = self.tx.send(payload.to_string());
    }
}

impl Reporter for WebReporter {
    fn assistant_chunk(&mut self, text: &str) -> Result<()> {
        self.send("text", text);
        Ok(())
    }

    fn reasoning_chunk(&mut self, text: &str) -> Result<()> {
        self.send("thinking", text);
        Ok(())
    }

    fn status(&mut self, text: &str) {
        self.send("status", text);
    }

    fn approve(&mut self, _command: &str) -> bool {
        // The web UI does not do interactive approvals yet.
        false
    }
}
