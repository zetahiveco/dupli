// Dupli web UI client script. Streams agent output over SSE.
(function () {
  "use strict";

  const transcript = document.getElementById("transcript");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const button = form.querySelector("button");

  function addMessage(kind, who, text) {
    const wrap = document.createElement("div");
    wrap.className = "msg " + kind;
    const whoEl = document.createElement("div");
    whoEl.className = "who";
    whoEl.textContent = who;
    const body = document.createElement("div");
    body.className = "body";
    body.textContent = text;
    wrap.appendChild(whoEl);
    wrap.appendChild(body);
    transcript.appendChild(wrap);
    transcript.scrollTop = transcript.scrollHeight;
    return body;
  }

  async function loadSessions() {
    try {
      const response = await fetch("/api/sessions");
      const sessions = await response.json();
      const list = document.getElementById("session-list");
      list.innerHTML = "";
      if (!sessions.length) {
        list.innerHTML = '<p class="muted">No sessions yet.</p>';
        return;
      }
      for (const session of sessions) {
        const link = document.createElement("a");
        link.textContent = session.title || session.id;
        link.title = session.id;
        link.href = "#";
        link.addEventListener("click", function (event) {
          event.preventDefault();
          loadSession(session.id);
        });
        list.appendChild(link);
      }
    } catch (error) {
      // Non-fatal: the sidebar just stays empty.
    }
  }

  async function loadSession(id) {
    try {
      const response = await fetch("/api/session/" + encodeURIComponent(id));
      const session = await response.json();
      transcript.innerHTML = "";
      for (const message of session.messages || []) {
        if (message.role === "user") {
          if (message.content.indexOf("Action results:") === 0) continue;
          addMessage("user", "you", message.content);
        } else if (message.role === "assistant") {
          addMessage("assistant", "dupli", message.content);
        }
      }
      transcript.scrollTop = transcript.scrollHeight;
    } catch (error) {
      addMessage("status", "", "Failed to load session " + id);
    }
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    input.value = "";
    button.disabled = true;

    const empty = transcript.querySelector(".empty");
    if (empty) empty.remove();
    addMessage("user", "you", message);

    const assistantBody = addMessage("assistant", "dupli", "");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message }),
      });
      if (!response.ok || !response.body) {
        throw new Error("HTTP " + response.status);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) >= 0) {
          const rawEvent = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          for (const line of rawEvent.split("\n")) {
            if (line.indexOf("data:") !== 0) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            let event;
            try {
              event = JSON.parse(payload);
            } catch (error) {
              continue;
            }
            if (event.type === "text") {
              assistantBody.textContent += event.data;
            } else if (event.type === "thinking") {
              assistantBody.textContent += event.data;
            } else if (event.type === "status") {
              const statusBody = addMessage("status", "action", event.data);
              void statusBody;
            }
            transcript.scrollTop = transcript.scrollHeight;
          }
        }
      }
    } catch (error) {
      assistantBody.textContent += "\n[error: " + error.message + "]";
    } finally {
      button.disabled = false;
      input.focus();
      loadSessions();
    }
  });

  loadSessions();

  window.dupli = { loadSession: loadSession };
})();
