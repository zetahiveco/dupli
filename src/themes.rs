use serde::{Deserialize, Serialize};

/// Named color themes. Colors are raw ANSI SGR sequences.
#[derive(Clone, Debug)]
pub struct Theme {
    pub name: &'static str,
    pub accent: &'static str,
    pub prompt: &'static str,
    pub dim: &'static str,
    pub success: &'static str,
    pub warning: &'static str,
    pub error: &'static str,
    pub thinking: &'static str,
    pub reset: &'static str,
}

macro_rules! theme {
    ($name:literal, $($field:ident : $value:literal),* $(,)?) => {
        Theme { name: $name, reset: "\x1b[0m", $($field: $value,)* }
    };
}

#[derive(Deserialize)]
pub struct ThemeList {}

pub const THEMES: &[Theme] = &[
    theme!(
        "dupli",
        accent: "\x1b[1;38;5;99m",
        prompt: "\x1b[1;38;5;99m",
        dim: "\x1b[2;90m",
        success: "\x1b[32m",
        warning: "\x1b[33m",
        error: "\x1b[1;31m",
        thinking: "\x1b[2;36m",
    ),
    theme!(
        "nord",
        accent: "\x1b[1;38;5;110m",
        prompt: "\x1b[1;38;5;110m",
        dim: "\x1b[2;38;5;245m",
        success: "\x1b[38;5;72m",
        warning: "\x1b[38;5;179m",
        error: "\x1b[38;5;174m",
        thinking: "\x1b[2;38;5;139m",
    ),
    theme!(
        "dracula",
        accent: "\x1b[1;38;5;141m",
        prompt: "\x1b[1;38;5;213m",
        dim: "\x1b[2;38;5;245m",
        success: "\x1b[38;5;120m",
        warning: "\x1b[38;5;222m",
        error: "\x1b[38;5;210m",
        thinking: "\x1b[2;38;5;99m",
    ),
    theme!(
        "solarized",
        accent: "\x1b[1;38;5;37m",
        prompt: "\x1b[1;38;5;37m",
        dim: "\x1b[2;38;5;245m",
        success: "\x1b[38;5;71m",
        warning: "\x1b[38;5;136m",
        error: "\x1b[38;5;167m",
        thinking: "\x1b[2;38;5;61m",
    ),
    theme!(
        "everforest",
        accent: "\x1b[1;38;5;108m",
        prompt: "\x1b[1;38;5;108m",
        dim: "\x1b[2;38;5;245m",
        success: "\x1b[38;5;108m",
        warning: "\x1b[38;5;179m",
        error: "\x1b[38;5;167m",
        thinking: "\x1b[2;38;5;109m",
    ),
    theme!(
        "mono",
        accent: "\x1b[1m",
        prompt: "\x1b[1m",
        dim: "\x1b[2m",
        success: "\x1b[0m",
        warning: "\x1b[33m",
        error: "\x1b[1m",
        thinking: "\x1b[2m",
    ),
];

pub fn get(name: &str) -> &'static Theme {
    THEMES
        .iter()
        .find(|theme| theme.name == name)
        .unwrap_or(&THEMES[0])
}

pub fn names() -> Vec<&'static str> {
    THEMES.iter().map(|theme| theme.name).collect()
}

/// Serializable mirror used when saving the theme to a config file.
#[derive(Serialize)]
pub struct ThemeName<'a> {
    pub theme: &'a str,
}
