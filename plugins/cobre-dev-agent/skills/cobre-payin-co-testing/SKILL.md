---
name: cobre-payin-co-testing
description: >-
  Guide developers through public Cobre testing for PayIn Colombia: QA
  availability for Direct Link and Checkout, the PayIn note that Nequi and
  Bre-B are not available, Cobre Keys pre-go-live, Testing PSE and
  Bancolombia, and what payout fixtures do not cover. Also use when
  reviewing Colombia collection test plans. Use when the user asks how to
  test incoming COP payments. Do not use this skill for production
  collection execution, authentication, or webhook HMAC.
---

# Cobre PayIn Colombia — testing

Client-facing guidance for **published** testing of incoming COP collections.

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
- Amount encoding, API error vs MM outcome → `cobre-api-conventions`
- Checkout / Direct Link flow → `cobre-payin-co-r2p-flow`
- Keys / Transfer-In / Direct Debit / Refund API → `cobre-payin-co-standing-flow`
- Colombia payout QA (`change_mm_state`) → `cobre-payout-co-testing`

## Colombia PayIn in QA

General Testing marks Country / Solution **Colombia** as `true`. Checkout
(CO) is `true`. **Cobre Keys** is `false` (isolated **pre-go-live**
instance — request via Account Manager / KAM; do not invent a host; use
`COBRE_BASE_URL`). Account Verification is `false`.

PayIn Solutions matrix (that page): Direct Link Money Movement — full
testing with **PSE and Bancolombia**. Checkout — create works; full
testing **only Bancolombia**. Path written `/v1/checkout` vs create
contract `POST /checkouts` — expose. The note **“Nequi and BreB are not
available”** sits under PayIn Solutions, so it **does** apply to Direct
Link and Checkout. Do **not** extend it to Cobre Keys, Transfer-In, or
Direct Debit.

Where PSE through Checkout can be tested is not documented in the docs
reviewed while writing this skill. Do not say it is tested in pre-go-live:
the pre-go-live instance is documented for products marked `false` (for
example Cobre Keys), and Checkout is marked `true`. PSE is documented as
testable through Direct Link. Ask the KAM and check the current General
Testing page before assuming either way.

Transfer-In and Direct Debit were **not** PayIn matrix rows in the docs
reviewed while writing this skill; check the current page before assuming
either way — treat coverage as **not documented**.

`POST /account_test_transactions` is listed for Colombia. `POST
/change_mm_state` is listed under **Payout** Solutions — do not present
it as a PayIn fixture. Do not quote sandbox SLAs or rejection waits from
Testing PSE and Bancolombia; point testers at that page.

## Happy path (published)

Point testers at Testing PSE and Bancolombia for rail-specific sandbox
steps; do not copy fixture values here. Split tests by product. Do not
call a Direct Link dynamic Bre-B key a Cobre Key or a Virtual CLABE.
Portal Payment Links is not `POST /checkouts`.

**Direct Link (PSE / Bancolombia in QA):**

1. QA credentials (Account Manager / KAM).
2. Colombia Cobre Balance (`POST /accounts`; confirm `provider_id` on
   Managing Virtual Balance Accounts).
3. `r2p` counterparty, then `POST /money_movements` (verify variant,
   fields, and `idempotency` header in the current OAS). Direction:
   source counterparty, destination account.
4. Open `payment_link` per Testing PSE and Bancolombia. Observe
   `money_movements.status.*` and `GET /money_movements/<mm_id>`.
   Reconcile the credit on `metadata.money_movement_id`.

**Checkout (Bancolombia full path in QA):** `POST /checkouts` (verify
against the current OAS). MM appears **when the payer pays**. Same
reconciliation key.

**Cobre Keys:** pre-go-live, not QA. Create a key; observe
`cobre_keys.status.*` then `accounts.balance.credit` / `breb_credit` on
`metadata.key_value`. **No** MM.

