---
name: cobre-payin-co-standing-flow
description: >-
  Guide developers through Cobre PayIn Colombia collections that are not
  Checkout/Direct Link R2P: static Cobre Keys, Transfer-In account
  references, Nequi Direct Debit, payin reconciliation keys, and the
  Refund API (beta). Also use for reviewing those integrations. Use when
  the user asks how to collect COP via a Cobre Key, Transfer-In, or Direct
  Debit, or how to refund a Colombia payin. Do not use this skill for
  Checkout/Direct Link create, authentication, webhook HMAC, or payouts.
---

# Cobre PayIn Colombia — standing flow

Client-facing guidance for static Cobre Keys, Transfer-In, Direct Debit,
and Colombia payin refunds.

v0.1 may review and edit local application code and generate examples or tests.
Do not execute real Cobre API requests with customer credentials, ask the user
to paste secrets, or validate credentials by calling Cobre.

Public facts below come from Cobre's public Cobre Keys, Transfer-In, Direct
Debit, Payins Reconciliation, and Refund API documentation. **Field names,
required properties, and schemas must be confirmed in the current Docs MCP
before generating code.** The OpenAPI contract served by the Docs MCP can
be older than the live documentation. Confirm the current contract in the
Docs MCP before generating code.

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
- API errors vs operation outcomes, amounts, pagination, versioning →
  `cobre-api-conventions`
- Checkout / Direct Link R2P → `cobre-payin-co-r2p-flow`
- Colombia **payouts** → `cobre-payout-co-*`; Mexico Return API → `cobre-payin-mx-flow`

## Products

Never use “Virtual CLABE” for Colombia. Keep static vs dynamic Bre-B keys
distinct from `cobre-payin-co-r2p-flow`.

1. **Cobre Keys (static Bre-B key)** — permanent, reusable, **no Money
   Movement**. Create: `POST /accounts/<acct_id>/keys`. Creation is
   asynchronous (`processing` → `registered` before `key_value`). Limits:
   Cobre Keys page; the maximum is stated inconsistently — check the
   current page; do not quote a figure.
2. **Transfer-In** — standing Colombian bank account (Account Reference
   `transfer_acc`, verify against the current OAS). **No Money Movement.**
   Account-count limit and ACH cycles: Transfer-In page; do not quote
   them. Account owner is Cobre (Pexto Pagos NIT on that page).
3. **Direct Debit (Nequi)** — register the counterparty (`type` `nequi`),
   then a `direct_debit` Money Movement. Credit `dd_credit`.

## Prerequisites

Active Colombia Cobre Balance. Provider: Managing Virtual Balance Accounts
— confirm the current `provider_id`.

Direct Debit: create a counterparty first. Published PayIn types disagree
(`ch` / `dp` vs `CC` / `CH` / `DP` vs MM combination `cc` / `ch` /
`cobre_balance` vs OAS `cc` / `ch` / `dp`) — **expose**; verify against
the current OAS. Creating a counterparty only registers data.

## Create

Confirm schemas in the current OAS. Idempotency header name is **not**
universal: create-MM uses `idempotency`; Create a Key documented **none**
in the docs reviewed while writing this skill — verify per endpoint.

**Cobre Key:** `POST /accounts/<acct_id>/keys` (`key_config`, optional
`holder` — verify against the current OAS). Share `key_value` only once
`registered`. Block/reactivate and cancel: that guide. No MM.

**Transfer-In:** `POST /account_references` with type `transfer_acc`
(verify against the current OAS). `provider_id` on that schema: verify;
do not invent a bank. Share the account number when the reference is
enabled. No MM.

**Direct Debit:** `POST /counterparties/{id}/direct_debit_registrations`
with `type` `nequi` (verify against the current OAS). Wait until
`registered`. Then `POST /money_movements` with metadata variant
`direct_debit_request` (verify against the current OAS). Direction:
`source_id` = `<counterparty_id>`, `destination_id` = `<account_id>`.
Integer `amount` in minor units.

## Lifecycle and how the client learns they were paid

Do not copy F*/R* or DR* tables; point to Money Movement Statuses and the
Direct Debit page.

- **Direct Debit:** `money_movements.status.*` plus
  `GET /money_movements/<mm_id>`. Avoid polling until terminal.
- **Cobre Keys:** `cobre_keys.status.*` for the key; collection via
  `accounts.balance.credit` — **not** MM status events.
- **Transfer-In:** `transfer_acc.status.processing` / `.enabled` /
  `.failed` for the reference; collection via `accounts.balance.credit`.

DDR status events appear on Direct Debit Registration; they were **not**
in the Notifications catalog in the docs reviewed while writing this
skill (`RD006` vs `DR006`). Check the current pages before assuming either way.

## Reconciliation

See Payins Reconciliation in Colombia.

- Direct Debit (and other MM-backed payins): `metadata.money_movement_id`.
- Static Cobre Key: `breb_credit` with `metadata.key_value`. **No** `money_movement_id`.
- Transfer-In: `transfer_credit` with `metadata.account_reference`. **No** `money_movement_id`.

