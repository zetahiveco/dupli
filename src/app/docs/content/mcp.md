# Agents and MCP

Point Claude, Cursor, or any tool that can call HTTP at the [REST API](/docs/api). Organization API keys authenticate those calls. Generate a key in [Settings](/console/settings).

```
Authorization: Bearer <api_key>
```

Base URL: `$APP_URL/api/v1`

Dupli does not ship an MCP tool server. Use REST to create workspaces, upload files onto the machine, send chat, and run automations.

---

## From Cursor or Claude

Add a custom tool or skill that calls Dupli. A typical flow:

1. `POST /workspaces` with a harness
2. `POST /workspaces/:id/files` to put files on the machine
3. `POST /workspaces/:id/chat` with the task
4. `GET /workspaces/:id` to read messages, diffs, and status

```bash
curl -s -X POST "$APP_URL/api/v1/workspaces/$WORKSPACE_ID/chat" \
  -H "Authorization: Bearer $DUPLI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content":"Add a health check route and open a PR","model":"sonnet"}'
```

Multipart chat writes files onto the machine first:

```bash
curl -s -X POST "$APP_URL/api/v1/workspaces/$WORKSPACE_ID/chat" \
  -H "Authorization: Bearer $DUPLI_API_KEY" \
  -F "content=Implement spec.pdf in the workspace" \
  -F "file=@./spec.pdf"
```

---

## Automations from your stack

Connect GitHub, GitLab, Bitbucket, Linear, or Sentry in Integrations, then create an automation with that trigger. Slack is different: type `/dupli` in a connected workspace to create or choose a workspace, chat with `/workspace-chat`, and manage automations. For generic HTTP, use [`POST /api/v1/automations/:id`](/docs/webhooks#automation-webhook) with the webhook secret.

See the [REST API](/docs/api) for the full route list and the [webhooks](/docs/webhooks) guide for inbound events.
