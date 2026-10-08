use anyhow::{Context, Result};
use std::path::{Path, PathBuf};
use std::process::Command;

/// Locate the docker CLI, checking common Docker Desktop install paths.
pub fn find_docker() -> Option<std::path::PathBuf> {
    let mut candidates = vec![
        PathBuf::from("docker"),
        PathBuf::from("/opt/homebrew/bin/docker"),
        PathBuf::from("/usr/local/bin/docker"),
        PathBuf::from("/Applications/Docker.app/Contents/Resources/bin/docker"),
    ];
    if let Some(home) = dirs::home_dir() {
        candidates.push(home.join(".colima/bin/docker"));
    }
    candidates
        .into_iter()
        .find(|path| path.is_file() || which_works(path))
}

fn which_works(path: &Path) -> bool {
    Command::new(path).arg("--version").output().is_ok()
}

/// Runs a shell command inside a Docker container with the project
/// mounted at `/workspace`. Used when `--sandbox` is enabled.
pub fn run_sandboxed(root: &Path, command: &str, image: &str) -> Result<(i32, String)> {
    let docker = find_docker()
        .context("Docker not found. Install Docker (or Colima) or run without --sandbox.")?;
    let absolute = root
        .canonicalize()
        .with_context(|| format!("Cannot resolve {}", root.display()))?;
    let output = Command::new(&docker)
        .args([
            "run",
            "--rm",
            "--workdir",
            "/workspace",
            "-v",
            &format!("{}:/workspace", absolute.display()),
            image,
            "sh",
            "-c",
            command,
        ])
        .current_dir(root)
        .output()
        .with_context(|| format!("Failed to run docker with image '{image}'"))?;
    let status = output.status.code().unwrap_or(-1);
    let text = format!(
        "stdout:\n{}\nstderr:\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    Ok((status, text))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn docker_lookup_does_not_panic() {
        // Just exercises the search; result depends on the machine.
        let _ = find_docker();
    }
}
