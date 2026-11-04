---
name: cobre-auth
description: >-
  Guide developers through Cobre authentication, API credentials, user_id/secret,
  access tokens, JWT, Bearer tokens, token expiration, token caching, token
  refresh, 401 authentication errors, and authentication retry behavior. Also
  use for authentication implementation review, token manager review, auth code
  refactoring, and 401 debugging. Use when the user asks how to authenticate to
  Cobre APIs, how to obtain, cache, refresh, or retry with an access token, or
  wants their existing Cobre auth/token code reviewed, fixed, or refactored.
---

# Cobre authentication

Client-facing guidance for implementing Cobre authentication correctly and efficiently.

v0.1 may review and edit local application code and generate examples or tests.
Do not execute real Cobre API requests with customer credentials, ask the user
to paste secrets, or validate credentials by calling Cobre.

Lifecycle guidance below is from the public [Authentication Guide](https://docs.cobre.com/authentication-1886552m0).
For exact/current request and response schemas, fields, errors, or any API fact not described here, consult the public **Cobre API Documentation** MCP. If this skill and the current public docs/MCP disagree on a current API fact, prefer the docs/MCP. Do not invent undocumented behavior.

## Obtain a token

`POST /auth` exchanges `user_id` and `secret` for a JWT.

The authentication response includes:

- `access_token`
- `type`
- `expiration_time`

Use the token on later API calls:

```http
Authorization: Bearer <access_token>
```

For a JSON request body, `Content-Type: application/json` is a reasonable client recommendation. Do not claim Cobre will fail to parse the request without that header unless public documentation explicitly says so.

Do not duplicate the full OpenAPI schema here. Confirm current field details in the Docs MCP when needed.

## Token lifetime

Current documented production token lifetime is **1200 seconds / 20 minutes**.

This is Cobre's public documented configuration, not a value to infer from the first `/auth` response. Do not generate `knownLifetime = first_response.expiration_time`. If Cobre changes the documented lifetime, update the configured lifetime rather than assuming 1200 forever.

## Two different clocks

Keep these separate. Do not describe refresh as "at minute 18."

| Concept | Current 20-minute token | Meaning |
|---|---|---|
| Server-side auth cache TTL | **90% of token lifetime** → 1080 seconds / **18 minutes** | How long Cobre may return a cached JWT for the same credentials |
| Recommended proactive refresh | **95% of the documented token lifetime** → about 1140 seconds / **19 minutes** for a current 20-minute token | When the client should request a new token after a fresh issuance |

### Cobre server-side auth cache

Cobre caches login tokens server-side.

- Cache TTL = **90% of token lifetime**.
- With a 20-minute token, that is **1080 seconds / 18 minutes**.
- Before that cache expires, repeating authentication with the same credentials may return the **cached token** instead of a new JWT.

### `expiration_time` nuance

Public docs assign two meanings. Fresh-vs-cached classification is possible using the **documented token lifetime and cache semantics** — not local cache state, and not by learning lifetime from the first `/auth` response.

With the current documented configuration:

- `expiration_time ==` current documented full token lifetime (**1200**) → fresh issuance / cache miss. `expiration_time` is the full token lifetime.
- `expiration_time <=` current documented cache ceiling (**1080**, 90% of lifetime) → cached token / cache hit. `expiration_time` is remaining **auth-cache TTL**, not remaining JWT lifetime.
- otherwise → **unknown**. Do not infer lifetime. Do not schedule proactive refresh.

Do not invent another detector. In generated code, put today's documented values in named configuration (not scattered magic numbers) and label them as current documented values:

```text
TOKEN_LIFETIME_SECONDS = 1200  // current documented value
CACHE_TTL_RATIO = 0.90
REFRESH_RATIO = 0.95
```

Clients should interpret each response's `expiration_time` with the meaning above.

### Recommended refresh

- Cache and reuse the token.
- Do **not** call `POST /auth` for every API request.
- **Fresh issuance** (`expiration_time ==` current documented full token lifetime): proactive refresh may be scheduled at **95% of that lifetime**. Current documented point: **1140 seconds / 19 minutes**. That is after the 90% / 18-minute server cache, so a later `/auth` can miss and issue a new JWT.
- **Cached response** (`expiration_time <=` current documented cache ceiling): treat `expiration_time` as remaining auth-cache TTL only. Do **not** use it as remaining JWT lifetime. Do **not** apply the 95% refresh ratio to it.
- **Unknown** (any other `expiration_time`): no proactive refresh schedule. Do not infer lifetime from that value or from the first `/auth` response.
- Do **not** treat `refreshAt = now + expiration_time * 0.95` as a universal pattern.

## Token manager

Recommend a single token manager for Cobre API requests:

- Share one token per credential set across workers.
- Store it in memory when possible.
- For multiple application instances, a shared cache may be appropriate.
- Use locking/mutex around refresh so workers do not stampede `POST /auth`.
- When reviewing or generating token-manager code, classify fresh vs cached using the documented lifetime (currently 1200) and cache ceiling (currently 1080) before proposing any refresh calculation. Do not infer lifetime from the first `/auth` response.

## 401 handling

A **401** means the `Authorization` header is missing/malformed or the token is expired/invalid.

Treat 401 as **fallback**, not the primary refresh strategy. Primary refresh is the documented 95%-of-lifetime point above, applied only when `expiration_time` is known to be a full token lifetime.

On 401:

1. Call `POST /auth` again (`reauthenticate` / `requestToken` — this may still return a cached JWT).
2. Retry the original request **once** with the new token **only when retry is explicitly allowed**.
3. If that retry also returns 401, stop and surface an authentication failure.

Automatic retry must be conservative:

- Do **not** assume requests are idempotent by default. Default `idempotent` to **false**, or require the caller to opt into automatic retry.
- For non-idempotent operations, automatic retry is allowed only when the caller guarantees the **same** idempotency key is preserved across the original request and the retry.
- Do not generate or silently replace the idempotency key inside the token manager.
- Do not hardcode one idempotency header name in the token manager. The name is endpoint-specific (for example `idempotency` for Money Movements; some public sources say `Idempotency-Key`). Take the header name from caller configuration, or resend the caller headers unchanged, and never assume a single universal name.
- Do not default the API base URL. Require it from configuration (for example `COBRE_BASE_URL`) and fail with a clear error if it is missing, taking the value from current public docs/MCP. If the Docs MCP is unavailable, stop and say the base URL could not be verified. Credentials must never be sent to an assumed host.

## Code-generation guardrails

Local client state and Cobre's server-side auth cache are independent.

Do **not** assume:

- A local/client cache miss implies a Cobre server-side auth cache miss.
- Calling `POST /auth` guarantees a newly-issued JWT.
- Clearing a local token "forces" Cobre to issue a new JWT.
- `expiration_time` is automatically a fresh token's full lifetime on every `/auth` response.
- Every returned `expiration_time` is "seconds this JWT can safely be used."

Distinguish fresh vs cached using the **current documented token lifetime and cache semantics**, not local cache state and not the first `/auth` response as an unknown lifetime candidate:

- `expiration_time == TOKEN_LIFETIME_SECONDS` (currently **1200**) → fresh issuance / cache miss.
- `expiration_time <= TOKEN_LIFETIME_SECONDS * CACHE_TTL_RATIO` (currently **1080**) → cache hit.
- otherwise → unknown.

Do not invent another signal. Do not generate `knownLifetime = first_response.expiration_time`.

Before caching the result of `authenticate()`, validate at least:

- `access_token` is a non-empty string
- `expiration_time` is a finite positive number

Use named, configurable documented values rather than scattering magic numbers:

```text
TOKEN_LIFETIME_SECONDS = 1200  // current documented value
CACHE_TTL_RATIO = 0.90
REFRESH_RATIO = 0.95
```

If Cobre changes the documented token lifetime, update that configuration. Do not assume 1200 forever.

On a cache-hit response, `expiration_time` is remaining **server-side auth-cache TTL**, not JWT remaining validity. Do not treat it as client token expiration, a safe local JWT TTL, or a value from which to subtract a safety margin (`usableSeconds = expirationTime - safetyMargin`). Do not apply `REFRESH_RATIO` to it.

Do **not** generate any of these as a **universal** pattern. They apply only to a documented fresh issuance (`expiration_time == TOKEN_LIFETIME_SECONDS`):

```text
refreshAt = now + TOKEN_LIFETIME_SECONDS * REFRESH_RATIO
expiresAt = now + expiration_time
expiresAt = now + expiration_time - margin
ttl = expiration_time
usableSeconds = expiration_time - safetyMargin
```

When generating or fixing code:

- For a fresh issuance, proactive refresh may be scheduled at `TOKEN_LIFETIME_SECONDS * REFRESH_RATIO` (currently 1140 seconds).
- Do not use a cached-response `expiration_time` as remaining JWT lifetime.
- Do not universally generate `refreshAt = now + expiration_time * 0.95`.
- Keep generating the unambiguously safe portions: reuse an already-held token; centralize authentication; single-flight concurrent authentication requests; controlled reauthentication; conservative 401 fallback (retry once only when explicitly allowed / idempotent or same caller-supplied idempotency key); credential safety; never generate or replace idempotency keys.
- Do not name a function `forceRefresh` if all it does is call `POST /auth` again. Prefer `reauthenticate` or `requestToken`, and say that `POST /auth` may still return a cached JWT while Cobre's server-side auth cache is active.

For generated examples:

- A proactive-refresh token manager is allowed when it classifies fresh vs cached with the documented lifetime/cache ceiling and applies 95% only to a fresh issuance.
- Prefer safe token reuse + controlled reauthentication + 401 fallback alongside that classification.
- Ask about runtime architecture only when needed (single process, workers, distributed instances).

## Review and improve existing code

Support requests such as:

- Review my Cobre authentication code
- Is my token handling correct?
- Fix my Cobre auth implementation
- Refactor this function to follow Cobre best practices
- Review this token manager
- Why am I getting 401s?
- Can you improve how I cache/refresh Cobre tokens?

Use this skill for lifecycle and implementation guidance. Use the public Cobre API Documentation MCP when exact/current API facts, schemas, headers, errors, or fields need verification. Never invent API behavior from the code being reviewed.

### What to inspect

1. **Authentication call pattern** — Whether `POST /auth` is called unnecessarily often, or a token is reused instead of requesting one per API call.
2. **Token lifecycle** — Whether fresh vs cached is classified with the documented lifetime (currently 1200) and cache ceiling (currently 1080); whether it incorrectly infers lifetime from the first `/auth` response; whether 95% is applied only to a fresh issuance; whether cache-hit `expiration_time` is misused as JWT remaining life; whether magic numbers are scattered instead of named documented configuration.
3. **Concurrency** — Whether multiple workers/threads/instances can trigger simultaneous auth refreshes. Recommend locking/mutex/single-flight when applicable.
4. **401 handling** — Whether 401 triggers a controlled re-authentication; retry the original request at most once after reauthentication; stop after a second 401 instead of looping. Automatic retry must be opt-in or default `idempotent` to false.
5. **Idempotency safety** — Do not default requests to idempotent. For non-idempotent operations, retry only when the caller preserves the same idempotency key. Flag code that generates or silently replaces that key in the token manager.
6. **Credential handling** — Detect hardcoded `user_id`, `secret`, access tokens, or other credentials. Recommend environment variables / secret management. Never print, expose, or transmit real credentials.
7. **Architecture** — Prefer a shared token manager per credential set over scattered auth logic. Recommend reusable abstractions that fit the user's language/framework. Do not force one pattern if the existing architecture is sound.
8. **Incorrect cache/refresh assumptions** — Flag as incorrect: code that assumes local cache state determines Cobre server cache state; code that assumes every `/auth` response is a fresh JWT; code that applies `0.95` blindly to every `expiration_time`; code that treats a cache-hit `expiration_time` as JWT remaining validity; code that sets `knownLifetime = first_response.expiration_time`; code that claims it can force a new JWT by clearing local state; a `forceRefresh` name that only calls `POST /auth` again.
9. **Auth response validation** — Flag caching of `/auth` results without checking that `access_token` is a non-empty string and `expiration_time` is a finite positive number.

### Code-editing behavior

- Review only: explain findings and suggested changes.
- Fix/refactor (and file edits are allowed): update the relevant local code.
- Preserve the user's language, framework, conventions, and project structure.
- Make the smallest safe change necessary. Do not rewrite unrelated code.
- Explain material changes after editing.
