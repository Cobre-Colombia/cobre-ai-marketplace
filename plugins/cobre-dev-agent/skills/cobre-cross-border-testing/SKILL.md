---
name: cobre-cross-border-testing
description: >-
  Guide developers through public Cobre testing for Cross-Border / FX: QA
  marks Cross Border false, so tests use the pre-go-live instance; no FX
  Quotes or CBMM rows in Testing Cases; what local payout fixtures do not
  cover. Also use when reviewing Cross-Border test plans. Use when the
  user asks how to test FX quotes, Cross Border Money Movements, or Generic
  international payouts. Do not use this skill for production execution,
  authentication, or webhook HMAC.
---

# Cobre Cross-Border — testing

Client-facing guidance for **published** testing of Cross-Border FX (quotes
+ CBMM) and Generic Money Movements.

v0.1 may review and edit local test code and generate examples or fixtures.
Do not execute real Cobre API requests with customer credentials, ask the user
to paste secrets, or call Cobre to validate credentials.

**Field names, required properties, and schemas must be confirmed in the
current Docs MCP before generating test code.** The OpenAPI contract served
by the Docs MCP can be older than the live documentation. Confirm the
current contract in the Docs MCP before generating code.

If the Docs MCP does not respond at all: stop and say so. Do not complete
schemas, examples or field lists from memory.

If the Docs MCP responds but cannot refresh (for example, a TLS certificate
error): say so explicitly and state that the contract may be older than the
live documentation. Before generating anything, ask the user to choose:
(a) continue with what the Docs MCP returns, with every field marked
"to confirm"; (b) fix the refresh and retry, for example by configuring
the organization's root certificate for Node.js with NODE_EXTRA_CA_CERTS,
and never by disabling certificate verification; (c) stop. Do not generate
code or field lists until the user chooses. If the user chooses (a), never
state that a field or behavior does not exist.

If this skill and current public docs/MCP disagree, prefer the docs/MCP. If
two public sources conflict, **expose the conflict**. Do not invent
unpublished test cases.

Cross-reference, do not duplicate:

- Token / expiry tests → `cobre-auth`
- Webhook signature and retry tests → `cobre-webhooks`
- Amount encoding, `fx_rate` not minor units, API error vs outcome →
  `cobre-api-conventions`
- Quote + CBMM flow → `cobre-cross-border-fx-flow`
- Generic MM flow → `cobre-cross-border-generic-flow`
- Colombia/Mexico payout QA (`change_mm_state`) → `cobre-payout-*-testing`

StableFX, stable pairs, wallets, `global_deposit_*`, on-ramp and off-ramp
are **not covered here**.

## Cross Border is not QA

General Testing Availability: Country / Solution **Cross Border** is
`false`. For products marked `false`, Cobre deploys an isolated
**pre-go-live testing instance** (not QA, not live): separate
`client_id` / `client_secret`, Portal users, and data. Request credentials
from the Account Manager / KAM. Do not invent a host; require
`COBRE_BASE_URL`. Certification Process: the live demo uses QA **or** that
pre-go-live instance when the product is not in QA.

Do **not** treat Colombia/Mexico QA matrices as Cross Border coverage.
Those rows are local PayIn/PayOut.

## What is not a published fixture here

`POST /account_test_transactions` and `POST /change_mm_state` appear under
General APIs / **Payout** Solutions for QA. They were **not** published for
Cross Border in the docs reviewed while writing this skill; check the
current General Testing page before assuming either way. Do **not** teach
them as FX, CBMM, or Generic fixtures.

Testing Cases lists Authentication, Accounts, Counterparties, and Money
Movement. It had **no** `/fx_quotes` or `/cross_border_money_movements`
rows in the docs reviewed while writing this skill; check the current page
before assuming either way. Do not invent FX/CBMM cases. MM/CP/Auth rows
may still apply to **Generic** `POST /money_movements` and generic
counterparties — they are not Cross-Border-specific.

## What General Testing still asks you to validate

The “every integration” table: token handling (`cobre-auth`); creating the
accounts (and counterparties, if Generic) your flow needs; allowed
`source_id` / `destination_id` combinations; amount in the smallest
currency unit (`fx_rate` is **not** that — `cobre-api-conventions`);
idempotency (verify per endpoint); error handling; webhooks plus GET and
reports. Happy and unhappy paths; interpret failures with the Error
Dictionary — do not copy tables.

## Suggested public paths (not a catalog)

Split tests by **product**. Do not mix CBMM with Generic MM.

**FX + CBMM** (`cobre-cross-border-fx-flow`): pre-go-live credentials;
create the published account combination for the pair; `POST /fx_quotes`
then `POST /cross_border_money_movements` (verify against the current OAS).
Static: fund first. Rolling: expect `pending_funds`, then fund before the
tier’s `valid_until` (do not quote durations — Create Fx Quotes and OAS
disagree). Observe `cross_border_money_movements.status.*` and GET one.
Completed: `cbmm_debit` / `cbmm_credit`. Unhappy: point at Error Dictionary
**FX Quotes** and **Cross Border Money Movements** sections (expired /
missing quote, missing fields, idempotency length, daily quota). Do not
copy codes. Do not generate a client-side min/max or quota check.

