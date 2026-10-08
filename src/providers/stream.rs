use crate::config::Provider;
use crate::protocol::AgentResponse;
use crate::report::Reporter;
use anyhow::{Context, Result};
use futures_util::StreamExt;
use reqwest::Response;
use serde_json::Value;

pub struct StreamedResponse<'a, R: Reporter + ?Sized> {
    pub raw: String,
    reporter: &'a mut R,
    displayed_message: String,
    displayed_reasoning: bool,
}

impl<'a, R: Reporter> StreamedResponse<'a, R> {
    fn new(reporter: &'a mut R) -> Self {
        Self {
            raw: String::new(),
            reporter,
            displayed_message: String::new(),
            displayed_reasoning: false,
        }
    }

    fn push_message(&mut self, text: &str) -> Result<()> {
        self.raw.push_str(text);
        if let Some(message) = partial_message(&self.raw) {
            if message.starts_with(&self.displayed_message) {
                if !message.is_empty() && self.displayed_message.is_empty() {
                    if self.displayed_reasoning {
                        self.reporter.assistant_chunk("\n")?;
                        self.displayed_reasoning = false;
                    }
                }
                let new_text = &message[self.displayed_message.len()..];
                self.reporter.assistant_chunk(new_text)?;
                self.displayed_message = message;
            }
        }
        Ok(())
    }

    fn push_reasoning(&mut self, text: &str) -> Result<()> {
        if !text.is_empty() {
            if !self.displayed_reasoning {
                self.reporter.reasoning_chunk("Thinking: ")?;
                self.displayed_reasoning = true;
            }
            self.reporter.reasoning_chunk(text)?;
        }
        Ok(())
    }

    fn finish(&mut self) -> Result<()> {
        if self.displayed_reasoning {
            self.reporter.assistant_chunk("\n")?;
        }
        match serde_json::from_str::<AgentResponse>(&self.raw) {
            Ok(response) if !response.message.is_empty() => {
                if response.message.starts_with(&self.displayed_message) {
                    let rest = &response.message[self.displayed_message.len()..];
                    self.reporter.assistant_chunk(rest)?;
                } else if self.displayed_message.is_empty() {
                    self.reporter.assistant_chunk(&response.message)?;
                }
                self.reporter.assistant_chunk("\n")?;
            }
            Ok(_) => {}
            Err(_) if self.displayed_message.is_empty() => {
                self.reporter.assistant_chunk(&self.raw)?;
                self.reporter.assistant_chunk("\n")?;
            }
            Err(_) => self.reporter.assistant_chunk("\n")?,
        }
        Ok(())
    }
}

pub async fn stream_events<R: Reporter>(
    response: Response,
    provider: Provider,
    reporter: &mut R,
) -> Result<StreamedResponse<'_, R>> {
    let mut streamed = StreamedResponse::new(reporter);
    let mut chunks = response.bytes_stream();
    let mut pending = Vec::new();
    while let Some(chunk) = chunks.next().await {
        let chunk = chunk.context("Failed while reading streamed API response")?;
        pending.extend_from_slice(&chunk);
        while let Some(newline) = pending.iter().position(|byte| *byte == b'\n') {
            let mut line = pending.drain(..=newline).collect::<Vec<_>>();
            line.pop();
            if line.last() == Some(&b'\r') {
                line.pop();
            }
            let line = String::from_utf8(line).context("API stream contained invalid UTF-8")?;
            process_sse_line(&line, provider, &mut streamed)?;
        }
    }
    if !pending.is_empty() {
        if pending.last() == Some(&b'\r') {
            pending.pop();
        }
        let line = String::from_utf8(pending).context("API stream contained invalid UTF-8")?;
        process_sse_line(&line, provider, &mut streamed)?;
    }
    streamed.finish()?;
    Ok(streamed)
}

fn process_sse_line<R: Reporter>(
    line: &str,
    provider: Provider,
    streamed: &mut StreamedResponse<'_, R>,
) -> Result<()> {
    let Some(data) = line.strip_prefix("data:") else {
        return Ok(());
    };
    let data = data.trim();
    if data.is_empty() || data == "[DONE]" {
        return Ok(());
    }
    let event: Value = serde_json::from_str(data)
        .with_context(|| format!("API returned invalid streaming event JSON: {data}"))?;

    match provider {
        Provider::OpenAi | Provider::Fireworks => {
            let delta = event.pointer("/choices/0/delta");
            if let Some(text) = delta
                .and_then(|value| {
                    value
                        .get("reasoning_content")
                        .or_else(|| value.get("reasoning"))
                })
                .and_then(Value::as_str)
            {
                streamed.push_reasoning(text)?;
            }
            if let Some(text) = delta
                .and_then(|value| value.get("content"))
                .and_then(Value::as_str)
            {
                streamed.push_message(text)?;
            }
        }
        Provider::Anthropic => match event.pointer("/delta/type").and_then(Value::as_str) {
            Some("thinking_delta") => {
                if let Some(text) = event.pointer("/delta/thinking").and_then(Value::as_str) {
                    streamed.push_reasoning(text)?;
                }
            }
            Some("text_delta") => {
                if let Some(text) = event.pointer("/delta/text").and_then(Value::as_str) {
                    streamed.push_message(text)?;
                }
            }
            _ => {}
        },
        Provider::Gemini => {
            if let Some(parts) = event
                .pointer("/candidates/0/content/parts")
                .and_then(Value::as_array)
            {
                for part in parts {
                    if let Some(text) = part.get("text").and_then(Value::as_str) {
                        if part.get("thought").and_then(Value::as_bool) == Some(true) {
                            streamed.push_reasoning(text)?;
                        } else {
                            streamed.push_message(text)?;
                        }
                    }
                }
            }
        }
    }
    Ok(())
}

fn partial_message(raw: &str) -> Option<String> {
    let key = raw.find("\"message\"")?;
    let after_key = &raw[key + "\"message\"".len()..];
    let colon = after_key.find(':')?;
    let after_colon = after_key[colon + 1..].trim_start();
    let content = after_colon.strip_prefix('"')?;
    let mut escaped = false;
    let mut closing_quote = None;
    for (index, character) in content.char_indices() {
        if escaped {
            escaped = false;
        } else if character == '\\' {
            escaped = true;
        } else if character == '"' {
            closing_quote = Some(index);
            break;
        }
    }
    let candidate = match closing_quote {
        Some(end) => &content[..end],
        None if !escaped => content,
        None => return None,
    };
    serde_json::from_str::<String>(&format!("\"{candidate}\"")).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn partial_message_decodes_streamed_json_string_fragments() {
        assert_eq!(
            partial_message(r#"{"message":"hello\n wor"#).as_deref(),
            Some("hello\n wor")
        );
        assert!(partial_message(r#"{"message":"hello\"#).is_none());
    }
}
