---
name: cobre-payout-co-testing
description: >-
  Guide developers through public Cobre QA testing for PayOut Colombia: test
  transactions, change money movement state, Testing Cases for money movements
  and counterparties, happy and unhappy paths, and published QA limits. Also
  use when reviewing Colombia payout test plans or QA fixtures. Use when the
  user asks how to test outgoing COP payments, simulate completed or rejected
  payouts, or fund a QA Cobre Balance. Do not use this skill for production
  payout execution, authentication, or webhook HMAC.
---

# Cobre PayOut Colombia — testing

Client-facing guidance for **published** QA testing of outgoing COP payouts.

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

## Published QA environment

Colombia payout testing is described on General Testing. Request QA
credentials from the Account Manager. Use the QA base URL published on that
page — do **not** hardcode a host in generated code; take it from
`COBRE_BASE_URL` (see `cobre-api-conventions`).

Published there:

- Colombia, Notifications, Accounts, Counterparties, and payout Money
  Movements are available in QA.
- Connect Account and Account Verification are **not**.
- Payout Money Movement is a “full testing solution”.
- The only published financial institution for the counterparty in QA is
  `1007`.
- A note “Nequi and BreB are not available” sits under **Payin** Solutions,
  not Payout. Do not treat that sentence as a payout-QA fact.

Do not invent other QA banks, rails, or products.

## Fund the QA balance

`POST /account_test_transactions` (QA). Confirm the current body in the Docs
MCP / Create a Transaction Adjustment page. Published required fields:
`account_id`, `amount`, `transaction_code`, `description`. Published
adjustment codes: credit `0301`, debit `0350`. Amounts are integer minor
units. Success and error bodies on that page are empty HTTP statuses — do
not invent a response schema.

## Happy path (published)

1. Create a Colombia Cobre Balance (`POST /accounts`, provider published on
   Managing Virtual Balance Accounts — confirm current `provider_id`).
2. Credit it with the QA adjustment endpoint.
3. Create a counterparty whose `beneficiary_institution` is the QA
   institution above (or a `breb_key` / `breb_qr` if you have confirmed
   those types against current OAS **and** current QA comments).
4. `POST /money_movements` with `source_id` = `<account_id>`,
   `destination_id` = `<counterparty_id>`. Confirm metadata variant and
   `idempotency` header in the current OAS.
5. Observe `initiated` → `processing` → a terminal state via webhooks
   (`cobre-webhooks`) and `GET /money_movements/<mm_id>`.

Testing Cases lists one Money Movement happy path: send the requested data
correctly and obtain a new movement. It does **not** split cases by Fast
Pay, ACH, Bre-B, QR, or split payments. Do not invent those cases.

## Published unhappy paths

Testing Cases is the catalog. Point testers there; do not copy the table.

Money Movement rows to exercise (confirm codes in the Error Dictionary
before asserting them): fewer fields than expected; invalid
`destination_id`; `amount` less than 0; same `source_id` as
`destination_id`; idempotency value shorter than 9 characters; disallowed
source/destination combination; `description` over the limit; invalid
`source_id`.

**Conflict:** Testing Cases names `MM003` for `amount` < 0. MM003 was not
listed in the Error Dictionary reviewed while writing this skill; check the
current page before assuming either way. That page documents `MM005` for
amount not ≥ 1.
Fast Pay / ACH product pages also say transfers without amount limits.
**Expose the conflict.** Do not generate a client-side min/max check. Do
not assert `MM003` as the live code.

Testing Cases also has `MM013` for a `reference` that exceeds its limit.
ACH / Fast Pay / Bre-B create metadata had no `reference` field in the OAS
reviewed while writing this skill; check the current OAS before assuming
either way. Do not add `reference` to Colombia payout fixtures unless the
current OAS shows it.

Counterparty and Account unhappy paths on Testing Cases (CP* / ACC*) apply
when creating those resources. Auth AU* → `cobre-auth`.

## Force a terminal payout state (QA)

`POST /change_mm_state` (QA). Confirm the current body in the Docs MCP /
Change a Money Movement Status. Published required fields:
`money_movement`, `status`. Published allowed statuses: `completed` or
`rejected` only. The Money Movement must already be `processing`. Do not
invent other target states (`failed`, `canceled`, `initiated`).

Examples in the OAS reviewed while writing this skill showed those two
statuses but did not enumerate them; the guide does. Check the current OAS
before assuming either way. Expose that if asked to generate a stricter
client enum.

## Observability in tests

Subscribe to Money Movement status events and, if needed, account balance
debit/credit. Delivery, HMAC, and 2xx/4xx rules → `cobre-webhooks`.
Reconcile with `GET /money_movements/<mm_id>` and account transactions
(`metadata.money_movement_id` on Payouts Reconciliation). Do not hardcode
an event catalog; public lists differ (`money_movements.status.returned`
appears only on the Portal subscription-management page).

## Review checklist

1. **Docs MCP** — Reachable and refreshed? If not, stop.
2. **Host** — QA URL from config / General Testing, not hardcoded.
3. **FI** — Counterparty institution is the published QA value only.
4. **Cases** — Only Testing Cases + QA endpoints above; no invented rails.
5. **Codes** — MM003 vs MM005 exposed, not “fixed”.
6. **change_mm_state** — Only from `processing` to `completed`/`rejected`.
7. **Payin note** — Not applied to payout QA.
8. **Secrets** — Placeholder credentials only.

## Do not assert

- Unpublished QA banks, rails, or products.
- That “Nequi and BreB are not available” applies to **payout** QA.
- Invented cases for QR, split, or Fast Pay vs ACH selection.
- `MM003` as the Error Dictionary code, or a client min/max amount rule.
- A `reference` field on Colombia payout metadata unless the current OAS
  has it.
- Header name `idempotency-key` / `Idempotency-Key` (confirm `idempotency`
  on the current create-MM contract).
- `change_mm_state` to statuses other than the two published values.
- Production funding of a Cobre Balance.
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
- [Create a Transaction Adjustment](https://docs.cobre.com/create-a-transaction-adjustment-1886752m0)
- [Change a Money Movement Status](https://docs.cobre.com/change-a-money-movement-status-1886753m0)
- [Error Dictionary](https://docs.cobre.com/error-dictionary-1886577m0)
- [Payouts Reconciliation](https://docs.cobre.com/payouts-reconciliation-2335732m0)
- OAS (confirm current): `POST /account_test_transactions`,
  `POST /change_mm_state`, `POST /money_movements`, `POST /counterparties`
