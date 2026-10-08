//! Minimal interactive arrow-key menus for the TUI (used by `/sessions`).
//!
//! Draws a list with one highlighted row; ↑/↓ (or j/k) move, Enter picks,
//! Esc/q cancels. Implemented with crossterm raw mode so it works on
//! macOS, Linux and Windows terminals.

use anyhow::Result;
use crossterm::cursor::{Hide, MoveToPreviousLine, Show};
use crossterm::event::{read, Event, KeyCode, KeyEventKind, KeyModifiers};
use crossterm::execute;
use crossterm::style::Print;
use crossterm::terminal::{disable_raw_mode, enable_raw_mode, Clear, ClearType};
use std::io::Write;

/// Show `options` as a selectable menu. Returns the chosen index, or
/// `None` if the user cancelled.
pub fn pick(prompt: &str, options: &[String]) -> Result<Option<usize>> {
    if options.is_empty() {
        return Ok(None);
    }

    let mut selected: usize = 0;
    let mut drawn: u16 = 0;
    enable_raw_mode()?;
    let outcome = (|| -> Result<Option<usize>> {
        let mut stdout = std::io::stdout();
        execute!(stdout, Hide)?;
        loop {
            draw(&mut stdout, prompt, options, selected, drawn)?;
            drawn = options.len() as u16 + 1;
            let event = read()?;
            let Event::Key(key) = event else { continue };
            if key.kind != KeyEventKind::Press {
                continue;
            }
            match key.code {
                KeyCode::Up | KeyCode::Char('k') => {
                    if selected > 0 {
                        selected -= 1;
                    }
                }
                KeyCode::Down | KeyCode::Char('j') => {
                    if selected + 1 < options.len() {
                        selected += 1;
                    }
                }
                KeyCode::Enter => return Ok(Some(selected)),
                KeyCode::Esc | KeyCode::Char('q') => return Ok(None),
                KeyCode::Char('c') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                    return Ok(None)
                }
                _ => {}
            }
        }
    })();

    // Restore the terminal no matter how we got here.
    let _ = disable_raw_mode();
    let mut stdout = std::io::stdout();
    if drawn > 0 {
        let _ = execute!(stdout, MoveToPreviousLine(drawn), Clear(ClearType::FromCursorDown));
    }
    let _ = execute!(stdout, Show);
    outcome
}

fn draw(
    stdout: &mut std::io::Stdout,
    prompt: &str,
    options: &[String],
    selected: usize,
    drawn: u16,
) -> Result<()> {
    let width = crossterm::terminal::size().map(|(width, _)| width as usize).unwrap_or(80);
    if drawn > 0 {
        execute!(stdout, MoveToPreviousLine(drawn), Clear(ClearType::FromCursorDown))?;
    }
    execute!(stdout, Print(truncate(prompt, width)), Print("\r\n"))?;
    for (index, option) in options.iter().enumerate() {
        if index == selected {
            execute!(stdout, Print(format!("  > {}\r\n", truncate(option, width.saturating_sub(4)))))?;
        } else {
            execute!(stdout, Print(format!("    {}\r\n", truncate(option, width.saturating_sub(4)))))?;
        }
    }
    stdout.flush()?;
    Ok(())
}

/// Clip text to `max` columns, keeping it on one line.
fn truncate(text: &str, max: usize) -> String {
    let cleaned: String = text
        .chars()
        .map(|character| if character == '\n' || character == '\r' { ' ' } else { character })
        .collect();
    if cleaned.chars().count() <= max {
        cleaned
    } else {
        let mut out: String = cleaned.chars().take(max.saturating_sub(1)).collect();
        out.push('…');
        out
    }
}
