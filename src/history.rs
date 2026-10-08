use anyhow::{Context, Result};
use similar::{ChangeTag, TextDiff};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

/// One reversible file write: the file content before and after.
#[derive(Clone, Debug)]
pub struct Change {
    pub path: PathBuf,
    pub before: Option<String>,
    pub after: Option<String>,
}

/// Tracks file writes made by the agent so they can be undone, redone,
/// and diffed against the state at the start of the session.
#[derive(Default)]
pub struct FileHistory {
    /// Content of each touched file before the first modification (None = new file).
    originals: HashMap<PathBuf, Option<String>>,
    undo_stack: Vec<Change>,
    redo_stack: Vec<Change>,
}

impl FileHistory {
    /// Records a write of `after` to `path` (previously `before`).
    pub fn record(&mut self, path: PathBuf, before: Option<String>, after: Option<String>) {
        self.originals
            .entry(path.clone())
            .or_insert_with(|| before.clone());
        self.undo_stack.push(Change { path, before, after });
        self.redo_stack.clear();
    }

    pub fn is_empty(&self) -> bool {
        self.undo_stack.is_empty()
    }

    /// Reverts the most recent write. Returns a user-facing description.
    pub fn undo(&mut self, root: &Path) -> Result<Option<String>> {
        let Some(change) = self.undo_stack.pop() else {
            return Ok(None);
        };
        apply_change(root, &change.before, &change.path)?;
        self.redo_stack.push(change.clone());
        Ok(Some(format!(
            "Reverted {}",
            change.path.strip_prefix(root).unwrap_or(&change.path).display()
        )))
    }

    /// Re-applies the most recently undone write.
    pub fn redo(&mut self, root: &Path) -> Result<Option<String>> {
        let Some(change) = self.redo_stack.pop() else {
            return Ok(None);
        };
        apply_change(root, &change.after, &change.path)?;
        self.undo_stack.push(change.clone());
        Ok(Some(format!(
            "Re-applied {}",
            change.path.strip_prefix(root).unwrap_or(&change.path).display()
        )))
    }

    /// Unified diff of every touched file against its pre-session content.
    pub fn diff(&self, root: &Path) -> String {
        let mut out = String::new();
        let mut paths: Vec<&PathBuf> = self.originals.keys().collect();
        paths.sort();
        for path in paths {
            let before = self.originals[path].clone().unwrap_or_default();
            let current = std::fs::read_to_string(path).unwrap_or_default();
            if before == current {
                continue;
            }
            let relative = path.strip_prefix(root).unwrap_or(path);
            let diff = TextDiff::from_lines(&before, &current);
            out.push_str(&format!("--- {} (session start)\n+++ {} (current)\n", relative.display(), relative.display()));
            for change in diff.iter_all_changes() {
                let sign = match change.tag() {
                    ChangeTag::Delete => "-",
                    ChangeTag::Insert => "+",
                    ChangeTag::Equal => " ",
                };
                out.push_str(&format!("{sign}{}", change.value()));
                if !change.value().ends_with('\n') {
                    out.push('\n');
                }
            }
            out.push('\n');
        }
        if out.is_empty() {
            out.push_str("No file changes this session.\n");
        }
        out
    }
}

fn apply_change(root: &Path, content: &Option<String>, path: &PathBuf) -> Result<()> {
    match content {
        Some(text) => {
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent)
                    .with_context(|| format!("Cannot create {}", parent.display()))?;
            }
            std::fs::write(path, text)
                .with_context(|| format!("Cannot write {}", path.display()))?;
        }
        None => {
            // The file did not exist before the change, so remove it.
            let _ = std::fs::remove_file(path);
        }
    }
    let _ = root;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn record_undo_redo_roundtrip() {
        let root = std::env::temp_dir().join(format!("dupli-hist-{}", std::process::id()));
        std::fs::create_dir_all(&root).unwrap();
        let file = root.join("a.txt");
        std::fs::write(&file, "one").unwrap();

        let mut history = FileHistory::default();
        history.record(file.clone(), Some("one".into()), Some("two".into()));
        history.record(file.clone(), Some("two".into()), Some("three".into()));

        assert!(history.undo(&root).unwrap().is_some());
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "two");
        assert!(history.undo(&root).unwrap().is_some());
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "one");
        assert!(history.redo(&root).unwrap().is_some());
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "two");

        assert!(history.undo(&root).unwrap().is_some());
        assert!(history.diff(&root).contains("No file changes"));
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn undo_removes_files_created_in_session() {
        let root = std::env::temp_dir().join(format!("dupli-hist2-{}", std::process::id()));
        std::fs::create_dir_all(&root).unwrap();
        let file = root.join("new.txt");
        let mut history = FileHistory::default();
        history.record(file.clone(), None, Some("hi".into()));
        std::fs::write(&file, "hi").unwrap();
        history.undo(&root).unwrap();
        assert!(!file.exists());
        let _ = std::fs::remove_dir_all(&root);
    }
}
