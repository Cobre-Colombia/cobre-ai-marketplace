---
name: cobre-payin-mx-testing
description: >-
  Guide developers through public Cobre testing for PayIn Mexico: Mexico is
  not in QA, pre-go-live instance, standing CLABE vs Direct Link R2P SPEI
  paths, and what Colombia PayIn QA does not cover. Also use when reviewing
  Mexico collection test plans. Use when the user asks how to test incoming
  MXN payments or Direct Link SPEI. Do not use this skill for production
  collection execution, authentication, or webhook HMAC.
---

# Cobre PayIn Mexico — testing

Client-facing guidance for **published** testing of incoming MXN collections.

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
- Amount encoding, idempotency header, and API error vs MM outcome →
  `cobre-api-conventions`
- Colombia PayIn QA and payout Mexico fixtures → `cobre-payout-co-testing`,
  `cobre-payout-mx-testing` (do not reuse Colombia PayIn QA as Mexico)

## Mexico is not in QA

General Testing marks Country / Solution **Mexico** as `false`. The PayIn
Solutions matrix is **Colombia only** (Checkout CO `true` is not Mexico).
The “Nequi and BreB are not available” note is Colombia Payin. A Mexico
test CLABE was not found in the docs reviewed while writing this skill;
check the current page before assuming either way.

For products marked `false`, Cobre deploys an isolated **pre-go-live**
instance (separate credentials, Portal users, and data; not promoted to
live). Certification Process points the demo at QA **or** that instance.
Request access through the Account Manager / KAM. Do not invent a host;
take the base URL from configuration (`COBRE_BASE_URL`). Do not quote
SLAs from General Testing here.

## What Colombia PayIn QA does not apply

In the docs reviewed while writing this skill, General Testing listed
`POST /account_test_transactions` and `POST /change_mm_state` only under
**Colombia**. They were not listed for Mexico; check the current page
before assuming either way. Do **not** teach them as Mexico fixtures,
invent a pre-go-live funding API, or generate Checkout, PSE, Nequi,
Bre-B, or Cobre Keys tests as Mexico payins.

## Happy path (published)

There is **no** Mexico-specific Testing Cases table, and **no** Account
Reference rows, in the docs reviewed while writing this skill; check the
current page before assuming either way. Split tests by product; do not
call Direct Link's dynamic single-use CLABE a Virtual CLABE.

**Standing CLABE** (CLABE-backed balance or Virtual CLABEs product):

1. Obtain pre-go-live credentials (Account Manager / KAM).
2. Create a Mexico Cobre Balance (`POST /accounts`, provider on Managing
   Virtual Balance Accounts — confirm current `provider_id`).
3. For the Virtual CLABEs **product**: `POST /account_references` with
   type `virtual_clabe_accounts` (verify against the current OAS). Do not
   invent a test CLABE.
4. Observe `spei_credit` via `accounts.balance.credit` (`cobre-webhooks`)
   and GET transactions. There is **no** Money Movement to create or GET.

**Direct Link (R2P SPEI):**

1. Same balance as above.
2. Create a `r2p_spei` counterparty (verify against the current OAS).
3. `POST /money_movements` with `source_id` = `<counterparty_id>`,
   `destination_id` = `<account_id>`, and Direct Link metadata including
   `r2p_rail` (verify variant, required fields, and `idempotency` header
   in the current OAS). Read `metadata.virtual_account`.
4. Observe MM status via webhooks and `GET /money_movements/<mm_id>`.
   Match `spei_credit.metadata.account_reference` to that
   `virtual_account`. A transfer after expiry is not documented in the
   docs reviewed while writing this skill; check the current page
   before assuming either way.

Testing Cases lists one Money Movement happy path. It does **not** split
Direct Link vs standing CLABE. Do not invent those cases.

## Published unhappy paths

Testing Cases is the catalog. Point testers there; do not copy the table.
Counterparty email/phone format rows apply when creating `r2p_spei`.
Money Movement rows apply to Direct Link create (confirm codes in the
Error Dictionary). `MM013` (`reference` over the limit) is SPEI **payout**
metadata, not Direct Link `r2p_rail` — do not add `reference` to Direct
Link fixtures unless the current OAS shows it.

**Conflict:** Testing Cases names `MM003` for `amount` < 0. Check the
current Error Dictionary before asserting a code. Do not generate a
client-side min/max check. Auth AU* → `cobre-auth`.

## Observability in tests

Direct Link: Money Movement status events. Standing CLABE:
`accounts.balance.credit`. Delivery, HMAC, 2xx/4xx → `cobre-webhooks`.
Reconcile `spei_credit` on `metadata.account_reference` (Payins
Reconciliation in México) — never on `money_movement_id`. Do not hardcode
an event catalog; `money_movements.status.returned` appears only on the
Portal subscription-management page. Do not treat `transfer_acc.*` as
Virtual CLABE product events.

## Review checklist

1. **Docs MCP** — Reachable and refreshed? If not, stop.
2. **Host** — Pre-go-live URL from config, not Colombia QA.
3. **Env** — Mexico treated as `false`? PayIn QA matrix not reused?
4. **Product** — Standing CLABE tests create no MM? Direct Link not
   labeled Virtual CLABE?
5. **Endpoints** — No `account_test_transactions` / `change_mm_state` /
   Checkout as Mexico fixtures?
6. **Reconcile** — `account_reference` on `spei_credit`?
7. **Secrets** — Placeholder credentials only.

## Do not assert

- That Mexico is available in QA, or that the Colombia PayIn QA matrix
  applies.
- That `account_test_transactions` or `change_mm_state` are published
  Mexico test endpoints.
- Unpublished Mexico test CLABEs, cards, or products.
- Calling Direct Link's dynamic single-use CLABE a “Virtual CLABE”, or
  saying that CLABE is permanent.
- That standing CLABE credits create a Money Movement.
- `MM003` as the Error Dictionary code, or a client min/max amount rule.
- Header name `idempotency-key` / `Idempotency-Key` (confirm `idempotency`
  on the current create-MM contract).
- Production funding, or an invented pre-go-live funding API.
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
- Prefer requiring the caller to supply the idempotency key, and keep it
  for retries of the same Direct Link request. If a default key is
  generated, create it once per logical payment and persist it, never once
  per call. This is engineering guidance, not a Cobre contract.

## Sources

- [General Testing](https://docs.cobre.com/general-testing-1886578m0)
- [Testing Cases](https://docs.cobre.com/testing-cases-1886579m0)
- [Certification Process](https://docs.cobre.com/certification-2047778m0)
- [Direct Link](https://docs.cobre.com/direct-link-1992193m0)
- [Account Reference – Virtual CLABEs](https://docs.cobre.com/account-reference-virtual-clabes-1886560m0)
- [Managing Virtual Balance Accounts](https://docs.cobre.com/managing-virtual-balance-accounts-1886553m0)
- [Error Dictionary](https://docs.cobre.com/error-dictionary-1886577m0)
- [Payins Reconciliation in México](https://docs.cobre.com/payins-reconciliation-in-m%C3%A9xico-2335734m0)
- [Checkout](https://docs.cobre.com/checkout-1886557m0)
- OAS (confirm current): `POST /money_movements`, `POST /counterparties`,
  `POST /account_references`