**Quote validity:** more than one duration is published. Tests should
follow the **current** Create Fx Quotes page and OAS `valid_until` — do
not hardcode a window. Only the most recent quote (`last_quote`) can start
a CBMM.

**Generic MM** (`cobre-cross-border-generic-flow`): same pre-go-live
instance unless the current page says otherwise. Generic counterparty +
`POST /money_movements` with required `description` and `category` (no
published `category` list). Events: `money_movements.status.*`. Rails:
SWIFT/SEPA/CIPS on the Generic guide; Fedwire on counterparties — expose,
do not pick. Testing Cases MM unhappy rows may apply; confirm codes in
the Error Dictionary (MM vs CBMM prefixes are different).

**FX Alerts:** not a Testing Cases section in the docs reviewed. If tested,
create via `POST /alerts` and subscribe to `alerts.fx_rate.triggered`
(`cobre-cross-border-fx-flow`). Do not copy rate examples.

Idempotency: CBMM header `idempotency`; quote POST OAS reviewed showed no
header while Create Fx Quotes publishes a period; Testing Cases MM uses
`idempotency_key`; questionnaire `idempotency-key`. Verify per endpoint.
Do not quote windows. Persist the key for retries of the same logical
operation (`cobre-api-conventions`).

HMAC → `cobre-webhooks`. Catalog vs layout vs Subscription management
disagree on CBMM event keys (`pending_funds`, `failed`) — expose; GET is
the fallback Notifications describes.

## Review checklist

1. **Docs MCP** — Reachable and refreshed? If not, stop.
2. **Host** — URL from config, not hardcoded. Pre-go-live, not QA?
3. **Fixtures** — `change_mm_state` / `account_test_transactions` not used
   as Cross Border helpers?
4. **Catalog** — No invented FX/CBMM Testing Cases rows?
5. **Product** — Quote+CBMM vs Generic not mixed? Stablecoins out?
6. **Validity** — No hardcoded quote duration?
7. **Secrets** — Placeholder credentials only.

## Do not assert

- That Cross Border is available in QA.
- That Testing Cases publishes FX Quotes or CBMM rows (not in the docs
  reviewed while writing this skill).
- That `account_test_transactions` or `change_mm_state` are Cross Border
  test endpoints.
- Unpublished sandbox payers, hosts, waits, quotas, minima, or quote
  durations.
- That Generic MM is tested with `/cross_border_money_movements`, or that
  a CBMM pays the beneficiary bank.
- That StableFX, wallets, or `global_deposit_*` are in scope here.
- A single idempotency header name for every endpoint (verify per
  endpoint).
- `fx_rate` as a minor-unit integer.
- Auth, HMAC, error-envelope, or `Cobre-Version` behavior.
- Before generating code, also apply `cobre-api-conventions`. Do not
  default the API base URL or hardcode a Cobre host (production or
  sandbox): require it from configuration (for example `COBRE_BASE_URL`)
  and fail with a clear error if it is missing. This applies even when
  the contract served by the Docs MCP lists only one server.
- If the user asks for a fixed or hardcoded API URL, do not accept it
  silently. First explain once that every request, including money-moving
  ones, would go to that host regardless of the environment, and keep the
  URL in configuration (for example `COBRE_BASE_URL`) as the default. Only
  if the user insists after that, write the URL in a single named constant
  with a visible comment, never as a silent default. Do not invent the URL:
  take it from the current public docs/MCP or ask the user for it.
- Prefer requiring the caller to supply the idempotency key on endpoints
  that document one (verify per endpoint), and keep it for retries of the
  same logical payment. If a default key is generated, create it once per
  logical payment and persist it, never once per call. This is engineering
  guidance, not a Cobre contract.

## Sources

- [General Testing](https://docs.cobre.com/general-testing-1886578m0)
- [Testing Cases](https://docs.cobre.com/testing-cases-1886579m0)
- [Certification Process](https://docs.cobre.com/certification-process-2047778m0)
- [Create Fx Quotes](https://docs.cobre.com/create-fx-quotes-1886567m0)
- [Create a Cross Boder Money Movement](https://docs.cobre.com/create-a-cross-boder-money-movement-1886568m0)
- [Create a Generic Money Movement](https://docs.cobre.com/create-a-generic-money-movement-2289072m0)
- [Error Dictionary](https://docs.cobre.com/error-dictionary-1886577m0)
- [Notifications & Subscriptions](https://docs.cobre.com/notifications-subscriptions-1886572m0)
- [Transaction Types](https://docs.cobre.com/transaction-types-1886582m0)
- OAS (confirm current): `POST /fx_quotes`, `POST /cross_border_money_movements`, `POST /money_movements`
