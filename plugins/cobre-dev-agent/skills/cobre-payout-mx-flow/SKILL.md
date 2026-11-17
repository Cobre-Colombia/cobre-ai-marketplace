---
name: cobre-payout-mx-flow
description: >-
  Guide developers through Cobre PayOut Mexico: outgoing MXN payments, SPEI
  to CLABE and SPEI Card, counterparties, money movements, SPEI metadata,
  payout lifecycle, Mexico Account Verification, and payouts reconciliation.
  Also use for reviewing or refactoring Mexico payout integrations. Use when
  the user asks how to send money in Mexico, pay a CLABE or SPEI Card from a
  Cobre Balance, or review that flow. Do not use this skill for
  authentication, webhook HMAC, or transversal API conventions.
---

# Cobre PayOut Mexico — flow

Client-facing guidance for outgoing MXN payouts in Mexico.

v0.1 may review and edit local application code and generate examples or tests.
Do not execute real Cobre API requests with customer credentials, ask the user
to paste secrets, or validate credentials by calling Cobre.

Public facts below come from Cobre's public SPEI, Money Movement, Account
Verification, and Payouts Reconciliation documentation. **Field names, required
properties, and schemas must be confirmed in the current Docs MCP before
generating code.** The OpenAPI contract served by the Docs MCP can be older
than the live documentation. Confirm the current contract in the Docs MCP
before generating code.

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
undocumented behavior.

Cross-reference, do not duplicate:

- Token lifecycle and 401 → `cobre-auth`
- Webhook signatures, delivery, retries, and event dedup → `cobre-webhooks`
- API errors vs operation outcomes, idempotency header, amounts, pagination,
  versioning → `cobre-api-conventions`
- Colombia payout rails and QA fixtures → `cobre-payout-co-*`

## Rails and destinations

Unlike Colombia (Fast Pay, ACH, Bre-B Key, Bre-B QR), published Mexico local
payouts are **SPEI only**. Destination types (verify against the current
OAS): `clabe` and `spei_card`. `mm_return` is informational only — not a
payout destination. `r2p_spei` is PayIn, not PayOut. SPEI Card institution
codes: Mexican Bank Codes — do not copy that table.

## Prerequisites

You need an active Mexico Cobre Balance with enough funds, then a
counterparty that matches the destination type. Creating a counterparty only
registers data; it does **not** verify the destination at the bank. Provider
and close-account rules: Managing Virtual Balance Accounts — confirm the
current `provider_id`. Do not quote catalog limits from that page here.

Optional: Account Verification (`POST /account_verifications`) before the
counterparty or Money Movement. Published Mexico models (verify against the
current OAS): `mex_acc_ownership_1` (CLABE or SPEI Card) and
`mex_acc_details_1` (CLABE only). Enablement: contact the KAM. QA is
`false` (General Testing). Mexico AV results are **not** real-time (poll
Obtain one / Obtain all). Format / nonexistent CLABE or card can error on
create. Schedule, latency, and retry wait: Account Verification page — do
not quote them here. Colombia Bre-B AV is real-time; do not treat Mexico
the same.

## Create the Money Movement

`POST /money_movements` with `source_id` = `<account_id>`, `destination_id`
= `<counterparty_id>`, integer `amount` in minor units, and SPEI `metadata`.
Confirm required/optional body fields and the `idempotency` header in the
current OAS. `external_id` was optional on the create contract in the OAS
reviewed while writing this skill and mandatory to *implement* on the
certification questionnaire — expose that split.

Metadata variant (verify against the current OAS): `spei_request_meta`.
When-clauses in the OAS reviewed while writing this skill applied it to a
payout from a Cobre Balance or Connect Account with geo `mex` to `clabe`
or `spei_card`. Unlike Colombia ACH / Fast Pay / Bre-B, SPEI includes
`reference` **and** `description`. The SPEI guide tells you to send both;
`required` on that schema in the OAS reviewed while writing this skill
listed `reference` only — **expose the split.** Lengths and numeric
constraints: verify against the current OAS; do not quote them here.

## Lifecycle and how the client learns the outcome

Same published PayOut path as Colombia: `initiated` → (optional
`pending_approval` when `checker_approval` is true) → `processing` or
`canceled` → `completed` / `rejected` / `failed`. Funds are described as
debited at `processing`. `completed` can later move to `rejected`. Do not
copy F*/R* tables; point to Money Movement Statuses. Invalid CLABE length,
non-numeric format, or a nonexistent CLABE: SPEI guide, real-time API error.

Learn the result from Money Movement status events (`cobre-webhooks`) plus
`GET /money_movements/<mm_id>`. The Money Movement guide says to avoid
polling until a terminal state. Notifications are best-effort.

A `failed` Money Movement is the terminal outcome of that operation. Before
creating a new payment, check the ledger (group by
`metadata.money_movement_id`) for any debit or credit, and do not retry
blindly. Reusing the same `idempotency` key inside its documented window
returns the original response and does not execute the operation again
(verify against the current OAS), so a new attempt is a new operation with
a new key. Whether `external_id` must be unique is not documented: do not
assume either way. This is engineering guidance, not a Cobre contract.

## Reconciliation

