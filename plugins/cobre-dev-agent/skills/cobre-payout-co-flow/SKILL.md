---
name: cobre-payout-co-flow
description: >-
  Guide developers through Cobre PayOut Colombia: outgoing COP payments, Fast
  Pay, ACH, Bre-B Key, Bre-B QR, counterparties, money movements, metadata
  variants, payout lifecycle, optional Bre-B key Account Verification, and
  payouts reconciliation. Also use for reviewing or refactoring Colombia payout
  integrations. Use when the user asks how to send money in Colombia, pay a
  bank account or Bre-B key/QR from a Cobre Balance, or review that flow.
  Do not use this skill for authentication, webhook HMAC, or transversal API
  conventions.
---

# Cobre PayOut Colombia — flow

Client-facing guidance for outgoing COP payouts in Colombia.

v0.1 may review and edit local application code and generate examples or tests.
Do not execute real Cobre API requests with customer credentials, ask the user
to paste secrets, or validate credentials by calling Cobre.

Public facts below come from Cobre's public payout, Money Movement, Account
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

## Rails and destinations

Public Colombia payout rails: Fast Pay, ACH, Bre-B Key, Bre-B QR.

Destination types published for this flow (verify against the current OAS):
`cc`, `ch`, `dp`, `cobre_balance`, `breb_key`, `breb_qr`. The client does
**not** choose Fast Pay vs ACH. Routing is automatic from the destination
institution. Bank coverage and per-bank SLAs live on Colombian Bank Codes and
the Fast Pay / ACH product pages — do not copy those tables.

## Prerequisites

You need an active Colombia Cobre Balance with enough funds, then a
counterparty that matches the destination type. Creating a counterparty only
registers data; it does **not** verify the destination at the bank.

Optional, Bre-B **keys** only: Account Verification
(`POST /account_verifications`) before creating the counterparty or the Money
Movement. Published models (verify against the current OAS):
`col_key_details_1`, `col_key_ownership_1`, `col_key_ownership_2`. It does not
move funds. Enablement: contact the KAM. No published CO model for `cc` /
`ch` / `dp` or Bre-B QR. QA availability is `false` (General Testing).

## Create the Money Movement

`POST /money_movements` with `source_id` = `<account_id>`, `destination_id` =
`<counterparty_id>`, integer `amount` in minor units, and rail `metadata`.
Confirm required/optional body fields and the `idempotency` header in the
current OAS. `external_id` was optional on the create contract in the OAS
reviewed while writing this skill and mandatory to *implement* on the
certification questionnaire — expose that split.

Metadata variants (verify against the current OAS): `ach_request`,
`fast_pay_request`, `breb_request`. When-clauses in the OAS reviewed while
writing this skill send ACH vs Fast Pay from whether the destination
institution supports Fast Pay (`cc` / `ch` / `dp`). `breb_request` was
documented for `breb_key` or `breb_qr` in the OAS
reviewed while writing this skill. A dedicated metadata variant for
destination `cobre_balance` was not found in the OAS reviewed while writing
this skill; check the current OAS before assuming either way.

`category` appeared as a fixed `"Payroll"` const on ACH/Fast Pay schemas in
the OAS reviewed while writing this skill; the Error Dictionary also has
`MM023` for an invalid category. Do not invent other values. `split` was
documented as a string enum in the OAS reviewed while writing this skill
and as `true` in the Bre-B guide — expose the type conflict. Do not invent a
boolean.

For Bre-B QR, if the counterparty response `qr_amount` is not `-1`, the
Money Movement `amount` must match. Confirm `qr_amount` on the current
counterparty response schema.

## Lifecycle and how the client learns the outcome

Published PayOut path: `initiated` → (optional `pending_approval` when
`checker_approval` is true) → `processing` or `canceled` → `completed` /
`rejected` / `failed`. Funds are described as debited at `processing`.
`completed` can later move to `rejected`. Do not copy F*/R* tables; point to
Money Movement Statuses.

Learn the result from Money Movement status events (see `cobre-webhooks` for
delivery) plus `GET /money_movements/<mm_id>` (optional `nested`,
`sensitive_data`). The Money Movement guide says to avoid polling until a
terminal state. Notifications are best-effort.

## Reconciliation

See Payouts Reconciliation. Group ledger entries by
`metadata.money_movement_id`. Use `external_id` to match your records.
On-demand: list Money Movements and account transactions. Bulk: Money
Movement and Transaction reports (layout names on that page). Opening /
closing balance: daily balance history.

