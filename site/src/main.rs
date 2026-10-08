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
  <div class="install">
    <code>cargo install --path .</code>
    <span class="hint">…or clone and <code>cargo run</code> right now</span>
  </div>
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

const STYLES: &str = r#"
:root {
  --bg: #0c0d11; --panel: #14161d; --border: #232733;
  --text: #e6e8f0; --muted: #9096a8; --accent: #8f6bff; --accent2: #b39bff;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text);
  font-family: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  font-size: 15px; line-height: 1.6; }
a { color: var(--accent2); }
code { background: var(--panel); border: 1px solid var(--border); border-radius: 4px;
  padding: 1px 6px; font-size: 0.92em; }
pre { background: var(--panel); border: 1px solid var(--border); border-radius: 10px;
  padding: 16px; overflow-x: auto; }
pre code { border: 0; padding: 0; }
h1, h2, h3 { line-height: 1.25; }

.site-header { display: flex; align-items: center; justify-content: space-between;
  padding: 18px 28px; border-bottom: 1px solid var(--border); }
.logo { color: var(--accent2); font-weight: 700; font-size: 20px; text-decoration: none; }
.logo .cursor { color: var(--accent); animation: blink 1.2s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }
.site-header nav a { margin-left: 20px; text-decoration: none; color: var(--muted); }
.site-header nav a:hover { color: var(--text); }

.hero { max-width: 820px; margin: 0 auto; padding: 72px 28px 40px; text-align: center; }
.kicker { color: var(--accent); text-transform: uppercase; letter-spacing: 3px; font-size: 12px; }
.hero h1 { font-size: clamp(30px, 6vw, 52px); margin: 14px 0; }
.hero em { color: var(--accent2); font-style: normal; }
.lede { color: var(--muted); font-size: 17px; }
.install { display: inline-flex; gap: 14px; align-items: center; background: var(--panel);
  border: 1px solid var(--border); border-radius: 10px; padding: 12px 18px; margin: 22px 0; }
.install code { border: 0; background: none; color: var(--accent2); }
.hint { color: var(--muted); font-size: 12px; }
.cta-row { display: flex; gap: 12px; justify-content: center; }
.btn { border: 1px solid var(--border); border-radius: 8px; padding: 10px 22px;
  text-decoration: none; color: var(--text); }
.btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.btn.primary:hover { background: var(--accent2); }

.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px; max-width: 1100px; margin: 30px auto; padding: 0 28px; }
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px;
  padding: 20px; }
.card h3 { margin-top: 0; color: var(--accent2); }
.card p { color: var(--muted); margin-bottom: 0; }

.term { max-width: 820px; margin: 30px auto 60px; padding: 0 28px; }
.p { color: var(--accent2); } .d { color: var(--muted); }

.docs { display: grid; grid-template-columns: 230px 1fr; max-width: 1100px;
  margin: 0 auto; padding: 32px 28px; gap: 36px; }
.docs-nav { border-right: 1px solid var(--border); padding-right: 18px; }
.docs-nav a { display: block; padding: 5px 8px; text-decoration: none; color: var(--muted);
  border-radius: 6px; }
.docs-nav a:hover { color: var(--text); }
.docs-nav a.active { color: var(--accent2); background: var(--panel); }
.docs-body { max-width: 720px; }
.docs-body h1 { border-bottom: 1px solid var(--border); padding-bottom: 10px; }
.docs-body table { border-collapse: collapse; width: 100%; }
.docs-body th, .docs-body td { border: 1px solid var(--border); padding: 6px 10px;
  text-align: left; }
.docs-body blockquote { border-left: 3px solid var(--accent); margin: 0; padding-left: 16px;
  color: var(--muted); }

.site-footer { text-align: center; color: var(--muted); padding: 30px;
  border-top: 1px solid var(--border); font-size: 13px; }
"#;
