// Dupli site generator.
//
// A tiny Rust SSG: markdown content from `content/` is rendered with
// pulldown-cmark, wrapped in a shared layout, and written to `dist/`.
// Marketing pages use a custom hero template; docs pages share a sidebar.

use pulldown_cmark::{html, Options, Parser};
use std::fs;
use std::path::{Path, PathBuf};

fn main() -> anyhow::Result<()> {
    // Anchor everything to the site crate so `cargo run -p dupli-site`
    // works from the workspace root.
    let site_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let content_root = site_root.join("content").join("docs");
    let out_dir = site_root.join("dist");
    let _ = fs::remove_dir_all(&out_dir);
    fs::create_dir_all(&out_dir)?;

    fs::write(out_dir.join("styles.css"), STYLES)?;
    fs::write(out_dir.join("vercel.json"), r#"{"cleanUrls": true}"#)?;
    fs::write(out_dir.join("install.sh"), INSTALL_SH)?;
    // Shell scripts must be executable-friendly; Vercel serves them as-is.
    fs::write(out_dir.join("install.ps1"), INSTALL_PS1)?;

    // Marketing landing page.
    write_page(&out_dir, "index.html", &landing());

    // Docs pages.
    let docs: &[(&str, &str, String)] = &[
        ("docs/index", "Docs", fs::read_to_string(content_root.join("index.md"))?),
        ("docs/getting-started", "Getting Started", fs::read_to_string(content_root.join("getting-started.md"))?),
        ("docs/installation", "Installation", fs::read_to_string(content_root.join("installation.md"))?),
        ("docs/providers", "Providers", fs::read_to_string(content_root.join("providers.md"))?),
        ("docs/configuration", "Configuration", fs::read_to_string(content_root.join("configuration.md"))?),
        ("docs/slash-commands", "Slash Commands", fs::read_to_string(content_root.join("slash-commands.md"))?),
        ("docs/sessions", "Sessions", fs::read_to_string(content_root.join("sessions.md"))?),
        ("docs/sandbox", "Sandbox", fs::read_to_string(content_root.join("sandbox.md"))?),
        ("docs/mcp", "MCP", fs::read_to_string(content_root.join("mcp.md"))?),
        ("docs/skills", "Skills", fs::read_to_string(content_root.join("skills.md"))?),
        ("docs/themes", "Themes", fs::read_to_string(content_root.join("themes.md"))?),
        ("docs/web", "Web UI", fs::read_to_string(content_root.join("web.md"))?),
        ("docs/lsp", "LSP & Diagnostics", fs::read_to_string(content_root.join("lsp.md"))?),
        ("docs/images", "Images", fs::read_to_string(content_root.join("images.md"))?),
    ];

    for (route, title, markdown) in docs {
        let path = if route.ends_with("index") {
            route.trim_end_matches("index").to_owned()
        } else {
            format!("{route}/")
        };
        let file_path = if path.is_empty() {
            out_dir.join("index.html")
        } else {
            out_dir.join(format!("{path}index.html"))
        };
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(
            file_path,
            docs_layout(&doc_url(route), title, &render_markdown(markdown)),
        )?;
    }

    println!("Site written to dist/ ({} docs pages)", docs.len());
    Ok(())
}

// Kept for plain single-file pages if needed later.
#[allow(dead_code)]
fn write_page(out_dir: &Path, name: &str, html: &str) {
    fs::write(out_dir.join(name), html).expect("write page");
}

fn render_markdown(markdown: &str) -> String {
    let parser = Parser::new_ext(markdown, Options::all());
    let mut output = String::new();
    html::push_html(&mut output, parser);
    output
}

fn doc_url(route: &str) -> &str {
    if route == "docs/index" {
        "/docs/"
    } else {
        route.trim_start_matches("docs")
    }
}

const NAV: &str = r#"
<header class="site-header">
  <a class="logo" href="/">dupli<span class="cursor">▌</span></a>
  <nav>
    <a href="/docs/getting-started">Getting Started</a>
    <a href="/docs/">Docs</a>
    <a href="https://github.com/zetahiveco/dupli">GitHub</a>
  </nav>
</header>"#;

fn landing() -> String {
    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dupli — a minimal Rust coding agent</title>
<meta name="description" content="Dupli is a minimal, hackable AI coding agent written in Rust. MCP, Docker sandboxes, sessions, themes, skills, LSP diagnostics, undo/redo, and a web UI.">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
{NAV}
<section class="hero">
  <p class="kicker">a minimal coding agent, written in rust</p>
  <h1>There are many agent harnesses.<br>But this one is <em>yours</em>.</h1>
  <p class="lede">Dupli runs in your project folder, streams from your own API keys, and stays out of your way. No sub-agent ceremony. No permission theater. Just a fast Rust core you can read in an afternoon and bend to your workflow.</p>
  <div class="install-box">
    <div class="tabs">
      <button class="tab active" data-panel="tab-curl">curl</button>
      <button class="tab" data-panel="tab-powershell">PowerShell</button>
      <button class="tab" data-panel="tab-cargo">cargo</button>
    </div>
    <div class="tab-panel active" id="tab-curl"><code>curl -fsSL https://dupli-zetahive.vercel.app/install.sh | sh</code></div>
    <div class="tab-panel" id="tab-powershell"><code>powershell -c "irm https://dupli-zetahive.vercel.app/install.ps1 | iex"</code></div>
    <div class="tab-panel" id="tab-cargo"><code>cargo install --locked --git https://github.com/zetahiveco/dupli dupli</code></div>
  </div>
  <script>
    document.querySelectorAll('.tab').forEach(function (button) {{
      button.addEventListener('click', function () {{
        document.querySelectorAll('.tab').forEach(function (b) {{ b.classList.remove('active'); }});
        document.querySelectorAll('.tab-panel').forEach(function (p) {{ p.classList.remove('active'); }});
        button.classList.add('active');
        document.getElementById(button.dataset.panel).classList.add('active');
      }});
    }});
  </script>
  <div class="cta-row">
    <a class="btn primary" href="/docs/getting-started">Get started</a>
    <a class="btn" href="/docs/">Read the docs</a>
  </div>
</section>
<section class="grid">
  <div class="card"><h3>MCP built in</h3><p>Connect any MCP server over stdio with a few lines of JSON. Tools show up in the model's toolbox automatically.</p></div>
  <div class="card"><h3>Docker sandbox</h3><p>Start with <code>--sandbox</code> and every shell command runs inside a container with your project mounted at <code>/workspace</code>.</p></div>
  <div class="card"><h3>Sessions</h3><p>Every conversation is saved as a tree-friendly JSON file. Resume with <code>-c</code> or <code>--session</code>, or rewind with <code>/navigate</code>.</p></div>
  <div class="card"><h3>Themes</h3><p>Six built-in color themes, switchable live with <code>/theme</code>. Dracula, Nord, Solarized, Everforest and friends.</p></div>
  <div class="card"><h3>Skills</h3><p>Drop a <code>SKILL.md</code> in <code>.dupli/skills/</code> and the agent loads your playbook on demand — progressive disclosure, no prompt bloat.</p></div>
  <div class="card"><h3>Things Pi doesn't have</h3><p>Own LSP diagnostics, undo/redo for every file write, session diffing with <code>/diff</code>, and a web UI via axum + leptos.</p></div>
</section>
<section class="term">
<pre><code><span class="p">$</span> dupli --sandbox
<span class="d">Dupli 0.1.0 — Anthropic / claude-sonnet-4 — /Users/you/project</span>
<span class="p">»</span> refactor the auth module and run the tests
<span class="d">…streams plan, edits files, runs commands inside docker…</span></code></pre>
</section>
<footer class="site-footer">Dupli — MIT licensed. Inspired by <a href="https://pi.dev">Pi</a> and <a href="https://opencode.ai">OpenCode</a>, built in Rust.</footer>
</body>
</html>"#
    )
}

