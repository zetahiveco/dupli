//! Streaming chat client and session loading, all in Rust via `web_sys`.

use crate::Msg;
use leptos::*;
use serde::Deserialize;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::JsFuture;

/// One event parsed from the server's SSE stream.
pub struct StreamEvent {
    pub kind: String,
    pub data: String,
}

#[derive(Deserialize)]
struct SessionSummary {
    id: String,
    #[serde(default)]
    title: String,
}

#[derive(Deserialize)]
struct SessionMessages {
    #[serde(default)]
    messages: Vec<StoredMessage>,
}

#[derive(Deserialize)]
struct StoredMessage {
    role: String,
    content: String,
}

async fn fetch_json(url: &str) -> Result<serde_json::Value, JsValue> {
    let response = JsFuture::from(window().fetch_with_str(url)).await?;
    let response: web_sys::Response = response.dyn_into()?;
    if !response.ok() {
        return Err(JsValue::from_str(&format!("HTTP {}", response.status())));
    }
    let text = JsFuture::from(response.text()?).await?;
    let text = text.as_string().unwrap_or_default();
    serde_json::from_str(&text).map_err(|error| JsValue::from_str(&error.to_string()))
}

/// Load the session list shown in the sidebar.
pub async fn refresh_sessions(sessions: &RwSignal<Vec<(String, String)>>) {
    let list = match fetch_json("/api/sessions").await {
        Ok(list) => list,
        Err(_) => {
            sessions.set(Vec::new());
            return;
        }
    };
    let parsed: Vec<SessionSummary> = serde_json::from_value(list).unwrap_or_default();
    sessions.set(
        parsed
            .into_iter()
            .map(|session| {
                let title = if session.title.is_empty() {
                    session.id.clone()
                } else {
                    session.title
                };
                (session.id, title)
            })
            .collect(),
    );
}

/// Replace the transcript with a stored session. Assistant messages are
/// stored as raw provider JSON, so unwrap the `message` field when present.
pub async fn load_session(id: &str, messages: &RwSignal<Vec<Msg>>) {
    match fetch_json(&format!("/api/session/{}", id)).await {
        Ok(value) => {
            let session: SessionMessages =
                serde_json::from_value(value).unwrap_or(SessionMessages { messages: vec![] });
            let transcript = session
                .messages
                .into_iter()
                .filter_map(|message| {
                    if message.role == "user" {
                        if message.content.starts_with("Action results:") {
                            return None;
                        }
                        Some(Msg { role: message.role, text: message.content })
                    } else if message.role == "assistant" {
                        let text = serde_json::from_str::<serde_json::Value>(&message.content)
                            .ok()
                            .and_then(|value| {
                                value.get("message").and_then(|text| text.as_str()).map(str::to_owned)
                            })
                            .unwrap_or(message.content);
                        Some(Msg { role: "assistant".to_owned(), text })
                    } else {
                        None
                    }
                })
                .collect();
            messages.set(transcript);
        }
        Err(error) => messages.update(|history| {
            history.push(Msg {
                role: "status".to_owned(),
                text: format!("Failed to load session: {error:?}"),
            })
        }),
    }
}

/// POST the prompt to `/api/chat` and pump the SSE stream, calling `on_event`
/// for every parsed event. Runs entirely through `web_sys::fetch`.
pub async fn stream_chat(
    message: &str,
    mut on_event: impl FnMut(StreamEvent),
) -> Result<(), JsValue> {
    let body = serde_json::to_string(&serde_json::json!({ "message": message }))
        .map_err(|error| JsValue::from_str(&error.to_string()))?;

    let init = web_sys::RequestInit::new();
    init.set_method("POST");
    init.set_body(&JsValue::from_str(&body));

    let request = web_sys::Request::new_with_str_and_init("/api/chat", &init)?;
    request.headers().set("Content-Type", "application/json")?;

    let response = JsFuture::from(window().fetch_with_request(&request)).await?;
    let response: web_sys::Response = response.dyn_into()?;
    if !response.ok() {
        return Err(JsValue::from_str(&format!("HTTP {}", response.status())));
    }

    let body = response.body().ok_or_else(|| JsValue::from_str("no body"))?;
    let reader: web_sys::ReadableStreamDefaultReader = body.get_reader().dyn_into()?;

    // Bytes pulled from the stream, split into complete SSE frames.
    let mut buffer: Vec<u8> = Vec::new();
    loop {
        let chunk = JsFuture::from(reader.read()).await?;
        let done = js_sys::Reflect::get(&chunk, &JsValue::from_str("done"))?
            .as_bool()
            .unwrap_or(true);
        if done {
            break;
        }
        let value = js_sys::Reflect::get(&chunk, &JsValue::from_str("value"))?;
        let value = js_sys::Uint8Array::from(value);
        buffer.extend_from_slice(&value.to_vec());

        while let Some(position) = find_frame_end(&buffer) {
            let frame: Vec<u8> = buffer.drain(..position).collect();
            for event in parse_frame(&frame) {
                on_event(event);
            }
        }
    }

    Ok(())
}

/// Find the offset just past an SSE frame terminator (`\n\n`).
fn find_frame_end(buffer: &[u8]) -> Option<usize> {
    buffer
        .windows(2)
        .position(|pair| pair == b"\n\n")
        .map(|position| position + 2)
}

/// Turn one SSE frame's `data:` lines into parsed events.
fn parse_frame(frame: &[u8]) -> Vec<StreamEvent> {
    let text = String::from_utf8_lossy(frame);
    let mut events = Vec::new();
    for line in text.lines() {
        let Some(payload) = line.strip_prefix("data:") else {
            continue;
        };
        let payload = payload.trim();
        if payload.is_empty() {
            continue;
        }
        if let Ok(event) = serde_json::from_str::<StreamEvent>(payload) {
            events.push(event);
        }
    }
    events
}

// `StreamEvent` doubles as the serde payload for SSE `data:` lines.
impl<'de> Deserialize<'de> for StreamEvent {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        #[derive(Deserialize)]
        struct Raw {
            #[serde(rename = "type", alias = "kind")]
            kind: String,
            #[serde(default)]
            data: String,
        }
        let raw = Raw::deserialize(deserializer)?;
        Ok(StreamEvent { kind: raw.kind, data: raw.data })
    }
}
