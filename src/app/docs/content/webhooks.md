# Webhooks

Automations can start a workspace from an HTTP POST. Use this when GitHub, Linear, n8n, or your own service should assign work to a harness.

There are two inbound paths:

1. **Automation webhook** — `POST /api/v1/automations/:id` with the automation secret
2. **API run** — `POST /api/v1/automations/run` with the organization API key

GitHub, GitLab, Bitbucket, Linear, and Sentry triggers also fire automations when that integration is connected in the console. Those events do not use a public webhook URL; connect the integration first.

Slack is not an automation trigger. Connect Slack in Integrations, then type `/dupli` in a channel. A menu appears for **Workspace** (create, choose, chat) and **Actions** (create, edit, delete automations). Chat in the selected workspace with `/workspace-chat your task`.

---

## Automation webhook

Create an automation with trigger `VIA_WEBHOOK`. The console and [`GET /api/v1/automations`](/docs/api#get-api-v1-automations) return:

```
$APP_URL/api/v1/automations/:id?secret=<webhookSecret>
```

You can also send the secret as `x-webhook-secret` or `Authorization: Bearer <secret>`. The organization API key is accepted as well.

The JSON body is appended to the automation prompt as `Incoming event`.

```bash
curl -s -X POST "$APP_URL/api/v1/automations/$AUTOMATION_ID?secret=$WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Checkout 500s on /pay",
    "url": "https://linear.app/acme/issue/ENG-204"
  }'
```

---

## API run

`VIA_API` automations (and any automation you want to fire yourself) can be run with the organization key:

```bash
curl -s -X POST "$APP_URL/api/v1/automations/run" \
  -H "Authorization: Bearer $DUPLI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "automationId": "automation-id",
    "payload": { "title": "Checkout 500s on /pay" }
  }'
```

---

## Payload

`POST` with `Content-Type: application/json`. Any JSON object is accepted. It is stringified and appended to the prompt:

```
<your automation prompt>

Incoming event:
{
  "title": "Checkout 500s on /pay",
  "url": "https://linear.app/acme/issue/ENG-204"
}
```

The response includes `automationId` and `workspaceId` of the run.

```json
{
  "automationId": "automation-id",
  "workspaceId": "workspace-id",
  "needsApiKey": false
}
```

---

## Delivery

- Return **2xx** from your own endpoints if Dupli is calling you. Dupli records outbound delivery attempts in the webhook log when an organization URL is configured in Settings.
- For inbound automation webhooks, Dupli is the receiver. Send the event and wait for the JSON response above.
- Keep the webhook secret unguessable. Rotate it by recreating the automation if it leaks.
- Integration triggers require a connected GitHub, GitLab, Bitbucket, Linear, or Sentry account. Creating the automation returns `409` until that connection exists.
