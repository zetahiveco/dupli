use crate::protocol::ChatMessage;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

/// A persisted conversation. Sessions live in the user data directory
/// (e.g. `~/Library/Application Support/dupli/sessions` on macOS).
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub created: u64,
    pub provider: String,
    pub model: String,
    pub title: String,
    pub messages: Vec<ChatMessage>,
}

pub fn sessions_dir() -> Option<PathBuf> {
    dirs::data_dir().map(|base| base.join("dupli").join("sessions"))
}

pub fn new_id() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let millis = now.as_millis() as u64;
    let entropy = std::process::id() as u64;
    format!("{millis:x}-{entropy:x}")
}

impl Session {
    pub fn new(provider: &str, model: &str) -> Self {
        Self {
            id: new_id(),
            created: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            provider: provider.to_owned(),
            model: model.to_owned(),
            title: String::new(),
            messages: Vec::new(),
        }
    }

    pub fn save(&self) -> Result<()> {
        let Some(dir) = sessions_dir() else {
            return Ok(());
        };
        std::fs::create_dir_all(&dir)
            .with_context(|| format!("Cannot create {}", dir.display()))?;
        let path = dir.join(format!("{}.json", self.id));
        let text = serde_json::to_string_pretty(self)?;
        std::fs::write(path, text)?;
        Ok(())
    }

    pub fn load(id: &str) -> Result<Session> {
        let dir = sessions_dir().context("No sessions directory available")?;
        let path = dir.join(format!("{id}.json"));
        let text = std::fs::read_to_string(&path)
            .with_context(|| format!("Cannot read session {}", path.display()))?;
        serde_json::from_str(&text).with_context(|| format!("Invalid session file {id}"))
    }

    /// List sessions, newest first.
    pub fn list() -> Vec<(String, String, u64)> {
        let Some(dir) = sessions_dir() else {
            return Vec::new();
        };
        let mut sessions = Vec::new();
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().is_none_or(|ext| ext != "json") {
                    continue;
                }
                if let Ok(text) = std::fs::read_to_string(&path) {
                    if let Ok(session) = serde_json::from_str::<Session>(&text) {
                        sessions.push((session.id, session.title, session.created));
                    }
                }
            }
        }
        sessions.sort_by(|a, b| b.2.cmp(&a.2));
        sessions
    }

    pub fn latest() -> Option<Session> {
        let (id, _, _) = Self::list().into_iter().next()?;
        Self::load(&id).ok()
    }
}
