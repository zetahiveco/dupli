use anyhow::{Context, Result};
use std::path::{Path, PathBuf};

/// A loaded skill: a folder with a `SKILL.md` file carrying frontmatter.
#[derive(Clone, Debug)]
pub struct Skill {
    pub name: String,
    pub description: String,
    pub path: PathBuf,
}

fn parse_frontmatter(text: &str) -> Option<(String, String)> {
    let rest = text.strip_prefix("---")?;
    let end = rest.find("\n---")?;
    let block = &rest[..end];
    let mut name = None;
    let mut description = None;
    for line in block.lines() {
        if let Some(value) = line.strip_prefix("name:") {
            name = Some(value.trim().trim_matches('"').to_owned());
        } else if let Some(value) = line.strip_prefix("description:") {
            description = Some(value.trim().trim_matches('"').to_owned());
        }
    }
    Some((name?, description.unwrap_or_default()))
}

/// Scan directories (each may hold `NAME/SKILL.md`) for skills.
pub fn scan(dirs: &[PathBuf]) -> Vec<Skill> {
    let mut skills = Vec::new();
    let mut seen = Vec::new();
    for dir in dirs {
        let entries = match std::fs::read_dir(dir) {
            Ok(entries) => entries,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let skill_file = entry.path().join("SKILL.md");
            if !skill_file.is_file() {
                continue;
            }
            let text = match std::fs::read_to_string(&skill_file) {
                Ok(text) => text,
                Err(_) => continue,
            };
            let Some((name, description)) = parse_frontmatter(&text) else {
                continue;
            };
            if seen.contains(&name) {
                continue;
            }
            seen.push(name.clone());
            skills.push(Skill {
                name,
                description,
                path: skill_file,
            });
        }
    }
    skills.sort_by(|a, b| a.name.cmp(&b.name));
    skills
}

/// Default skill directories: per-project `.dupli/skills` and global skills.
pub fn directories(root: &Path) -> Vec<PathBuf> {
    let mut dirs = vec![root.join(".dupli").join("skills")];
    if let Some(home) = dirs::config_dir() {
        dirs.push(home.join("dupli").join("skills"));
    }
    dirs
}

/// Full instructions for one skill, resolved by name.
pub fn load(root: &Path, name: &str) -> Result<String> {
    for skill in scan(&directories(root)) {
        if skill.name == name {
            return std::fs::read_to_string(&skill.path)
                .with_context(|| format!("Cannot read skill {}", skill.path.display()));
        }
    }
    for dir in directories(root) {
        let direct = dir.join(name).join("SKILL.md");
        if direct.is_file() {
            return std::fs::read_to_string(&direct)
                .with_context(|| format!("Cannot read skill {}", direct.display()));
        }
    }
    Err(anyhow::anyhow!("No skill named '{name}'"))
}

/// Compact summary injected into the system prompt.
pub fn summary(skills: &[Skill]) -> String {
    if skills.is_empty() {
        return String::new();
    }
    let mut out = String::from("\nAvailable skills (load with the load_skill action):\n");
    for skill in skills {
        out.push_str(&format!(
            "- {}: {} ({})\n",
            skill.name,
            skill.description,
            skill.path.display()
        ));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_skill_frontmatter() {
        let (name, description) = parse_frontmatter("---\nname: commit\ndescription: \"Make commits\"\n---\nbody")
            .unwrap();
        assert_eq!(name, "commit");
        assert_eq!(description, "Make commits");
    }
}
