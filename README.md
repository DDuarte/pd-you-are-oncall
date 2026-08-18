# pd-you-are-oncall

A small Cloudflare Worker that watches one or more PagerDuty schedules and posts to Slack
whenever a new person's on-call shift starts.

Every 5 minutes (via a Cron Trigger) it asks PagerDuty who's currently primary on-call for
each configured schedule, compares that to the last-known person (stored in Workers KV), and
posts a short Slack message to that schedule's channel only when the on-call person changes.

## How it works

- `SLACK_WEBHOOK_URLS` (secret) — a JSON object mapping each PagerDuty schedule ID to
  `{ "webhookUrl": "...", "channel": "..." }`. Its keys are also what determines which
  schedules get watched — there's no separate schedule list to maintain. `channel` is optional
  and overrides which channel the message posts to (see the note in step 4).
- `PAGERDUTY_API_KEY` (secret) — a PagerDuty REST API token used to read `/oncalls`. Each
  schedule's display name is fetched from PagerDuty at check time, not configured by hand.
- `ONCALL_STATE` (KV namespace) — stores the last-known on-call user per schedule so we only
  notify on a change, not on every poll.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the KV namespace

```bash
npx wrangler kv namespace create ONCALL_STATE
```

Copy the returned `id` into `wrangler.jsonc` under `kv_namespaces`, replacing
`<KV_NAMESPACE_ID>`.

### 3. Find your PagerDuty schedule IDs

Each schedule ID is visible in its PagerDuty URL, e.g. `.../schedules/PXXXXXXX`.

### 4. Create a Slack Incoming Webhook per channel

For each schedule, add an [Incoming Webhook](https://api.slack.com/messaging/webhooks) to the
Slack channel you want it to post in, and note the webhook URL.

You can optionally also set a `channel` for a schedule (e.g. `"#backend-oncall"` or a channel
ID) to redirect where that message posts. Note that Slack only honors this override for
"classic" Incoming Webhooks not bound to a single channel — most webhooks created today are
tied to one channel at creation time and will ignore it, posting to that channel regardless.

### 5. Set secrets

```bash
npx wrangler secret put PAGERDUTY_API_KEY
npx wrangler secret put SLACK_WEBHOOK_URLS
# JSON: {"PXXXXXXX": {"webhookUrl": "https://hooks.slack.com/...", "channel": "#backend-oncall"}, ...}
```

For local development, copy `.dev.vars.example` to `.dev.vars` and fill in the same values —
`.dev.vars` is gitignored.

### 6. Run locally

```bash
npm run dev
```

Trigger a check manually:

```bash
curl http://localhost:8787/__scheduled
```

### 7. Deploy

```bash
npm run deploy
```

## Notes

- Only the primary (lowest escalation level) on-call is tracked per schedule — this is meant to
  answer "who is on call right now", not track every escalation tier.
- Adding or removing a schedule is just updating the `SLACK_WEBHOOK_URLS` secret
  (`npx wrangler secret put SLACK_WEBHOOK_URLS`) — no code change or wrangler.jsonc edit needed.
