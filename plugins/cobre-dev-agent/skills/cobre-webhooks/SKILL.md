---
name: cobre-webhooks
description: >-
  Guide developers through Cobre webhook subscriptions, event delivery, webhook
  handlers, webhook signatures, HMAC verification, event-timestamp,
  event-signature, duplicate webhook events, idempotent webhook consumers,
  webhook retries, and webhook reconciliation or polling fallback. Also use for
  webhook handler review, signature debugging, idempotency fixes, retry
  handling, and webhook code refactoring. Use when the user asks how to
  subscribe to Cobre events, verify webhook signatures, handle duplicates, or
  review, fix, or debug a Cobre webhook integration.
---

# Cobre webhooks

Client-facing guidance for designing, reviewing, debugging, and improving Cobre webhook integrations.

v0.1 may review and edit local application code and generate examples or tests.
Do not execute real webhook subscription API calls, ask the user to paste production secrets, or validate a signing key by calling Cobre.

Public lifecycle facts below come from Cobre's public Notifications & Subscriptions documentation.
For current event catalogs, schemas, subscription fields, event layouts, and other precise API details, consult the public **Cobre API Documentation** MCP. If this skill and the current public docs/MCP disagree, prefer the docs/MCP. If public sources conflict, say so. Do not invent undocumented behavior.

## Subscriptions

Create subscriptions with `POST /subscriptions`.

- **Required:** `url`, `events`
- **Optional:** `description`, `event_signature_key`
- `url` must be HTTPS and publicly reachable.
- `event_signature_key` is supplied by the client and must be 10–64 characters.
- The create response masks the signing key.

Do **not** hardcode a complete event catalog. Public sources differ. For current event keys and layouts, use the Docs MCP.

## Delivery

Cobre delivers events with **HTTP POST** and JSON.

- Return a **2xx** quickly to acknowledge receipt.
- A **4xx** is an intentional rejection and is **not** retried.
- Prefer acknowledging first, then processing asynchronously.
- Exact timeout duration and **5xx** behavior are not publicly documented. Do not invent them.

## Event envelope

Public examples use:

- `id`
- `event_key`
- `created_at`
- `content`

`content` varies by event. Do not hardcode full event-specific content schemas. Consult the Docs MCP / current event layout when needed.

## Idempotency and duplicates

- Webhook handlers must be idempotent.
- Duplicate or retried events may occur.
- Use event `id` as the deduplication / idempotency key.
- Do not claim a formal at-most-once or at-least-once SLA.
- Do not claim ordering guarantees.
- Do not invent a universal dedup-store TTL.
- Persistent or shared dedup storage is recommended for production, restarts, or multi-instance deployments. Do not imply a database or Redis is universally required for every architecture.

## Signature verification

When `event_signature_key` is configured, notifications include:

- `event-timestamp`
- `event-signature`

Public verification:

- Algorithm: HMAC-SHA256
- Input encoding: UTF-8
- Signing message: `event-timestamp + "." + webhook body`

**Raw-body rule:** verify using the request body **exactly as received** by the HTTP server.

- Do **not** parse and `JSON.stringify` / reformat the body before verification.
- Do **not** invent whitespace or minification normalization rules.
- Public docs show compact JSON examples and also say to use the raw body. Generated code must keep the original raw payload bytes/string for HMAC.

Do not claim a replay or timestamp tolerance. None is publicly documented.

Public docs show a 64-character HMAC digest example. Do not state an undocumented digest-encoding contract more strongly than that. If an implementation needs an exact encoding detail, consult the current public docs/MCP first.

## Retries

Public docs describe:

- 3 automatic retries
- connection errors only
- intervals: 200 ms, 400 ms, 1000 ms
- after that window the event is not queued for later redelivery
- 4xx is not retried

Do **not** infer 5xx behavior, timeout classification, TLS/DNS handling, or retry payload/signature byte identity.

## Reconciliation

Webhook delivery is **best-effort**. Do not use webhooks as the only source of truth for critical state.

If events may have been missed, reconcile by polling the relevant resource GET. Do not hardcode which GET applies to every event; consult the Docs MCP for the current resource/API.

## Security

- HTTPS only.
- Keep `event_signature_key` secret.
- If the signing key is compromised, delete the subscription and create a new one.
- Do not log or expose secrets.
- Do not invent IP allowlists, mTLS, replay windows, or other undocumented controls.

## Review and improve existing code

Support requests such as:

- Review my Cobre webhook handler
- Is my webhook signature verification correct?
- Why am I receiving duplicate events?
- Fix my webhook consumer
- Refactor this webhook handler
- How should I handle retries?
- My webhook signature does not match
- Can you make this webhook integration idempotent?

Inspect:

