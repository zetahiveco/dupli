//! Dupli web UI — a leptos (CSR) application compiled to WebAssembly.
//!
//! Everything the user sees and does in the web UI happens here, in Rust:
//! rendering, the streaming chat client, and the session browser. The axum
//! server only serves these compiled assets and the JSON/SSE API.

mod chat;

use chat::{load_session, refresh_sessions, stream_chat};
use leptos::*;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

/// One bubble in the transcript.
#[derive(Clone)]
pub(crate) struct Msg {
    pub role: String,
    pub text: String,
}

impl Msg {
    fn who(&self) -> &'static str {
        match self.role.as_str() {
            "user" => "you",
            "assistant" => "dupli",
            "status" => "action",
            "thinking" => "thinking",
            _ => "",
        }
    }
}

#[wasm_bindgen(start)]
pub fn run() {
    console_error_panic_hook::set_once();
    leptos::mount_to_body(App);
}

#[component]
fn MessageBubble(message: Msg) -> impl IntoView {
    let class = format!("msg {}", message.role);
    let who = message.who();
    let body = message.text;
    view! {
        <div class={class}>
            <div class="who">{who}</div>
            <div class="body">{body}</div>
        </div>
    }
}

#[component]
fn App() -> impl IntoView {
    let messages = create_rw_signal(Vec::<Msg>::new());
    let input = create_rw_signal(String::new());
    let busy = create_rw_signal(false);
    let sessions = create_rw_signal(Vec::<(String, String)>::new());

    // Load the session list on mount.
    spawn_local({
        let sessions = sessions.clone();
        async move {
            refresh_sessions(&sessions).await;
        }
    });

    // Keep the transcript scrolled to the newest message.
    create_effect(move |_| {
        messages.with(|_| ());
        if let Some(element) = document().get_element_by_id("transcript") {
            if let Ok(pane) = element.dyn_into::<web_sys::HtmlElement>() {
                pane.set_scroll_top(pane.scroll_height());
            }
        }
    });

    let submit = move |event: ev::SubmitEvent| {
        event.prevent_default();
        if busy.get() {
            return;
        }
        let text = input.get().trim().to_owned();
        if text.is_empty() {
            return;
        }
        input.set(String::new());
        messages.update(|history| {
            history.push(Msg { role: "user".to_owned(), text: text.clone() });
            history.push(Msg { role: "assistant".to_owned(), text: String::new() });
        });
        busy.set(true);

        spawn_local(async move {
            // Index of the bubble currently receiving streamed text; a
            // status event closes it so the next text opens a new bubble.
            let mut assistant_index: Option<usize> = None;
            let result = stream_chat(&text, |event| {
                messages.update(|history| match event.kind.as_str() {
                    "text" | "thinking" => match assistant_index {
                        Some(index) => {
                            if let Some(message) = history.get_mut(index) {
                                message.text.push_str(&event.data);
                            }
                        }
                        None => {
                            history
                                .push(Msg { role: "assistant".to_owned(), text: event.data });
                            assistant_index = Some(history.len() - 1);
                        }
                    },
                    "status" => {
                        history.push(Msg { role: "status".to_owned(), text: event.data });
                        assistant_index = None;
                    }
                    _ => {}
                });
            })
            .await;
            if let Err(error) = result {
                messages.update(|history| {
                    history.push(Msg {
                        role: "status".to_owned(),
                        text: format!("Error: {error:?}"),
                    })
                });
            }
            busy.set(false);
            refresh_sessions(&sessions).await;
        });
    };

    let open_session = move |id: String| {
        spawn_local(async move {
            load_session(&id, &messages).await;
        });
    };

    view! {
        <div class="web-app">
            <aside class="sidebar">
                <div class="brand">
                    <span class="brand-mark">{"dupli"}</span>
                    <span class="brand-sub">{"web ui"}</span>
                </div>
                <nav class="session-list">
                    {move || {
                        if sessions.get().is_empty() {
                            view! { <p class="muted">{"No sessions yet."}</p> }.into_view()
                        } else {
                            sessions
                                .get()
                                .into_iter()
                                .map(|(id, title)| {
                                    let open = open_session.clone();
                                    view! {
                                        <a href="#" on:click=move |event| {
                                            event.prevent_default();
                                            open(id.clone());
                                        }>{title}</a>
                                    }
                                })
                                .collect::<Vec<_>>()
                                .into_view()
                        }
                    }}
                </nav>
                <div class="sidebar-foot">
                    <span class="pill">{move || {
                        if busy.get() { "working…" } else { "ready" }
                    }}</span>
                </div>
            </aside>
            <main class="chat">
                <section id="transcript" class="transcript">
                    {move || {
                        let history = messages.get();
                        if history.is_empty() {
                            view! {
                                <div class="empty">
                                    <h1>{"Dupli"}</h1>
                                    <p>{"A minimal Rust coding agent. Send a prompt to start."}</p>
                                </div>
                            }
                                .into_view()
                        } else {
                            history
                                .into_iter()
                                .map(|message| view! { <MessageBubble message /> })
                                .collect::<Vec<_>>()
                                .into_view()
                        }
                    }}
                </section>
                <form class="composer" on:submit=submit>
                    <input
                        id="chat-input"
                        type="text"
                        placeholder="Ask Dupli to build something…"
                        autocomplete="off"
                        bind:value=input
                    />
                    <button type="submit" disabled=move || busy.get()>{"Send"}</button>
                </form>
            </main>
        </div>
    }
}

// The native binary target is never built from this crate; the app starts
// through `#[wasm_bindgen(start)]` once the wasm module loads in the browser.
