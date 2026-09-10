# REST API

Authenticate every request with your organization API key.

```
Authorization: Bearer <api_key>
```

You can also send `x-api-key: <api_key>`. Create or copy a key from [Settings](/console/settings). The key bar on this page loads a stored key when you are signed in.

Base URL: `$APP_URL/api/v1`

Workspace machines always use the organization harness API key stored in Settings. Machine running time is billed in minutes from the signed-in user's 5,000-minute monthly allowance. A `402` is returned when that user is out of minutes. A `409` is returned when a harness API key is required, or when an automation trigger needs a connected integration.

Harness values: `CLAUDE_CODEX`, `OPENAI_CODEX`, `GEMINI_CLI`, `DEEPSEEK_HARNESS`, `FX`, `KIMI_CODE`, `OPENCODE`, `MUSE_CODE`, `PI`.

---

## GET /api/v1/workspaces

List workspaces for the authenticated organization. Each item includes `id`, `name`, `harness`, `running`, `messages`, `createdAt`, and `updatedAt`.

```bash
curl -s "$APP_URL/api/v1/workspaces" \
  -H "Authorization: Bearer $DUPLI_API_KEY"
```

---

## POST /api/v1/workspaces

Create a workspace.

```json
{
  "name": "Checkout refactor",
  "harness": "OPENAI_CODEX"
}
```

`harness` is required. The workspace uses the organization API key for that harness.

```bash
curl -s -X POST "$APP_URL/api/v1/workspaces" \
  -H "Authorization: Bearer $DUPLI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Checkout refactor","harness":"OPENAI_CODEX"}'
```

---

## GET /api/v1/workspaces/:id

Return a workspace and its messages, including persisted agent diffs on assistant messages.

```bash
curl -s "$APP_URL/api/v1/workspaces/$WORKSPACE_ID" \
  -H "Authorization: Bearer $DUPLI_API_KEY"
```

---

## PATCH /api/v1/workspaces/:id

Rename a workspace.

```json
{ "name": "Checkout v2" }
```

```bash
curl -s -X PATCH "$APP_URL/api/v1/workspaces/$WORKSPACE_ID" \
  -H "Authorization: Bearer $DUPLI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Checkout v2"}'
```

---

## DELETE /api/v1/workspaces/:id

Delete a workspace and its remote machine.

```bash
curl -s -X DELETE "$APP_URL/api/v1/workspaces/$WORKSPACE_ID" \
  -H "Authorization: Bearer $DUPLI_API_KEY"
```

---

## POST /api/v1/workspaces/:id/files

Upload files into the workspace filesystem. Send multipart `file` (or `files`). Optional `path` is a directory, such as `src`. Files land at the workspace root when `path` is omitted.

```bash
curl -s -X POST "$APP_URL/api/v1/workspaces/$WORKSPACE_ID/files" \
  -H "Authorization: Bearer $DUPLI_API_KEY" \
  -F "file=@./spec.pdf"
```

```bash
curl -s -X POST "$APP_URL/api/v1/workspaces/$WORKSPACE_ID/files" \
  -H "Authorization: Bearer $DUPLI_API_KEY" \
  -F "path=src" \
  -F "file=@./app.ts"
```

---

## GET /api/v1/workspaces/:id/chat

Return the message history for a workspace.

```bash
curl -s "$APP_URL/api/v1/workspaces/$WORKSPACE_ID/chat" \
  -H "Authorization: Bearer $DUPLI_API_KEY"
```

---

## POST /api/v1/workspaces/:id/chat

Send a chat message to the workspace harness. Optional `model` selects the model for that turn (for example `sonnet`, `opus`, `gpt-5.1`). Multipart `file` values are written into the workspace filesystem before the harness runs. Prefer `POST /workspaces/:id/files` to add files without sending a message.

```json
{
  "content": "Review spec.pdf in the workspace and implement it.",
  "model": "gpt-5.1"
}
```

```bash
curl -s -X POST "$APP_URL/api/v1/workspaces/$WORKSPACE_ID/chat" \
  -H "Authorization: Bearer $DUPLI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content":"Add a health check route","model":"sonnet"}'
```

