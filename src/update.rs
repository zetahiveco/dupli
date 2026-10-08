//! Self-update: check GitHub releases at launch and install new versions.
//!
//! On startup Dupli fetches the latest release tag in the background. If
//! it's newer than the running version, the matching prebuilt tarball is
//! downloaded and swapped over the current binary (POSIX rename, so it can
//! even replace a running executable). The new version is used on the next
//! launch.
//!
//! Opt out with `"autoUpdate": false` in config or `DUPLI_NO_UPDATE_CHECK=1`.
//! A `--update` flag runs the same flow in the foreground.

use anyhow::{bail, Context, Result};
use serde::Deserialize;
use std::path::{Path, PathBuf};

const REPO: &str = "zetahiveco/dupli";
const CURRENT: &str = env!("CARGO_PKG_VERSION");

pub fn current_version() -> &'static str {
    CURRENT
}

#[derive(Deserialize)]
struct Release {
    tag_name: String,
}

/// Release asset triple for the platform we're running on.
fn target_triple() -> Option<&'static str> {
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("macos", "aarch64") => Some("aarch64-apple-darwin"),
        ("macos", "x86_64") => Some("x86_64-apple-darwin"),
        ("linux", "x86_64") => Some("x86_64-unknown-linux-gnu"),
        ("linux", "aarch64") => Some("aarch64-unknown-linux-gnu"),
        _ => None,
    }
}

/// A cargo checkout (`target/debug`, `target/release`) shouldn't
/// self-replace; only installed binaries update themselves.
fn is_dev_build(exe: &Path) -> bool {
    let text = exe.to_string_lossy();
    text.contains("target/debug")
        || text.contains("target/release")
        || text.contains("target\\debug")
        || text.contains("target\\release")
}

/// True if `latest` (e.g. "v0.2.0") is newer than the running version.
fn is_newer(latest: &str) -> bool {
    let numbers = |version: &str| -> Vec<u64> {
        version
            .trim_start_matches('v')
            .split(['.', '-'])
            .filter_map(|part| part.parse().ok())
            .collect()
    };
    let current = numbers(CURRENT);
    let latest = numbers(latest);
    for index in 0..3 {
        let new = latest.get(index).copied().unwrap_or(0);
        let old = current.get(index).copied().unwrap_or(0);
        match new.cmp(&old) {
            std::cmp::Ordering::Greater => return true,
            std::cmp::Ordering::Less => return false,
            std::cmp::Ordering::Equal => continue,
        }
    }
    false
}

fn client() -> Result<reqwest::Client> {
    reqwest::Client::builder()
        .user_agent(format!("dupli/{CURRENT}"))
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .context("Could not create an HTTP client")
}

async fn latest_tag() -> Result<String> {
    let release: Release = client()?
        .get(format!("https://api.github.com/repos/{REPO}/releases/latest"))
        .header("Accept", "application/vnd.github+json")
        .send()
        .await?
        .error_for_status()?
        .json()
        .await
        .context("Invalid response from GitHub releases API")?;
    Ok(release.tag_name)
}

/// Download the release tarball for this platform and extract it.
/// Returns the path to the `dupli` binary inside.
async fn download_release(tag: &str) -> Result<PathBuf> {
    let Some(target) = target_triple() else {
        bail!("No prebuilt binary is published for this platform");
    };
    let url =
        format!("https://github.com/{REPO}/releases/download/{tag}/dupli-{target}.tar.gz");
    let bytes = client()?
        .get(url)
        .send()
        .await?
        .error_for_status()?
        .bytes()
        .await
        .context("Download failed")?;

    let work = std::env::temp_dir().join(format!("dupli-update-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&work);
    std::fs::create_dir_all(&work).with_context(|| format!("Cannot create {}", work.display()))?;
    let archive = work.join("dupli.tar.gz");
    std::fs::write(&archive, &bytes)?;

    // bsdtar ships with macOS, Linux and Windows 10+; no archive crates needed.
    let status = std::process::Command::new("tar")
        .arg("-xzf")
        .arg(&archive)
        .arg("-C")
        .arg(&work)
        .status()
        .context("Could not run tar to extract the update")?;
    if !status.success() {
        bail!("tar could not extract the downloaded update");
    }
    let extracted = work.join("dupli");
    if !extracted.is_file() {
        bail!("The update archive did not contain a dupli binary");
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&extracted, std::fs::Permissions::from_mode(0o755))?;
    }
    Ok(extracted)
}

/// POSIX rename() atomically replaces even a running executable.
#[cfg(unix)]
fn replace_binary(exe: &Path, downloaded: &Path) -> Result<()> {
    std::fs::rename(downloaded, exe)
        .with_context(|| format!("Could not replace {}", exe.display()))?;
    Ok(())
}

/// Windows can't rename over a running exe; move the old one aside first.
#[cfg(windows)]
fn replace_binary(exe: &Path, downloaded: &Path) -> Result<()> {
    let backup = exe.with_extension("old");
    let _ = std::fs::remove_file(&backup);
    std::fs::rename(exe, &backup)?;
    std::fs::rename(downloaded, exe)?;
    Ok(())
}

/// One update pass: report `Ok(Some(note))` when a new version was
/// installed, `Ok(None)` when already current.
pub async fn check_and_update() -> Result<Option<String>> {
    let tag = latest_tag().await?;
    if !is_newer(&tag) {
        return Ok(None);
    }
    let downloaded = download_release(&tag).await?;
    let exe = std::env::current_exe().context("Could not locate the running binary")?;
    replace_binary(&exe, &downloaded)?;
    let work = downloaded.parent().map(std::path::Path::to_path_buf);
    if let Some(work) = work {
        let _ = std::fs::remove_dir_all(work);
    }
    Ok(Some(format!(
        "Dupli {tag} installed — restart to use it (you're on v{CURRENT})."
    )))
}

/// Fire-and-forget startup check used by every launch mode.
pub fn spawn_update_check() {
    if std::env::var_os("DUPLI_NO_UPDATE_CHECK").is_some() {
        return;
    }
    let Ok(exe) = std::env::current_exe() else {
        return;
    };
    if is_dev_build(&exe) {
        return;
    }
    tokio::spawn(async move {
        // Silent on failure: an offline machine shouldn't see noise.
        if let Ok(Some(note)) = check_and_update().await {
            eprintln!("{note}");
        }
    });
}

/// Manual `dupli update`: check + install in the foreground.
pub async fn run_update_command() -> Result<()> {
    println!("Checking for updates…");
    match check_and_update().await? {
        Some(note) => println!("{note}"),
        None => println!("Dupli v{CURRENT} is up to date."),
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::is_newer;

    #[test]
    fn compares_versions() {
        assert!(is_newer("v0.2.0"));
        assert!(is_newer("0.1.1"));
        assert!(is_newer("v1.0.0"));
        assert!(!is_newer("v0.1.0"));
        assert!(!is_newer("v0.0.9"));
        assert!(!is_newer("v0.1"));
    }

    /// Hits the network and the real GitHub release. Run explicitly:
    /// `cargo test --release -- --ignored`
    #[tokio::test]
    #[ignore]
    async fn downloads_and_extracts_published_release() {
        let binary = super::download_release("v0.1.0").await.expect("download failed");
        assert!(binary.is_file(), "extracted binary missing at {binary:?}");
        let output = std::process::Command::new(&binary)
            .arg("--version")
            .output()
            .expect("extracted binary did not run");
        assert!(output.status.success());
        assert!(String::from_utf8_lossy(&output.stdout).contains("dupli"));
        std::fs::remove_dir_all(binary.parent().unwrap()).ok();
    }
}
