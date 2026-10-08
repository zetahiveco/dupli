mod stream;

use crate::config::Provider;
use crate::protocol::{system_prompt, ChatMessage};
use crate::report::Reporter;
use anyhow::{bail, Context, Result};
use reqwest::{Client, Response};
use serde_json::json;
use std::path::Path;
use stream::{stream_events, StreamedResponse};

/// OpenAI-style message list. `allow_images` is false for Fireworks,
/// which does not accept vision content.
fn openai_messages(system: &str, history: &[ChatMessage], allow_images: bool) -> Vec<serde_json::Value> {
    let mut messages = vec![json!({"role": "system", "content": system})];
    for item in history {
        if allow_images && !item.images.is_empty() {
            let mut parts = vec![json!({"type": "text", "text": item.content})];
            for image in &item.images {
                parts.push(json!({
                    "type": "image_url",
                    "image_url": {"url": format!("data:{};base64,{}", image.media_type, image.data)}
                }));
            }
            messages.push(json!({"role": item.role, "content": parts}));
        } else {
            messages.push(json!({"role": item.role, "content": item.content}));
        }
    }
    messages
}

/// Anthropic-style message list with base64 image blocks.
fn anthropic_messages(history: &[ChatMessage]) -> Vec<serde_json::Value> {
    history
        .iter()
        .map(|item| {
            if item.images.is_empty() {
                json!({"role": item.role, "content": item.content})
            } else {
                let mut parts = vec![json!({"type": "text", "text": item.content})];
                for image in &item.images {
                    parts.push(json!({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": image.media_type,
                            "data": image.data
                        }
                    }));
                }
                json!({"role": item.role, "content": parts})
            }
        })
        .collect()
}

/// Gemini-style contents list with inline_data parts.
fn gemini_contents(history: &[ChatMessage]) -> Vec<serde_json::Value> {
    history
        .iter()
        .map(|item| {
            let mut parts = vec![json!({"text": item.content})];
            for image in &item.images {
                parts.push(json!({
                    "inline_data": {"mime_type": image.media_type, "data": image.data}
                }));
            }
            json!({
                "role": if item.role == "assistant" { "model" } else { "user" },
                "parts": parts
            })
        })
        .collect()
}

pub async fn complete<'a, R: Reporter>(
    client: &Client,
    provider: Provider,
    model: &str,
    root: &Path,
    history: &[ChatMessage],
    skills_summary: &str,
    mcp_tools: &str,
    sandbox: bool,
    reporter: &'a mut R,
) -> Result<StreamedResponse<'a, R>> {
    let api_key = std::env::var(provider.key_env())
        .with_context(|| format!("Set {} for the {} provider", provider.key_env(), provider.name()))?;
    let system = system_prompt(root, skills_summary, mcp_tools, sandbox);
    let response = match provider {
        Provider::OpenAi | Provider::Fireworks => {
            let endpoint = if matches!(provider, Provider::Fireworks) {
                "https://api.fireworks.ai/inference/v1/chat/completions"
            } else {
                "https://api.openai.com/v1/chat/completions"
            };
            let allow_images = matches!(provider, Provider::OpenAi);
            let messages = openai_messages(&system, history, allow_images);
            let mut request_body = json!({
                "model": model,
                "messages": messages,
                "temperature": 0.2,
                "stream": true
            });
            if matches!(provider, Provider::Fireworks) {
                request_body["include_reasoning"] = json!(true);
            }
            let response = client
                .post(endpoint)
                .bearer_auth(&api_key)
                .json(&request_body)
                .send()
                .await
                .context("Failed to contact the chat API")?;
            check_stream_response(response).await?
        }
        Provider::Anthropic => {
            let response = client
                .post("https://api.anthropic.com/v1/messages")
                .header("x-api-key", &api_key)
                .header("anthropic-version", "2023-06-01")
                .json(&json!({
                    "model": model,
                    "max_tokens": 4096,
                    "system": system,
                    "messages": anthropic_messages(history),
                    "stream": true
                }))
                .send()
                .await
                .context("Failed to contact the Anthropic API")?;
            check_stream_response(response).await?
        }
        Provider::Gemini => {
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent",
                model
            );
            let response = client
                .post(url)
                .query(&[("alt", "sse")])
                .header("x-goog-api-key", &api_key)
                .json(&json!({
                    "systemInstruction": {"parts": [{"text": system}]},
                    "contents": gemini_contents(history),
                    "generationConfig": {"temperature": 0.2}
                }))
                .send()
                .await
                .context("Failed to contact the Gemini API")?;
            check_stream_response(response).await?
        }
    };

    stream_events(response, provider, reporter).await
}

async fn check_stream_response(response: Response) -> Result<Response> {
    let status = response.status();
    if !status.is_success() {
        let text = response
            .text()
            .await
            .context("Failed to read API error response")?;
        bail!("API returned HTTP {status}: {text}");
    }
    Ok(response)
}