That page's terminal-state table says `failed` never creates a debit, while
`rejected` can be debit + offsetting credit. The Fast Pay / ACH and Bre-B
guides still describe `failed` during validation **or processing** after
stating that debit happens at `processing`. The same reconciliation page
later says debit + credit can be a reversed rejection **or failure**.
**Expose all three.** Do not pick one.

A `failed` Money Movement is the terminal outcome of that operation. Before creating a new payment, check the ledger (group by `metadata.money_movement_id`) for any debit or credit, and do not retry blindly. Reusing the same `idempotency` key inside its documented window returns the original response and does not execute the operation again (verify against the current OAS), so a new attempt is a new operation with a new key. Whether `external_id` must be unique is not documented: do not assume either way. This is engineering guidance, not a Cobre contract.

`completed` is not a permanently final balance state: a later reversal
transaction can appear under the same `money_movement_id`.

## Public conflicts to expose (do not resolve)

- Source: Fast Pay / ACH / Bre-B guides say a Colombia Cobre Balance. The
  Money Movement combination table allows ACH source `cc` / `ch` or
  `cobre_balance`. When-clauses in the OAS reviewed while writing this skill
  also mention a Connect Account.
- Bre-B over-limit: combination table says reroute through Fast Pay; Fast
  Pay / Bre-B guides say Fast Pay **or** ACH. QR cannot be split; over-limit
  QR ends `failed`. Look up the current Bre-B cap on the Bre-B pages — do
  not quote a figure here.
- Combination table destination for BRE-B is only `breb_key`. The OAS
  reviewed while writing this skill and the Bre-B guide include `breb_qr`.
  The response metadata when-clause in the OAS reviewed mentioned
  `breb_key` only; check the current OAS before assuming either way.
- Fast Pay / ACH product pages say “any amount”; `amount` had no min/max
  in the OAS reviewed while writing this skill; check the current OAS
  before assuming either way.
  Error Dictionary `MM005` and Testing Cases `MM003` disagree. Do not
  invent minima or maxima.

## Review checklist

1. **Sources** — Docs MCP reachable and refreshed? If not, stop.
2. **Routing** — Client trying to select Fast Pay vs ACH?
3. **Direction** — `source_id` account, `destination_id` counterparty?
4. **Metadata** — Variant matches current OAS when-clauses?
5. **Amounts** — Integer minor units only; no invented min/max/sign checks.
6. **Outcome** — HTTP success not treated as paid? Terminal states handled?
7. **Reconciliation** — `money_movement_id` grouping? `completed` not final?
8. **Conflicts** — Exposed rather than silently chosen?

## Do not assert

- That the client chooses Fast Pay vs ACH.
- A single Fast Pay SLA, Fast Pay/ACH min or max in COP, or a generic time
  to terminal state.
- One canonical source (always Cobre Balance, or always Connect / `cc` /
  `ch`).
- That Bre-B over-limit always goes through Fast Pay.
- That the Bre-B per-transaction maximum is unpublished. The Bre-B guide
  publishes a cap for that rail: when asked for it, read the current
  Bre-B guide and quote the figure with its source and the year it
  applies to, or, if you cannot read the page, say where it is published
  and do not state a number. This holds even if the user asks not to be
  sent to a page. No minimum is documented: say so, and never invent one.
- That `breb_qr` is not a valid destination, or that destination
  `cobre_balance` has a documented OAS metadata variant.
- That `split` is a boolean, or that QR can be split.
- That `category` accepts an invented enum.
- Codes `MM003`, header `idempotency-key` / `Idempotency-Key`, or a
  `reference` field on Colombia payout metadata.
- That Account Verification is required, or that it covers bank accounts /
  QR.
- Webhook event `money_movements.status.returned` as part of the API catalog
  (it appears only on the Portal subscription-management page).
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

- [Fast Pay & ACH](https://docs.cobre.com/fast-pay-ach-1886561m0)
- [Bre-B](https://docs.cobre.com/bre-b-1886562m0)
- [Money Movement](https://docs.cobre.com/money-movement-1899651m0)
- [Managing Counterparties](https://docs.cobre.com/managing-counterparties-1886556m0)
- [Account Verification](https://docs.cobre.com/account-verification-1886570m0)
- [Payouts Reconciliation](https://docs.cobre.com/payouts-reconciliation-2335732m0)
- [Money Movement Statuses](https://docs.cobre.com/money-movement-statuses-2032280m0)
- OAS (confirm current): `POST /money_movements`, `POST /counterparties`,
  `GET /money_movements/{mm_id}`, `POST /account_verifications`
