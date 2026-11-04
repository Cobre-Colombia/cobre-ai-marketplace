---
name: cobre-api-conventions
description: >-
  Guide developers through Cobre API conventions: API error handling, HTTP
  error responses, retry decisions, idempotency headers, monetary amounts,
  pagination, API versioning, timestamps, and other transversal request/response
  conventions. Also use for reviewing or refactoring API clients, error parsers,
  retry loops, pagination helpers, and amount handling. Use when the user asks
  how to handle Cobre API errors, retries, idempotency, amounts, pagination, or
  versioning, or wants existing Cobre client code reviewed. Do not use this
  skill as the catalog of Money Movement rejection or failure reasons.
---

# Cobre API conventions

Client-facing guidance for transversal Cobre API request conventions: errors,
retries, idempotency, amounts, pagination, and versioning.

v0.1 may review and edit local application code and generate examples or tests.
Do not execute real Cobre API requests with customer credentials, ask the user
to paste secrets, or validate credentials by calling Cobre.

## Source of truth

Use only current public Cobre documentation and the public **Cobre API
Documentation** MCP.

- [Error Dictionary](https://docs.cobre.com/error-dictionary-1886577m0) — API /
  request errors
- [Money Movement Statuses](https://docs.cobre.com/money-movement-statuses-2032280m0)
  — asynchronous operation outcomes
- [Quick Start](https://docs.cobre.com/quick-start-1886551m0) — amounts,
  page-based pagination, MM/CBMM idempotency
- [Performance Guidelines](https://docs.cobre.com/performance-guidelines-rate-and-burst-limit-considerations-2289098m0)
  — 429 / rate limits
- [Managing API and Product Changes](https://docs.cobre.com/managing-api-and-product-changes-2288847m0)
  — versioning and change notices

For any endpoint-specific fact (exact header, schema, status, pagination
fields, amount rules), consult the current Docs MCP / that endpoint's OAS.
Do not generalize from another endpoint.

If this skill and the current public docs/MCP disagree, prefer the docs/MCP.
If two public sources conflict, **expose the conflict**. Do not silently choose
one. Do not invent undocumented behavior.

Cross-reference, do not duplicate:

- Token lifecycle and 401 primary refresh → `cobre-auth`
- Webhook signatures, delivery, and event dedup → `cobre-webhooks`

## Request outcome is not operation outcome

An **API error** means the HTTP request itself returned an error response.

A Money Movement (or other created resource) can later reach a failed or
rejected **operational** state after the API accepted the request.

Do not hardcode one lifecycle for every product. Conceptually:

```text
POST operation
  -> API response
      -> API error
      OR
      -> operation successfully created
           -> asynchronous lifecycle
                -> completed
                -> failed / rejected / other states per current product contract
```

Consult the current endpoint/product documentation for the actual states.

Do **not**:

- treat Money Movement rejection reasons as API error codes
- merge the Error Dictionary with Money Movement statuses
- imply that HTTP success means the payment ultimately succeeded
- infer a Money Movement outcome from the HTTP status of its creation request
- copy the Money Movement rejection/failure catalog into this skill

---

## API errors

This section is about **request** errors only.

Public API errors: [Error Dictionary](https://docs.cobre.com/error-dictionary-1886577m0).

There is currently **no safe universal error envelope**. Inspect the endpoint's
current OAS error responses before generating a parser.

Public examples may expose fields such as:

- `error_code`
- `code`
- `message`
- `description`
- `error_description`
- `error_message`

Do **not** generate a parser that assumes one of these fields exists on every
error. If the live field name is needed and sources disagree, say so and check
the current Docs MCP for that endpoint.

When a documented machine-readable error code exists, **branch on that code**.
Descriptions and messages are for diagnostics unless that endpoint's contract
explicitly says otherwise.

Use the current Error Dictionary. **Do not copy the full catalog into generated
code or into this skill.** Confirm current codes in the dictionary / Docs MCP.

Do **not** assume every Cobre API error is HTTP 409. Public OAS also documents
other statuses (including 400, 401, 403, 404, 429, 500) and some of those
bodies differ from the dictionary example.

Do **not** teach error types or codes that current public documentation does
not establish.

### Money Movement rejections and failures

Money Movement statuses and rejection/failure reasons are **not** the API Error
Dictionary. See [Money Movement Statuses](https://docs.cobre.com/money-movement-statuses-2032280m0).

- A create request can succeed while the resulting Money Movement later becomes
  unsuccessful.
- When reviewing or generating integration logic, do not treat HTTP 2xx / create
  success as final payment success.
- For exact states, transitions, or rejection/failure codes, consult the current
  Money Movement Statuses documentation / Docs MCP.
- Do not embed that catalog here.
- Do not assume rejection/failure reasons are universal across products or rails
  unless current public docs say so.
- Do not invent retry behavior for a rejected/failed Money Movement from API
  retry rules.
- If the user provides a rejection/failure code, identify it with Money Movement
  documentation, not the API Error Dictionary.

---

## Retries

Keep **API-request retries** separate from **recreating** a failed or rejected
Money Movement.

Only call retry behavior "Cobre behavior" when current public docs establish it.

**Documented Cobre API-request retry:**

- **429** — public rate limit is 30 TPS steady-state, with a 200-request burst
  (token bucket, refill 30/s). Treat 429 as a signal to back off immediately.
  Use exponential delay and jitter. Do not synchronized-retry across processes.
  **Retry-After is not documented.** Do not invent a 429 body schema.
- **401** — follow `cobre-auth`: reauthenticate, retry the original request
  **once**, stop on a second 401. For non-idempotent operations, retry only when
  the same idempotency key is preserved.

When retrying an API operation whose endpoint supports or requires idempotency,
**preserve the same key**. Never mint a new key for a retry of the same logical
API operation.

Do **not** infer that a failed/rejected Money Movement should be recreated
because an HTTP request would normally be retryable.

Do **not** invent Cobre-specific behavior for 5xx, timeouts, connection errors,
or Retry-After when the public contract is silent. A general engineering
retry/backoff may be labeled as a **general recommendation**, never as Cobre
contract. If the contract is needed and missing, leave that part incomplete.

---

## Idempotency

Do **not** define one global Cobre idempotency header. The exact header and
rules are endpoint-specific — check the current Docs MCP / OAS.

**Current documented MM / CBMM contract** (confirm if the endpoint changes):

- Header name: `idempotency`
- Required on `POST` Money Movements and Cross-Border Money Movements
- Minimum length: 9 characters
- Missing header: HTTP 400
- Window: 24 hours
- Same key reused: original response is returned; the operation is not
  re-executed

Preserve the same key across retries of the same logical API operation. Never
silently generate a replacement key during a retry.

Do not invent max length, charset, uniqueness scope, or replay-with-different-
payload semantics unless current public docs for **that endpoint** establish
them.

Public sources disagree in places (`idempotency` vs `Idempotency-Key`; some
dictionary codes mention a key on operations whose guides say they do not
support idempotency). Surface the conflict and use the **endpoint-specific**
contract.

HTTP header field names are **case-insensitive**. The important distinction is
the documented header **name** (`idempotency` vs `Idempotency-Key`), not
casing of the same name. Do **not** flag `Idempotency` vs `idempotency` merely
because of casing. When reviewing code, compare header names
case-insensitively and still detect genuinely different names.

---

## Amounts

Do **not** claim a universal `int64` schema. Current OAS generally exposes
monetary amounts as `integer` where applicable. Public Quick Start guidance
explains **minor-unit** representation (for example cents).

Treat exact schema, currency, sign, zero, minimum, maximum, and exceptions as
**endpoint/product-specific**. Consult the Docs MCP.

Minimum and maximum amounts are not declared in the public OAS for money movements and may differ by currency and rail. Do not hardcode, validate, or state any minimum, maximum, sign, or zero rule in generated code unless the endpoint contract in current public docs/MCP establishes it. Do not copy figures from memory or from non-Cobre sources. If a request is rejected because of its amount, surface the API response to the caller instead of guessing the cause. The OAS example conversion (for example 100 MXN represented as 10000) illustrates minor units for that example only; do not generalize it to other currencies.

`fx_rate` and other rate/decimal fields are **not** monetary minor-unit
integers merely because amounts are.

Do not assume the caller provides major-unit decimal amounts. Do not
automatically generate transformations such as `Math.round(input.amount * 100)`
unless the caller's input contract explicitly establishes major units **and**
the currency/product conversion is verified from current docs/MCP. Prefer
generated API helpers to accept an already validated integer amount in the
minor-unit representation required by the endpoint. Do not invent rounding
behavior. Keep currency/product-specific conversion rules outside this skill
unless verified.

Do not introduce JavaScript BigInt requirements unless the endpoint contract
justifies it, or the note is explicitly labeled general engineering guidance.

---

## Pagination

Cobre does **not** have one universal pagination model. Inspect the endpoint
contract before generating pagination code.

- **Page-based** lists may expose `page_number`, `page_size`, `is_last_page`,
  `contents` (and often `total_items`, `total_pages`, `page_items`).
- **Cursor-based** lists may exist for selected resources (`next_cursor`,
  `prev_cursor`, `has_more`, `data`, `limit`).

Do **not** generate a universal cursor paginator. Do not assume page numbering
(0 vs 1), defaults, maximum page sizes, or terminal conditions across
endpoints. Generated code must use the pagination contract of the specific
endpoint.

---

## Versioning

The current public API uses **`/v1`**.

Do **not** generate or require a `Cobre-Version` header unless current public
docs establish it.

Change communication is described in
[Managing API and Product Changes](https://docs.cobre.com/managing-api-and-product-changes-2288847m0)
(advance notice by change class, shutdown dates for major changes). Do not
invent version-pinning or header-default semantics.

---

## Other transversal conventions

Only these are clearly public and transversal enough to encode here:

- Base path: current public servers use `https://api.cobre.co/v1`.
- `Authorization: Bearer <access_token>` — details in `cobre-auth`.
- `Content-Type: application/json` is a reasonable client recommendation for
  JSON bodies. Do not claim Cobre rejects requests without it unless the
  endpoint contract says so.
- Timestamps: public guidance is UTC. Confirm exact datetime formats on the
  endpoint.
- Field names are generally `snake_case`. Confirm enums and required fields in
  the Docs MCP.
- `external_id` is a client reference on some create operations. Length and
  requirement are endpoint-specific.
- `metadata` is often rail- or product-shaped, not a free-form bag. Confirm
  the variant for that request.
- ID prefixes appear in public examples (`acc_`, `cp_`, `mm_`, …). Treat them
  as examples, not a complete prefix registry.
- Rate limits: 30 TPS / 200 burst apply to the client's underlying API key;
  multiple credentials under one client do not increase throughput.

Leave product/rail rules, full event catalogs, and resource-specific schemas
to the Docs MCP or a product skill.

---

## Documentation gaps

Do not close a gap by guessing.

When a missing or conflicting public fact blocks safe generation, say:

- what is missing or conflicting
- what cannot be generated safely
- that it must be verified in current docs.cobre.com / OpenAPI

Known gaps that currently block a universal implementation:

- No single error-envelope field set
- Dictionary "always 409" vs OAS statuses/bodies
- Replay of the same idempotency key with a different payload (not established
  as a general `idempotency` contract)
- 5xx / timeout / connection / Retry-After as Cobre contract
- Amount `integer` vs documented internal int64 handling
- Mixed pagination defaults and limits

---

## Code-generation guardrails

When generating or fixing client code, these rules are mandatory:

- Inspect the current endpoint OAS/error responses. Do not emit a universal
  error-envelope parser.
- Branch on a documented machine-readable API error code when one exists. Do
  not branch on human-readable API error text.
- Do not assume all API errors are HTTP 409.
- Do not treat Money Movement rejection/failure reasons as API error codes.
- Do not treat HTTP 2xx / create success as final Money Movement success.
- Do not retry or recreate a rejected/failed Money Movement using generic HTTP
  retry logic.
- Do not present undocumented 5xx / timeout / Retry-After handling as Cobre
  behavior.
- Never create a new idempotency key during a retry of the same logical API
  operation.
- Do not apply one idempotency header to every POST. Check the endpoint.
  Compare documented header **names** case-insensitively (`Idempotency` and
  `idempotency` are the same name). Flag a different name such as
  `Idempotency-Key` only when that is not the endpoint contract.
- Do not treat all amounts as universal int64 with universal sign rules.
- Do not add client-side amount validation (zero, negative, minimum, maximum) that the endpoint contract does not establish.
- Do not assume caller input is major-unit decimals. Do not generate
  `amount * 100` / rounding conversions unless the caller's contract and the
  endpoint's currency/product rules are both verified. Prefer helpers that
  take a validated minor-unit integer.
- Do not generate a universal cursor paginator or copy another endpoint's
  pagination defaults/limits.
- Do not generate `Cobre-Version` unless current public docs establish it.
- Do not default the API base URL or hardcode a Cobre host (production or sandbox) in generated code. Require it from configuration (for example `COBRE_BASE_URL`) and fail with a clear error if it is missing. A default host can send requests, including money-moving ones, to the wrong environment. Take the correct value from current public docs/MCP; if it cannot be verified, stop and say so instead of assuming one.
- Do not generate handling for error types the public docs do not establish.
- If the public contract is still ambiguous, leave that part **explicitly
  incomplete**. Do not invent behavior and then disclaim it.

## Review and improve existing code

Support requests such as:

- Review my Cobre API client
- How should I handle Cobre errors?
- Why am I getting 409s / 429s?
- Is my retry / idempotency logic correct?
- Fix my pagination / amount handling
- Why was this Money Movement rejected?

Use this skill for transversal conventions. Use the Docs MCP for current
endpoint facts. If the question is a Money Movement rejection/failure, use
Money Movement Statuses / Docs MCP, not the API Error Dictionary.

### What to inspect

1. **Error parsing** — Universal envelope assumption? Wrong field name? Branching
   on description text? Assuming every error is 409? Handling error types
   that public docs do not establish?
2. **Request vs operation outcome** — Treating create 2xx as payment success?
   Mapping MM rejection reasons through the API Error Dictionary?
3. **Retries** — 429 backoff present? 401 delegated to `cobre-auth` with one
   retry? Undocumented 5xx presented as Cobre contract? Recreating a rejected
   MM from HTTP retry rules?
4. **Idempotency** — Correct header **name** for this endpoint (compare
   case-insensitively)? Same key on retry? New key minted on retry? One header
   applied to every POST? Do not flag `Idempotency` vs `idempotency` as a
   mismatch.
5. **Amounts** — Minor units where the endpoint uses them? Rates treated as
   amounts? Universal int64 / sign rules copied across products? Unverified
   `* 100` / rounding from assumed major-unit input?
6. **Pagination** — Page vs cursor taken from this endpoint? Defaults/limits
   copied from another list?
7. **Versioning** — Undocumented `Cobre-Version` header?
8. **Credentials** — Hardcoded secrets? Never print or transmit real
   credentials.
9. **Base URL** — Hardcoded Cobre host or a default fallback instead of required configuration?

### Code-editing behavior

- Review only: explain findings and suggested changes.
- Fix/refactor: do **not** preserve an unsupported assumption merely because it
  existed in the user's code.
- Consult the Docs MCP when the correct replacement is endpoint-specific.
- Distinguish API/request failures from asynchronous operation failures.
- If the public contract is still ambiguous, leave that part explicit and
  incomplete rather than inventing behavior.
- Preserve the user's language, framework, conventions, and project structure.
- Make the smallest safe change. Explain material edits.