fn docs_layout(active: &str, title: &str, content: &str) -> String {
    let links: &[(&str, &str)] = &[
        ("/docs/", "Overview"),
        ("/docs/getting-started", "Getting Started"),
        ("/docs/installation", "Installation"),
        ("/docs/providers", "Providers"),
        ("/docs/configuration", "Configuration"),
        ("/docs/slash-commands", "Slash Commands"),
        ("/docs/sessions", "Sessions"),
        ("/docs/sandbox", "Sandbox"),
        ("/docs/mcp", "MCP"),
        ("/docs/skills", "Skills"),
        ("/docs/themes", "Themes"),
        ("/docs/web", "Web UI"),
        ("/docs/lsp", "LSP & Diagnostics"),
        ("/docs/images", "Images"),
    ];
    let nav = links
        .iter()
        .map(|(href, label)| {
            let class = if *href == active { " class=\"active\"" } else { "" };
            format!("<a href=\"{href}\"{class}>{label}</a>")
        })
        .collect::<Vec<_>>()
        .join("\n");
    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — Dupli Docs</title>
<meta name="description" content="{title} — documentation for Dupli, a minimal Rust coding agent.">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
{NAV}
<div class="docs">
  <aside class="docs-nav">{nav}</aside>
  <main class="docs-body">{content}</main>
</div>
<footer class="site-footer">Dupli — MIT licensed. <a href="/docs/">All docs</a></footer>
</body>
</html>"#
    )
}

const STYLES: &str = include_str!("../assets/styles.css");
const INSTALL_SH: &str = include_str!("../assets/install.sh");
const INSTALL_PS1: &str = include_str!("../assets/install.ps1");
