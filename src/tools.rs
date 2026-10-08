use crate::history::FileHistory;
use crate::protocol::Action;
use crate::sandbox;
use anyhow::{anyhow, bail, Context, Result};
use std::io;
use std::path::{Component, Path, PathBuf};
use std::process::Command;

const MAX_FILE_BYTES: u64 = 256 * 1024;
const MAX_DIRECTORY_ENTRIES: usize = 200;

/// Execution context for a single action.
pub struct ToolCtx<'a> {
    pub root: &'a Path,
    pub sandbox: bool,
    pub sandbox_image: &'a str,
    /// File writes are recorded so the user can undo/redo and diff them.
    pub file_history: &'a mut FileHistory,
    /// Approval gate for shell commands.
    pub approve: &'a mut dyn FnMut(&str) -> bool,
}

pub fn execute(ctx: &mut ToolCtx, action: &Action) -> Result<String> {
    match action.kind.as_str() {
        "read_file" => {
            let path = checked_path(ctx.root, &required(&action.path, "path")?)?;
            let canonical = path
                .canonicalize()
                .with_context(|| format!("Cannot resolve {}", path.display()))?;
            ensure_inside(ctx.root, &canonical)?;
            let metadata = canonical.metadata()?;
            if metadata.len() > MAX_FILE_BYTES {
                bail!("File is larger than the {MAX_FILE_BYTES}-byte read limit");
            }
            let content = std::fs::read_to_string(&canonical)
                .with_context(|| format!("Cannot read {}", canonical.display()))?;
            Ok(format!("Read {}:\n{}", path.display(), content))
        }
        "list_dir" => {
            let path = checked_path(ctx.root, action.path.as_deref().unwrap_or("."))?;
            let canonical = path
                .canonicalize()
                .with_context(|| format!("Cannot resolve {}", path.display()))?;
            ensure_inside(ctx.root, &canonical)?;
            let mut entries = std::fs::read_dir(&canonical)
                .with_context(|| format!("Cannot list {}", canonical.display()))?
                .map(|entry| {
                    entry
                        .map(|item| item.file_name().to_string_lossy().into_owned())
                        .map_err(anyhow::Error::from)
                })
                .collect::<Result<Vec<_>>>()?;
            entries.sort();
            let omitted = entries.len().saturating_sub(MAX_DIRECTORY_ENTRIES);
            entries.truncate(MAX_DIRECTORY_ENTRIES);
            let suffix = if omitted > 0 {
                format!("\n... and {omitted} more entries")
            } else {
                String::new()
            };
            Ok(format!(
                "Contents of {}:\n{}{}",
                path.display(),
                entries.join("\n"),
                suffix
            ))
        }
        "write_file" => {
            let path = checked_path(ctx.root, &required(&action.path, "path")?)?;
            let content = required(&action.content, "content")?;
            let parent = path
                .parent()
                .ok_or_else(|| anyhow!("File path has no parent directory"))?;
            create_checked_parent(ctx.root, parent)?;
            let before = match std::fs::symlink_metadata(&path) {
                Ok(metadata) => {
                    if metadata.file_type().is_symlink() {
                        bail!("Refusing to write through a symbolic link");
                    }
                    ensure_inside(
                        ctx.root,
                        &path
                            .canonicalize()
                            .with_context(|| format!("Cannot resolve {}", path.display()))?,
                    )?;
                    Some(std::fs::read_to_string(&path).unwrap_or_default())
                }
                Err(error) if error.kind() == io::ErrorKind::NotFound => None,
                Err(error) => {
                    return Err(error).with_context(|| format!("Cannot inspect {}", path.display()))
                }
            };
            std::fs::write(&path, &content)
                .with_context(|| format!("Cannot write {}", path.display()))?;
            ctx.file_history
                .record(path.clone(), before, Some(content.clone()));
            Ok(format!("Wrote {}", path.display()))
        }
        "run" => {
            let command = required(&action.command, "command")?;
            if ctx.sandbox {
                let (status, text) =
                    sandbox::run_sandboxed(ctx.root, &command, ctx.sandbox_image)?;
                Ok(format!("Sandboxed command exited with {status}.\n{text}"))
            } else {
                if !(*ctx.approve)(&command) {
                    return Ok("Command not approved by user.".to_owned());
                }
                let output = Command::new("sh")
                    .args(["-c", &command])
                    .current_dir(ctx.root)
                    .output()
                    .context("Failed to run shell command")?;
                Ok(format!(
                    "Command exited with {}.\nstdout:\n{}\nstderr:\n{}",
                    output.status,
                    String::from_utf8_lossy(&output.stdout),
                    String::from_utf8_lossy(&output.stderr)
                ))
            }
        }
        other => bail!("Unsupported action type: {other}"),
    }
}

fn required(value: &Option<String>, name: &str) -> Result<String> {
    value
        .clone()
        .ok_or_else(|| anyhow!("Action is missing required field '{name}'"))
}

fn checked_path(root: &Path, relative: &str) -> Result<PathBuf> {
    let path = Path::new(relative);
    if path.is_absolute()
        || path.components().any(|part| {
            matches!(
                part,
                Component::ParentDir | Component::RootDir | Component::Prefix(_)
            )
        })
    {
        bail!("Project file paths must be relative and cannot traverse parent directories");
    }
    Ok(root.join(path))
}

fn ensure_inside(root: &Path, path: &Path) -> Result<()> {
    if !path.starts_with(root) {
        bail!("Path resolves outside the project directory");
    }
    Ok(())
}

fn create_checked_parent(root: &Path, parent: &Path) -> Result<()> {
    let relative = parent
        .strip_prefix(root)
        .context("File parent is outside the project directory")?;
    let mut current = root.to_path_buf();
    for component in relative.components() {
        let Component::Normal(name) = component else {
            bail!("Invalid file parent path");
        };
        current.push(name);
        match std::fs::symlink_metadata(&current) {
            Ok(metadata) => {
                if metadata.file_type().is_symlink() {
                    bail!("Refusing to write through a symbolic link");
                }
                ensure_inside(
                    root,
                    &current
                        .canonicalize()
                        .with_context(|| format!("Cannot resolve {}", current.display()))?,
                )?;
                if !metadata.is_dir() {
                    bail!("{} is not a directory", current.display());
                }
            }
            Err(error) if error.kind() == io::ErrorKind::NotFound => {
                std::fs::create_dir(&current)
                    .with_context(|| format!("Cannot create {}", current.display()))?;
            }
            Err(error) => {
                return Err(error).with_context(|| format!("Cannot inspect {}", current.display()))
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn checked_path_rejects_parent_traversal_and_absolute_paths() {
        let root = Path::new("/tmp/dupli-project");
        assert!(checked_path(root, "../outside").is_err());
        assert!(checked_path(root, "/tmp/outside").is_err());
    }

    #[test]
    fn checked_path_keeps_relative_paths_in_project() {
        let root = Path::new("/tmp/dupli-project");
        assert_eq!(
            checked_path(root, "src/main.rs").unwrap(),
            root.join("src/main.rs")
        );
    }
}
