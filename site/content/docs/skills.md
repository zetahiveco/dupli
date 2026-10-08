# Skills

Skills are reusable instruction packages. Drop a `SKILL.md` in a skills
folder and Dupli advertises it to the model, which loads the full content
on demand — progressive disclosure without prompt bloat.

## Locations

- Per-project: `.dupli/skills/<name>/SKILL.md`
- Global: `~/.config/dupli/skills/<name>/SKILL.md`

## Format

```markdown
---
name: commit
description: Write commit messages and create commits from staged changes
---

When asked to commit:

1. Run `git diff --staged` and read it carefully.
2. Write a one-line summary in the imperative mood...
```

## Using skills

Ask for it in plain language ("commit this") and the model loads it:

```json
{"type": "load_skill", "name": "commit"}
```

Or list what's available at any time:

```text
» /skills
  commit — Write commit messages and create commits from staged changes
```

## Notes

- Project skills shadow global skills with the same name.
- Frontmatter supports `name:` and `description:`; everything below the
  second `---` is the instruction body.
- Skills are plain Markdown. Keep them short — the model reads the whole
  file when it loads the skill.
