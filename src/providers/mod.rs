mod stream;

use crate::config::Provider;
use crate::report::Reporter;
use crate::protocol::{system_prompt, ChatMessage};
use anyhow::{bail, Context, Result};
use reqwest::{Client, Response};
use serde_json::json;
use std::path::Path;
use stream::{stream_events, StreamedResponse};

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
            let mut messages = vec![json!({"role": "system", "content": system})];
            messages.extend(
                history
                    .iter()
                    .map(|item| json!({"role": item.role, "content": item.content})),
            );
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
                    "messages": history,
                    "stream": true
                }))
                .send()
                .await
                .context("Failed to contact the Anthropic API")?;
            check_stream_response(response).await?
        }
        Provider::Gemini => {
            let contents = history
                .iter()
                .map(|item| {
                    json!({
                        "role": if item.role == "assistant" { "model" } else { "user" },
                        "parts": [{"text": item.content}]
                    })
                })
                .collect::<Vec<_>>();
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
                    "contents": contents,
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
