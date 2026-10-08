use leptos::*;

/// SSR shell for the Dupli web UI. Chat interactivity is provided by
/// `/assets/chat.js`, which talks to the axum JSON/SSE API.
pub fn shell() -> impl IntoView {
    view! {
        <html lang="en">
            <head>
                <meta charset="utf-8"/>
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
                <title>{"Dupli — Web"}</title>
                <link rel="stylesheet" href="/assets/style.css"/>
            </head>
            <body>
                <div class="web-app">
                    <aside class="sidebar">
                        <div class="brand">
                            <span class="brand-mark">{"dupli"}</span>
                            <span class="brand-sub">{"web ui"}</span>
                        </div>
                        <nav id="session-list" class="session-list">
                            <p class="muted">{"Sessions load here…"}</p>
                        </nav>
                        <div class="sidebar-foot">
                            <span class="pill" id="sandbox-pill">{"status"}</span>
                        </div>
                    </aside>
                    <main class="chat">
                        <section id="transcript" class="transcript">
                            <div class="empty">
                                <h1>{"Dupli"}</h1>
                                <p>{"A minimal Rust coding agent. Send a prompt to start."}</p>
                            </div>
                        </section>
                        <form id="chat-form" class="composer">
                            <input
                                id="chat-input"
                                type="text"
                                placeholder="Ask Dupli to build something…"
                                autocomplete="off"
                            />
                            <button type="submit">{"Send"}</button>
                        </form>
                    </main>
                </div>
                <script src="/assets/chat.js"></script>
            </body>
        </html>
    }
}
