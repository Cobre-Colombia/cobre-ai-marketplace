---
name: cobre-payout-mx-testing
description: >-
  Guide developers through public Cobre testing for PayOut Mexico: Mexico is
  not in QA, pre-go-live instance, Testing Cases that still apply to SPEI,
  and what Colombia QA endpoints do not cover. Also use when reviewing Mexico
  payout test plans. Use when the user asks how to test outgoing MXN
  payments or simulate SPEI payouts. Do not use this skill for production
  payout execution, authentication, or webhook HMAC.
---

# Cobre PayOut Mexico — testing

Client-facing guidance for **published** testing of outgoing MXN payouts.

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
- Colombia QA funding and `change_mm_state` → `cobre-payout-co-testing`
  (those pages are Colombia; do not reuse them as Mexico fixtures)

## Mexico is not in QA

General Testing marks Country / Solution **Mexico** as `false`. Colombia
payout Money Movements are `true` there; Account Verification is also
`false`. Do not generate Mexico tests against the Colombia QA matrix. A
Mexico test institution was not found in the docs reviewed while writing
this skill; check the current page before assuming either way.

For products marked `false`, Cobre deploys an isolated **pre-go-live**
instance (separate credentials, Portal users, and data; not promoted to
live). Certification Process points the demo at QA **or** that instance.
Request access through the Account Manager / KAM. Do not invent a host;
take the base URL from configuration (`COBRE_BASE_URL`). Do not quote
SLAs from General Testing here.

## What Colombia QA endpoints do not apply

In the docs reviewed while writing this skill, General Testing listed
`POST /account_test_transactions` and `POST /change_mm_state` only under
**Colombia**. They were not listed for Mexico; check the current page
before assuming either way. Do **not** teach them as Mexico fixtures, or
invent a pre-go-live funding API.

## Happy path (published)

There is **no** Mexico-specific Testing Cases table in the docs reviewed
while writing this skill; check the current page before assuming either
way. Use the general catalog plus the SPEI guide:

1. Obtain pre-go-live credentials (Account Manager / KAM).
2. Create a Mexico Cobre Balance (`POST /accounts`, provider published on
   Managing Virtual Balance Accounts — confirm current `provider_id`).
3. Create a `clabe` or `spei_card` counterparty (verify fields against the
   current OAS). Do not invent a test institution or CLABE.
4. `POST /money_movements` with `source_id` = `<account_id>`,
   `destination_id` = `<counterparty_id>`, and SPEI metadata including
   `reference` (verify variant, required fields, and `idempotency` header
   in the current OAS).
5. Observe `initiated` → `processing` → a terminal state via webhooks
   (`cobre-webhooks`) and `GET /money_movements/<mm_id>`.

Testing Cases lists one Money Movement happy path: send the requested data
correctly and obtain a new movement. It does **not** split cases by SPEI
CLABE vs SPEI Card. Do not invent those cases.

## Published unhappy paths

Testing Cases is the catalog. Point testers there; do not copy the table.
The rows are not labeled Mexico-only; they still apply to resource
creation.

Money Movement rows to exercise (confirm codes in the Error Dictionary
before asserting them): fewer fields than expected; invalid
`destination_id`; `amount` less than 0; same `source_id` as
`destination_id`; idempotency value shorter than 9 characters; disallowed
source/destination combination; `description` over the limit; invalid
`source_id`; **`reference` over the limit (`MM013`)** — unlike Colombia
payout metadata, SPEI documents `reference` (verify against the current
OAS).

**Conflict:** Testing Cases names `MM003` for `amount` < 0. Check the
current Error Dictionary (`MM005` is documented there for amount not ≥ 1)
before asserting a code. Do not generate a client-side min/max check.

Counterparty rows that matter for SPEI Card include an incorrect
`beneficiary_institution`. CLABE account-number format errors are on
Testing Cases and the SPEI guide (real-time API errors). Auth AU* →
`cobre-auth`.

## Observability in tests

Subscribe to Money Movement status events and, if needed, account balance
debit/credit. Delivery, HMAC, and 2xx/4xx rules → `cobre-webhooks`.
Reconcile with `GET /money_movements/<mm_id>` and account transactions
(`metadata.money_movement_id` on Payouts Reconciliation). Do not hardcode
an event catalog; public lists differ (`money_movements.status.returned`
appears only on the Portal subscription-management page; Processing
Refunds in Mexico says there is no `returned` status).

If tests include Account Verification: it is not in QA; results are not
real-time — poll Obtain one / Obtain all. Schedule and retry wait: Account
Verification page; do not quote those figures here.

## Review checklist

1. **Docs MCP** — Reachable and refreshed? If not, stop.
2. **Host** — Pre-go-live URL from config, not hardcoded, not Colombia QA
   assumed.
3. **Env** — Mexico treated as `false` on General Testing?
4. **Endpoints** — No `account_test_transactions` / `change_mm_state`
   generated as Mexico fixtures?
5. **Cases** — Only Testing Cases + SPEI guide; no invented rails.
6. **Metadata** — SPEI `reference` exercised; Colombia fixtures not reused
   blindly.
7. **Secrets** — Placeholder credentials only.

## Do not assert

- That Mexico is available in QA.
- That `account_test_transactions` or `change_mm_state` are published
  Mexico test endpoints.
- Unpublished Mexico test banks, CLABEs, cards, or products.
- Invented cases split by CLABE vs SPEI Card beyond Testing Cases.
- `MM003` as the Error Dictionary code, or a client min/max amount rule.
- Header name `idempotency-key` / `Idempotency-Key` (confirm `idempotency`
  on the current create-MM contract).
- That Colombia payout metadata (no `reference`) is valid SPEI.
- Production funding of a Cobre Balance, or an invented pre-go-live funding
  API.
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
  for retries of the same payment. If a default key is generated, create
  it once per logical payment and persist it, never once per call. This
  is engineering guidance, not a Cobre contract.

## Sources

- [General Testing](https://docs.cobre.com/general-testing-1886578m0)
- [Testing Cases](https://docs.cobre.com/testing-cases-1886579m0)
- [Certification Process](https://docs.cobre.com/certification-2047778m0)
- [SPEI](https://docs.cobre.com/spei-1886563m0)
- [Managing Virtual Balance Accounts](https://docs.cobre.com/managing-virtual-balance-accounts-1886553m0)
- [Error Dictionary](https://docs.cobre.com/error-dictionary-1886577m0)
- [Payouts Reconciliation](https://docs.cobre.com/payouts-reconciliation-2335732m0)
- [Account Verification](https://docs.cobre.com/account-verification-1886570m0)
- [Processing Refunds in Mexico](https://docs.cobre.com/processing-refunds-in-mexico-2202241m0)
- OAS (confirm current): `POST /money_movements`, `POST /counterparties`
