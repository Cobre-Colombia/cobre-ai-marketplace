---
name: cobre-payin-mx-flow
description: >-
  Guide developers through Cobre PayIn Mexico: incoming MXN collections via
  a CLABE-backed Cobre Balance, standing Virtual CLABEs, and Direct Link
  R2P SPEI (dynamic single-use CLABE), counterparties, money movements,
  payin reconciliation, and the Return API. Also use for reviewing or
  refactoring Mexico collection integrations. Use when the user asks how to
  receive money in Mexico, create a Direct Link SPEI request, or issue a
  standing CLABE. Do not use this skill for authentication, webhook HMAC,
  transversal API conventions, or SPEI payouts.
---

# Cobre PayIn Mexico — flow

Client-facing guidance for incoming MXN collections in Mexico.

v0.1 may review and edit local application code and generate examples or tests.
Do not execute real Cobre API requests with customer credentials, ask the user
to paste secrets, or validate credentials by calling Cobre.

Public facts below come from Cobre's public Direct Link, Virtual CLABEs,
CLABE-backed balance, Payins Reconciliation, and refund documentation.
**Field names, required properties, and schemas must be confirmed in the
current Docs MCP before generating code.** The OpenAPI contract served by
the Docs MCP can be older than the live documentation. Confirm the current
contract in the Docs MCP before generating code.

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
- SPEI **payouts** (outgoing) → `cobre-payout-mx-*`

## Products

Unlike Colombia (Checkout, PSE/Nequi/Bre-B, Cobre Keys), published Mexico collections are **SPEI**. Do not generate those Colombia products as MX.

1. **CLABE-backed Cobre Balance** — **standing CLABE**. Payer-initiated
   SPEI. **No Money Movement.**
2. **Virtual CLABEs** — Account References `virtual_clabe_accounts` (verify
   against the current OAS): more **standing CLABEs**. **No Money
   Movement.** Create: `POST /account_references`. `enabled` / `disabled`
   (DELETE): that guide. Limits: that page; do not quote figures here.
3. **Direct Link (R2P SPEI)** — a Money Movement plus a **dynamic
   single-use CLABE** in `metadata.virtual_account`. Do **not** call that
   a Virtual CLABE or say it is permanent. Enablement: KAM. `valid_until`
   windows: Direct Link page (do not quote). Post-expiry transfer: not
   documented in the docs reviewed while writing this skill; check the
   current page before assuming either way.

Named Accounts overlay identity. Overview: gated (KAM); API guide: coming soon — **expose**. Payouts → `cobre-payout-mx-flow`.

## Prerequisites

You need an active Mexico Cobre Balance. Provider: Managing Virtual
Balance Accounts — confirm the current `provider_id`. A balance used for
Virtual CLABEs cannot be deleted (Account Reference – Virtual CLABEs).
Direct Link only: create `r2p_spei` (verify against the current OAS)
**before** the Money Movement. Direction is the **inverse of payout**:
`source_id` = `<counterparty_id>`, `destination_id` = `<account_id>`.
Integrator owns payer UX.

## Create (Direct Link only)

Standing CLABE products do **not** call `POST /money_movements`. Share the
CLABE (balance or Account Reference `value`) and wait for `spei_credit`.
Direct Link: `POST /money_movements` with integer `amount` in minor units.
Confirm body fields and the `idempotency` header in the current OAS.
`external_id` was optional in the OAS reviewed while writing this skill
and mandatory on the Direct Link questionnaire row — expose that split.
Metadata variant (verify against the current OAS):
`r2p_direct_dynamic_clabes_request` (Direct Link payin MX, `r2p_spei` →
Cobre Balance geo `mex`). Required in the OAS reviewed: `r2p_rail`.
Lengths and `valid_until` format: verify against the current OAS; do not
quote them. Show the payer `metadata.virtual_account`.

## Lifecycle and how the client learns they were paid

Direct Link uses the published PayIn MM path. Do not copy F*/R* tables;
point to Money Movement Statuses. Learn the result from
`money_movements.status.*` (`cobre-webhooks`) plus
`GET /money_movements/<mm_id>`. Avoid polling until terminal (Money
Movement guide). Notifications are best-effort. A standing CLABE has
**no** MM: learn from `accounts.balance.credit` plus transactions — not
MM status events.

Reusing the same `idempotency` key inside its documented window returns
the original Direct Link response (verify against the current OAS). A new
attempt needs a new key. Engineering guidance, not a Cobre contract.

## Reconciliation

See Payins Reconciliation in México. Every `spei_credit` reconciles on
`metadata.account_reference` and **never** carries `money_movement_id`.
Direct Link: that value is the MM `virtual_account`. Standing CLABE: the
CLABE itself. `external_id` is on the Direct Link MM, not the credit.
`completed` is not a permanently final balance: a later Return API
`spei_debit` can appear.

## Refunds (this skill owns the flow)

Mexico refunds a payin `spei_credit` with `POST /money_movements_return`
(Processing Refunds in Mexico). Combinations and `metadata.description`:
that endpoint (verify against the current OAS). Creates `spei_return` and
`mm_return`. **No** `returned` status. Keep refund steps here;
`cobre-payout-mx-flow` only says this is not SPEI **payout** create.
Refund API (`POST /v1/refunds`): Mexico `spei_credit` / `r2p_spei`
**coming soon**. `/refunds` was not in the OAS reviewed while writing this
skill; check the current OAS before assuming either way. Do not generate
it as the live Mexico refund path.