```bash
curl -s -X POST "$APP_URL/api/v1/workspaces/$WORKSPACE_ID/chat" \
  -H "Authorization: Bearer $DUPLI_API_KEY" \
  -F "content=Implement spec.pdf in the workspace" \
  -F "model=sonnet" \
  -F "file=@./spec.pdf"
```

---

## GET /api/v1/automations

List automations. Each item includes webhook URL and secret for `VIA_WEBHOOK` triggers.

```bash
curl -s "$APP_URL/api/v1/automations" \
  -H "Authorization: Bearer $DUPLI_API_KEY"
```

---

## POST /api/v1/automations

Create an automation. Integration triggers (`VIA_GITHUB`, `VIA_GITLAB`, `VIA_BITBUCKET`, `VIA_LINEAR`, `VIA_SENTRY`) require that integration to be connected in the console first. Slack is not an automation trigger — type `/dupli` in Slack instead.

```json
{
  "name": "Nightly tests",
  "prompt": "Run the test suite and summarize failures.",
  "trigger": "VIA_CRON",
  "cron": "0 9 * * 1",
  "workspaceAction": "USE_EXISTING",
  "workspaceId": "workspace-id"
}
```

`trigger` values: `VIA_WEBHOOK`, `VIA_CRON`, `VIA_API`, `VIA_GITHUB`, `VIA_GITLAB`, `VIA_BITBUCKET`, `VIA_LINEAR`, `VIA_SENTRY`.

`workspaceAction` is `USE_EXISTING` or `CREATE_NEW`. For `CREATE_NEW`, pass `newWorkspaceConfig`:

```json
{
  "name": "Nightly workspace",
  "harness": "CLAUDE_CODEX"
}
```

```bash
curl -s -X POST "$APP_URL/api/v1/automations" \
  -H "Authorization: Bearer $DUPLI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Nightly tests","prompt":"Run tests","trigger":"VIA_CRON","cron":"0 9 * * 1","workspaceAction":"USE_EXISTING","workspaceId":"workspace-id"}'
```

---

## GET /api/v1/automations/:id

Return one automation.

```bash
curl -s "$APP_URL/api/v1/automations/$AUTOMATION_ID" \
  -H "Authorization: Bearer $DUPLI_API_KEY"
```

---

## PATCH /api/v1/automations/:id

Update `name`, `prompt`, `trigger`, `workspaceAction`, `workspaceId`, `cron`, or `isRunning`. Changing an integration trigger still requires that integration to be connected.

```bash
curl -s -X PATCH "$APP_URL/api/v1/automations/$AUTOMATION_ID" \
  -H "Authorization: Bearer $DUPLI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"isRunning":true}'
```

---

## DELETE /api/v1/automations/:id

Delete an automation.

```bash
curl -s -X DELETE "$APP_URL/api/v1/automations/$AUTOMATION_ID" \
  -H "Authorization: Bearer $DUPLI_API_KEY"
```

---

## POST /api/v1/automations/run

Run an automation by id with the organization API key. Optional `payload` is appended to the prompt.

```json
{ "automationId": "automation-id", "payload": { "issue": "123" } }
```

```bash
curl -s -X POST "$APP_URL/api/v1/automations/run" \
  -H "Authorization: Bearer $DUPLI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"automationId":"automation-id","payload":{"issue":"123"}}'
```

---

## POST /api/v1/automations/:id

Webhook trigger for that automation. Authenticate with `?secret=`, `x-webhook-secret`, or `Authorization: Bearer` using the automation secret or organization API key. The JSON body is passed into the prompt.

```bash
curl -s -X POST "$APP_URL/api/v1/automations/$AUTOMATION_ID?secret=$WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"title":"Fix checkout timeout"}'
```

---

## Errors

| Status | Meaning |
| --- | --- |
| `401` | Missing or invalid API key |
| `400` | Invalid payload |
| `402` | Insufficient machine-minutes |
| `404` | Workspace or automation not found |
| `409` | Harness API key required, or integration not connected |