Do **not** interchange `key_value` and `account_reference`. Branch on
Transaction `type` first. `completed` is not a permanently final balance
if a later refund debit appears.

## Refunds (this skill owns the flow)

Published Colombia path: Refund API (`POST /v1/refunds`), **beta** —
enable with the KAM. Transfer-In is **not** eligible. Return API
(`POST /money_movements_return`) is Mexico (`cobre-payin-mx-flow`).

Processing Refunds in Colombia was **not found** in the docs reviewed
while writing this skill and was not in the current docs menu. Do **not**
assert that a Colombia refund is a new payout, or that it is not.
**Field conflict — expose, do not pick:** Refund API prose uses
`money_movement_id` or `transaction_id`; Create a Refund uses
`original_payin_id`. `/refunds` was not in the OAS reviewed while writing
this skill; the Create a Refund page exists — check the current OAS.
Create a Refund header: `Idempotency-Key` (verify per endpoint).

## Public conflicts to expose (do not resolve)

- Cobre Key maximum is stated inconsistently; check the current page. Do
  not quote a figure. Questionnaire Static BreB Key row vs Keys guide:
  same — check the current pages.
- Checkout “Idempotency” heading describes Cobre Key creation (Keys page
  says creation has none).
- Direct Debit counterparty types disagree across Counterparties, Direct
  Debit, Money Movement combination table, and OAS — verify against the
  current OAS.
- Money Movement “Where to go next” omits Direct Debit and Transfer-In.
- Reconciliation: dedicated Refunds API vs a Processing Refunds page that
  was not found in the docs reviewed.

## Review checklist

1. **Sources** — Docs MCP reachable and refreshed? If not, stop.
2. **Product** — Static Cobre Key vs dynamic Direct Link key vs Transfer-In?
3. **MM** — Keys and Transfer-In create no MM? Direct Debit does?
4. **Events** — MM status only for Direct Debit?
5. **Reconcile** — `key_value` vs `account_reference` vs `money_movement_id`?
6. **Refund** — Refund API beta; Transfer-In excluded; field names exposed?
7. **Conflicts** — Exposed rather than silently chosen?

## Do not assert

- That SPEI, Virtual CLABEs, or the Return API are Colombia payins.
- That a static Cobre Key or Transfer-In credit creates a Money Movement.
- That `breb_credit` / `transfer_credit` reconcile on `money_movement_id`.
- Interchanging `metadata.key_value` and `metadata.account_reference`.
- Calling a static Cobre Key a Virtual CLABE, or a Direct Link dynamic key.
- A single key-per-balance maximum (the maximum is stated inconsistently).
- That Transfer-In is refundable via the Refund API.
- That `POST /money_movements_return` is the Colombia refund path.
- That a Colombia refund is a new payout (or that it is not) from a
  Processing Refunds page that was not found.
- One refund body field name without exposing `original_payin_id` vs
  `money_movement_id` / `transaction_id`.
- That the Refund API is generally available (it is beta; KAM).
- A single idempotency header name for every endpoint (verify per
  endpoint).
- Auth, HMAC, error-envelope, pagination, `Cobre-Version`, Checkout /
  Direct Link create, or SPEI payout create.
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

- [Cobre Keys with Bre-B](https://docs.cobre.com/cobre-keys-with-bre-b-1886558m0)
- [Create a Key](https://docs.cobre.com/create-a-key-25933247e0)
- [Transfer-In](https://docs.cobre.com/transfer-in-2117492m0)
- [Direct Debit](https://docs.cobre.com/direct-debit-1914109m0)
- [Register a Counterparty for Direct Debit](https://docs.cobre.com/register-a-counterparty-for-direct-debit-25933233e0)
- [Direct Debit Registration](https://docs.cobre.com/direct-debit-registration-2244399m0)
- [Managing Counterparties](https://docs.cobre.com/managing-counterparties-1886556m0)
- [Managing Virtual Balance Accounts](https://docs.cobre.com/managing-virtual-balance-accounts-1886553m0)
- [Money Movement](https://docs.cobre.com/money-movements-1899651m0)
- [Money Movement Statuses](https://docs.cobre.com/money-movement-statuses-2032280m0)
- [Payins Reconciliation in Colombia](https://docs.cobre.com/payins-reconciliation-in-colombia-1908673m0)
- [Refund API](https://docs.cobre.com/refund-api-2410357m0)
- [Create a Refund](https://docs.cobre.com/create-a-refund-43344629e0)
- [Notifications & Subscriptions](https://docs.cobre.com/notifications-and-subscriptions-1886572m0)
- [Questionnaire](https://docs.cobre.com/certification-questionnaire-2047804m0)
- OAS (confirm current): `POST /accounts/{acct_id}/keys`, `POST /account_references`, `POST /money_movements`, `POST /counterparties/{id}/direct_debit_registrations`