## Public conflicts to expose (do not resolve)

- Named Accounts overview: gated (KAM). API guide: coming soon. Prose
  `subclient` vs JSON `subclient_id`. Display `[PSP Name] | [Merchant
  Name]` vs table `[PSP Acronym] - [Merchant Name]`. Named Accounts asks
  for `account.connected`; that key was not in the Notifications catalog
  in the docs reviewed while writing this skill; check the current page
  before assuming either way.
- Money Movement “Where to go next” lists Mexico payin as Virtual CLABEs
  only and omits Direct Link. Combination table source `r2p` / `r2p_breb`,
  not `r2p_spei`. Payins Reconciliation `type` `direct_link` vs Create MM
  OAS example `r2p_spei` in the contract reviewed. Check the current OAS
  before assuming either way.
- Response `valid until` vs request `valid_until`; OAS `format` vs
  datetime in the contract reviewed. Direct Link: integrator owns UX and
  also mentions a hosted experience. Expose; do not pick.
- R2P product page: Rejected = expired or abandoned. Money Movement PayIn
  path allows `rejected` → `completed`. Shared Statuses catalog — point
  there; do not invent a SPEI-only table.
- Refund API Mexico coming soon vs Return API as the published Mexico
  payin refund. Questionnaire `account.balance.*` vs catalog
  `accounts.balance.*`. OAS x-example `description_to_beneficiary_account`
  vs `description_to_payee` in the contract reviewed. Check the current
  OAS before assuming either way.
- Portal subscription-management lists `money_movements.status.returned`.
  Notifications, the event-layout page, and Processing Refunds in Mexico
  do **not**. Do not treat it as an API event unless current MCP/docs agree.

## Review checklist

1. **Sources** — Docs MCP reachable and refreshed? If not, stop.
2. **Product** — Standing CLABE vs Direct Link? Names not mixed?
3. **Direction** — Direct Link: source counterparty, destination account?
4. **MM** — No Money Movement generated for standing CLABE credits?
5. **Events** — MM status for Direct Link; `accounts.balance.credit` for standing CLABE?
6. **Reconciliation** — `account_reference`; no `money_movement_id` on `spei_credit`?
7. **Refund** — Return API owned here; Refund API not treated as live MX?
8. **Conflicts** — Exposed rather than silently chosen?

## Do not assert

- That Checkout, PSE, Nequi, Bre-B, or Cobre Keys are Mexico payins.
- That a standing CLABE or Virtual CLABE **product** credit creates a Money Movement.
- That `spei_credit` reconciles on `metadata.money_movement_id`.
- Calling Direct Link's dynamic single-use CLABE a “Virtual CLABE”, or
  saying that CLABE is permanent.
- What happens if the payer transfers to a dynamic single-use CLABE after
  it expires (not documented in the docs reviewed while writing this skill;
  check the current page before assuming either way).
- That `POST /v1/refunds` is available for Mexico.
- That `mm_return` or `r2p_spei` are PayOut destinations.
- That Named Accounts is unambiguously live.
- That `transfer_acc.*` notifies Virtual CLABEs.
- Webhook event `money_movements.status.returned` as part of the API catalog.
- Unpublished payin min/max amounts, a test CLABE, or a bank SLA.
- Auth, HMAC, error-envelope, pagination, `Cobre-Version`, or SPEI payout
  create (`cobre-payout-mx-flow`).
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
  for retries of the same Direct Link request. If a default key is generated,
  create it once per logical payment and persist it, never once per call.
  This is engineering guidance, not a Cobre contract.

## Sources

- [CLABE-backed Virtual Balances](https://docs.cobre.com/clabe-backed-virtual-balances-accounts-cobre-balances-1889781m0)
- [Account Reference – Virtual CLABEs](https://docs.cobre.com/account-reference-virtual-clabes-1886560m0)
- [Direct Link](https://docs.cobre.com/direct-link-1992193m0)
- [Request to Pay (R2P) Mexico](https://docs.cobre.com/request-to-pay-r2p-mexico-1992186m0)
- [Named Accounts in Mexico](https://docs.cobre.com/named-accounts-in-mexico-2225470m0)
- [Named Accounts (MX)](https://docs.cobre.com/named-accounts-mx-2240375m0)
- [Checkout](https://docs.cobre.com/checkout-1886557m0)
- [Money Movement](https://docs.cobre.com/money-movements-1899651m0)
- [Managing Virtual Balance Accounts](https://docs.cobre.com/managing-virtual-balance-accounts-1886553m0)
- [Payins Reconciliation in México](https://docs.cobre.com/payins-reconciliation-in-m%C3%A9xico-2335734m0)
- [Return a Money Movement](https://docs.cobre.com/return-a-money-movement-25933239e0)
- [Processing Refunds in Mexico](https://docs.cobre.com/processing-refunds-in-mexico-2202241m0)
- [Refund API](https://docs.cobre.com/refund-api-2410357m0)
- [Money Movement Statuses](https://docs.cobre.com/money-movement-statuses-2032280m0)
- [Notifications & Subscriptions](https://docs.cobre.com/notifications-and-subscriptions-1886572m0)
- [Money Movement (event layout)](https://docs.cobre.com/money-movement-1921909m0)
- [Subscription management](https://docs.cobre.com/subscription-management-1886550m0)
- [Questionnaire](https://docs.cobre.com/certification-questionnaire-2047804m0)
- OAS (confirm current): `POST /money_movements`, `POST /counterparties`, `POST /account_references`, `POST /money_movements_return`