See Payouts Reconciliation. Group ledger entries by
`metadata.money_movement_id`. Use `external_id` to match your records.
That page's terminal-state table says `failed` never creates a debit, while
`rejected` can be debit + offsetting credit. The public sources do not
agree on this for `failed`: the product guides describe `failed` during
validation or processing, and the same reconciliation page later says a
debit plus a credit can be a reversed rejection or failure. Expose all of
these; do not pick one, and do not state "never" or "always" for `failed`.
Before creating a new payment, check the ledger (group by
`metadata.money_movement_id`) for any debit or credit. For SPEI payouts, a returned
transfer generates a `spei_return` **credit** that offsets the original
`spei_debit` under the same `money_movement_id`. `completed` is not a
permanently final balance state.

`POST /money_movements_return` is a **different** flow: it returns an
**incoming** `spei_credit` to the original payer (Processing Refunds in
Mexico). It is not the SPEI payout create path. That page states there is
**no** `returned` status.

## Public conflicts to expose (do not resolve)

- Source: SPEI guides say a Mexican Cobre Balance. When-clauses in the OAS
  reviewed while writing this skill also mention a Connect Account with geo
  `mex`. The Money Movement combination table lists SPEI source type
  `clabe`. Expose all three.
- Bulk Mexico counterparties lists destination `cobre_balance` with rail
  **Fast Pay**. SPEI and Managing Counterparties Mexico payout types do
  not. The questionnaire lists SPEI Clabes / SPEI Card, not that dest.
  Expose; do not treat Fast Pay as a Mexico payout rail.
- SPEI guide requires `description` and `reference`; OAS `required` on
  `spei_request_meta` in the contract reviewed while writing this skill
  listed `reference` only. Check the current OAS before assuming either way.
- CLABE / SPEI Card schemas in the OAS reviewed while writing this skill
  mark fullname and id as required and also say `ND` if not available; a
  SPEI Card example used `ND` outside `rfc` / `curp`. Card digit length
  disagreed with Account Verification; `alias` length in the description
  disagreed with schema `maxLength`. Check the current OAS / pages before
  assuming either way.
- Portal subscription-management lists `money_movements.status.returned`.
  Notifications, the event-layout page, and Processing Refunds in Mexico
  do **not**. Do not treat it as an API event unless current MCP/docs agree.

## Review checklist

1. **Sources** — Docs MCP reachable and refreshed? If not, stop.
2. **Rail** — SPEI only? Client trying to use Fast Pay / ACH / Bre-B in MX?
3. **Direction** — `source_id` account, `destination_id` counterparty?
4. **Metadata** — `spei_request_meta` with `reference` (verify OAS)?
5. **Amounts** — Integer minor units only; no invented min/max/sign checks.
6. **Outcome** — HTTP success not treated as paid? Terminal states handled?
7. **Reconciliation** — `money_movement_id` grouping? `completed` not final?
8. **Conflicts** — Exposed rather than silently chosen?

## Do not assert

- That Mexico local payouts use Fast Pay, ACH, or Bre-B.
- That `cobre_balance` is a published Mexico payout destination without
  exposing the Bulk vs SPEI conflict.
- One canonical source (always Cobre Balance, or always Connect Account).
- That `mm_return` or `r2p_spei` are PayOut destinations.
- That SPEI metadata matches Colombia (Colombia has no `reference`).
- That Mexico Account Verification is real-time like Colombia Bre-B
  (except the format / nonexistent errors the SPEI and AV pages describe).
- Webhook event `money_movements.status.returned` as part of the API catalog.
- That `POST /money_movements_return` is how you create a SPEI payout.
- Unpublished SPEI min/max amounts, a test institution, or a bank SLA.
- How to fund a Cobre Balance in production.
- Auth, HMAC, error-envelope, pagination, or `Cobre-Version` rules.
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

- [SPEI](https://docs.cobre.com/spei-1886563m0)
- [General Testing](https://docs.cobre.com/general-testing-1886578m0)
- [Questionnaire](https://docs.cobre.com/certification-questionnaire-2047804m0)
- [Money Movement](https://docs.cobre.com/money-movements-1899651m0)
- [Managing Counterparties](https://docs.cobre.com/managing-counterparties-1886556m0)
- [Managing Virtual Balance Accounts](https://docs.cobre.com/managing-virtual-balance-accounts-1886553m0)
- [Account Verification](https://docs.cobre.com/account-verification-1886570m0)
- [Payouts Reconciliation](https://docs.cobre.com/payouts-reconciliation-2335732m0)
- [Return a Money Movement](https://docs.cobre.com/return-a-money-movement-25933239e0)
- [Processing Refunds in Mexico](https://docs.cobre.com/processing-refunds-in-mexico-2202241m0)
- [Money Movement Statuses](https://docs.cobre.com/money-movement-statuses-2032280m0)
- [Bulk Money Movements](https://docs.cobre.com/bulk-money-movements-1886564m0)
- [Mexican Bank Codes](https://docs.cobre.com/mexican-bank-codes-1886580m0)
- [Notifications & Subscriptions](https://docs.cobre.com/notifications-and-subscriptions-1886572m0)
- [Money Movement (event layout)](https://docs.cobre.com/money-movement-1921909m0)
- [Subscription management](https://docs.cobre.com/subscription-management-1886550m0)
- OAS (confirm current): `POST /money_movements`, `POST /counterparties`,
  `GET /money_movements/{mm_id}`, `POST /account_verifications`,
  `POST /money_movements_return`
