mod ui;

use crate::agent::Agent;
use crate::report::{Reporter, WebReporter};
use anyhow::Result;
use axum::extract::State;
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::response::{Html, IntoResponse};
use axum::routing::{get, post};
use axum::{Json, Router};
use futures::StreamExt;
use futures::stream::Stream;
use serde::Deserialize;
use std::convert::Infallible;
use std::sync::Arc;
use tokio_stream::wrappers::UnboundedReceiverStream;

const STYLE_CSS: &str = include_str!("assets/style.css");
const CHAT_JS: &str = include_str!("assets/chat.js");

struct AppState {
    agent: tokio::sync::Mutex<Agent>,
}

/// Starts the Dupli web UI. The same agent core powers the TUI and web.
pub async fn serve(agent: Agent, port: u16) -> Result<()> {
    let state = Arc::new(AppState {
        agent: tokio::sync::Mutex::new(agent),
    });

    let app = Router::new()
        .route("/", get(index))
        .route("/assets/style.css", get(|| async { css_response() }))
        .route("/assets/chat.js", get(|| async { js_response() }))
        .route("/api/sessions", get(list_sessions))
        .route("/api/session/:id", get(get_session))
        .route("/api/chat", post(chat))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(("127.0.0.1", port)).await?;
    println!("Dupli web UI: http://127.0.0.1:{port}  (Ctrl+C to stop)");
    axum::serve(listener, app).await?;
    Ok(())
}

async fn index() -> Html<String> {
    let html = leptos::ssr::render_to_string(ui::shell);
    Html(format!("<!DOCTYPE html>\n{html}"))
}

fn css_response() -> impl IntoResponse {
    ([(axum::http::header::CONTENT_TYPE, "text/css; charset=utf-8")], STYLE_CSS)
}

fn js_response() -> impl IntoResponse {
    (
        [(axum::http::header::CONTENT_TYPE, "text/javascript; charset=utf-8")],
        CHAT_JS,
    )
}

#[derive(Deserialize)]
struct ChatRequest {
    message: String,
}

async fn chat(
    State(state): State<Arc<AppState>>,
    Json(request): Json<ChatRequest>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel::<String>();
    let state_for_task = state.clone();
    let message = request.message;
    tokio::spawn(async move {
        let mut agent = state_for_task.agent.lock().await;
        let mut reporter = WebReporter { tx };
        if let Err(error) = agent.run_prompt(message, &mut reporter).await {
            reporter.status(&format!("Error: {error:#}"));
        }
    });

    let stream = UnboundedReceiverStream::new(rx).map(|item| {
        Ok::<_, Infallible>(Event::default().data(item))
    });
    Sse::new(stream).keep_alive(KeepAlive::default())
}

async fn list_sessions() -> Json<serde_json::Value> {
    let sessions = crate::session::Session::list()
        .into_iter()
        .map(|(id, title, created)| {
            serde_json::json!({"id": id, "title": title, "created": created})
        })
        .collect::<Vec<_>>();
    Json(serde_json::json!(sessions))
}

async fn get_session(
    axum::extract::Path(id): axum::extract::Path<String>,
) -> impl IntoResponse {
    match crate::session::Session::load(&id) {
        Ok(session) => Json(serde_json::json!(session)).into_response(),
        Err(error) => (
            axum::http::StatusCode::NOT_FOUND,
            format!("{error:#}"),
        )
            .into_response(),
    }
}