**Transfer-In / Direct Debit:** no PayIn QA matrix row in the docs
reviewed — do not invent fixtures. If the user still tests them, follow
`cobre-payin-co-standing-flow` (no MM vs MM) and say coverage is not
documented.

Testing Cases lists one Money Movement happy path. It does **not** split
Checkout vs Direct Link vs Keys. Do not invent those cases.

## Published unhappy paths

Testing Cases is the catalog. Point testers there; do not copy the table.
Counterparty email/phone rows apply to `r2p`. MM rows apply to Direct
Link / Direct Debit create (confirm codes in the Error Dictionary).
`MM013` (`reference`) is **payout** metadata, not Direct Link `r2p_rail`.

**Conflict:** Testing Cases names `MM003` for `amount` < 0. Check the
current Error Dictionary before asserting a code. Do not generate a
client-side min/max check. Auth AU* → `cobre-auth`.

## Observability in tests

MM-backed (Checkout after pay, Direct Link, Direct Debit):
`money_movements.status.*`. Static Cobre Key: `accounts.balance.credit`
and `cobre_keys.status.*`. Transfer-In: `accounts.balance.credit` and
`transfer_acc.status.*`. HMAC → `cobre-webhooks`. Do not interchange
`key_value` and `account_reference`. Idempotency header: verify per
endpoint (`idempotency` on create-MM; Create a Checkout / Create a Key
documented none in the docs reviewed).

## Review checklist

1. **Docs MCP** — Reachable and refreshed? If not, stop.
2. **Host** — URL from config, not hardcoded.
3. **Matrix** — Nequi/Bre-B not treated as QA for Direct Link/Checkout?
   Keys pre-go-live? Transfer-In/DD not documented on the matrix?
4. **Payout fixture** — `change_mm_state` not used as PayIn?
5. **Product** — Checkout MM only after pay? Keys/Transfer-In create no MM?
6. **Reconcile** — `money_movement_id` vs `key_value` vs `account_reference`?
7. **Secrets** — Placeholder credentials only.

## Do not assert

- That Nequi or Bre-B have a published PayIn QA solution for Direct Link
  or Checkout.
- That the Nequi/Bre-B PayIn note applies to Cobre Keys, Transfer-In, or
  Direct Debit.
- That Cobre Keys are available in QA.
- A published QA matrix row for Transfer-In or Direct Debit (not
  documented in the docs reviewed while writing this skill).
- That `change_mm_state` is a PayIn test endpoint.
- Unpublished test payer IDs, institution codes, or sandbox waits —
  point to Testing PSE and Bancolombia.
- That a static Cobre Key or Transfer-In credit creates a Money Movement.
- Calling a Direct Link dynamic key a Cobre Key or a Virtual CLABE.
- That Portal Payment Links is `POST /checkouts`.
- `MM003` as the Error Dictionary code, or a client min/max amount rule.
- A single idempotency header name for every endpoint (verify per
  endpoint).
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
- [Testing PSE and Bancolombia](https://docs.cobre.com/testing-pse-and-bancolombia-1920864m0)
- [Testing Cases](https://docs.cobre.com/testing-cases-1886579m0)
- [Certification Process](https://docs.cobre.com/certification-2047778m0)
- [Checkout](https://docs.cobre.com/checkout-1886557m0)
- [Direct Link](https://docs.cobre.com/direct-link-1886559m0)
- [Cobre Keys with Bre-B](https://docs.cobre.com/cobre-keys-with-bre-b-1886558m0)
- [Managing Virtual Balance Accounts](https://docs.cobre.com/managing-virtual-balance-accounts-1886553m0)
- [Error Dictionary](https://docs.cobre.com/error-dictionary-1886577m0)
- [Payins Reconciliation in Colombia](https://docs.cobre.com/payins-reconciliation-in-colombia-1908673m0)
- OAS (confirm current): `POST /money_movements`, `POST /checkouts`, `POST /counterparties`