1. **Signature verification** — Raw body preserved before JSON parsing? Signing message `timestamp + "." + raw body`? HMAC-SHA256? Signing key handled securely? Code incorrectly re-stringifying parsed JSON before verify? Flag hardcoded digest encodings (`.digest("hex")`, `.digest("base64")`, `Buffer.from(..., "hex")`, or equivalents) as **needs verification**, not as automatically wrong and not as something to rewrite to another assumed encoding.
2. **Acknowledgment** — Returns 2xx quickly? Slow business logic before ack? Processing delay that could cause delivery failure/timeouts? Do not invent a specific status (400/401/403/500) for missing or invalid signature headers, or for incomplete verification, unless public Cobre docs specify it.
3. **Idempotency** — Event `id` used for dedup? Same event can cause side effects twice? Dedup mechanism fits the user's architecture? Persistent/shared storage is recommended for production, restarts, or multi-instance deployments, but do not imply DB/Redis is universally required. Do not invent a universal TTL.
4. **Retry assumptions** — Incorrect 5xx or guaranteed-delivery assumptions? Relies on webhooks instead of reconciliation?
5. **Async processing** — Ack separated from heavy work where appropriate? Preserve the user's framework; do not force a specific queue.
6. **Reconciliation** — Fallback for critical workflows if a webhook is missed? Use Docs MCP for the relevant resource GET.
7. **Payload assumptions** — Hardcoded event catalog or content schema that should be checked against current public docs?
8. **Security** — Hardcoded `event_signature_key` or other secrets? Never print or expose real signing keys. Do not ask for production secrets.

Review only: explain findings and suggested changes. It is allowed to point out that the user's existing code uses hex or 401.

### Fix / refactor

When the user asks to fix or rewrite webhook code, all code-generation guardrails are **mandatory**, not advisory.

- It is **not** allowed to preserve unverified hex/digest-encoding or 400/401/403 choices in rewritten code unless those choices were verified from current public docs/MCP.
- If exact digest representation is not verified: do **not** produce executable digest/comparison code. Generate a partial example only up to the verified HMAC input construction, or clearly mark the entire example as incomplete/non-deployable. Insert a clearly non-executable TODO/comment: `Confirm digest representation in current Cobre public docs/MCP before completing signature comparison.` Do not provide a guessed implementation after that TODO.
- Before producing a complete executable signature verifier, consult the public Docs MCP when exact digest representation is required. If still unverified, leave the verifier intentionally incomplete. Say explicitly: `This handler is intentionally incomplete and must not be deployed until digest representation is confirmed.`
- Do not generate a runnable endpoint that pretends to be deployable while signature verification is incomplete.
- When required public information is missing and executable verification cannot be completed, do **not** invent any HTTP response code, including 500. Do not choose 4xx or 5xx behavior for that missing-information state.
- Never add unreachable "rest of handler" code after an unconditional return inserted only because documentation is incomplete.
- Do not choose HTTP 400, 401, or 403 for invalid/missing signature headers unless current public Cobre docs explicitly specify that status. If a concrete example needs a rejection path, use a placeholder such as `// return an application-chosen rejection response here` and explain that 4xx responses are not retried by Cobre.
- Do not generate code that contradicts these rules and then add a disclaimer.
- Make the smallest safe change, preserve language/framework/structure, and explain material edits.

## Code-generation guardrails

When generating or fixing webhook code, these rules are mandatory:

- Preserve the raw request body for signature verification.
- Do not parse then reserialize JSON before HMAC verification.
- Do not invent a replay-window timestamp check.
- Do not invent timeout values.
- Do not invent 5xx retry behavior.
- Do not claim delivery ordering.
- Do not claim guaranteed delivery semantics.
- Do not hardcode a frozen list of event keys.
- Do not invent a universal dedup-store TTL.
- Persistent or shared dedup storage may be recommended for production, restarts, or multi-instance deployments. Do not imply DB/Redis is universally required.
- If digest representation is not verified from current public docs/MCP, do not emit **any** executable line that selects an encoding or performs an encoding-dependent comparison: no `.digest("hex")`, `.digest("base64")`, `Buffer.from(..., "hex")`, and no placeholder encoding in executable code. Stop the executable example after creating the HMAC object / signing message, or mark the entire example incomplete/non-deployable. Insert a non-executable TODO that the digest representation must be confirmed in current public docs/MCP before completing comparison. Say explicitly: `This handler is intentionally incomplete and must not be deployed until digest representation is confirmed.` Do not generate a runnable endpoint that pretends to be deployable. Do not invent any HTTP status (including 500) for that incomplete state, and never add unreachable "rest of handler" code after an unconditional return inserted only because docs are incomplete. Do not provide a guessed implementation after that TODO. Only after verification may the example include the exact digest/comparison implementation. This applies even if a comment says "verify encoding". Do not show code that contradicts this guardrail and then disclaim it afterward. If exact working code is requested, consult the Docs MCP/public docs first. If the encoding still cannot be confirmed, leave that portion explicitly incomplete rather than guessing.
- Constant-time comparison may be recommended conceptually as a general security practice. Do not describe it as a Cobre-specific requirement unless public docs say so. Generated comparison code must not depend on an unverified digest encoding.
- Do not invent a specific HTTP response code for malformed or missing signature headers, or for incomplete verification, unless public Cobre documentation specifies it. Do not choose HTTP 400, 401, 403, or 500 as a Cobre-specific rule unless verified. Do not choose 4xx or 5xx for a missing-information state. It is safe to say valid deliveries should receive 2xx and that 4xx responses are not retried. If a concrete example needs a rejection path, use `// return an application-chosen rejection response here`.
- In an incomplete skeleton, do not call res.end(), res.send() or res.sendStatus() as a placeholder: res.end() implicitly sends 200. Add a non-executable comment stating that no response is sent yet and the request stays open until the verified implementation defines it.
- Do not execute real webhook subscription API calls in v0.1.
- Local code generation, review, and editing are allowed.
- Tests and examples are allowed. Use placeholder secrets only.

If exact/current API details are needed, consult the public Cobre API Documentation MCP. Prefer current public docs over stale encoded facts. Do not invent behavior when sources disagree.
