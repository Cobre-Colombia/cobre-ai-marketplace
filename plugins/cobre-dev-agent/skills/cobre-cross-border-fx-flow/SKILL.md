---
name: cobre-cross-border-fx-flow
description: >-
  Guide developers through Cobre Cross-Border FX: FX quotes (static and
  rolling), Cross Border Money Movements between two Cobre Balances, global
  balance funding, corridor combinations, lifecycle, and FX Rate Alerts.
  Also use for reviewing those integrations. Use when the user asks how to
  convert currencies with Cobre, create an FX quote, or create a Cross
  Border Money Movement. Do not use this skill for Generic Money Movements
  (SWIFT/SEPA/CIPS), local PayOut/PayIn delivery, Stablecoins, authentication,
  webhook HMAC, or transversal API conventions.
---

# Cobre Cross-Border — FX flow

Client-facing guidance for **FX quotes** and **Cross Border Money Movements**
(CBMM) between two Cobre Balances.

v0.1 may review and edit local application code and generate examples or tests.
Do not execute real Cobre API requests with customer credentials, ask the user
to paste secrets, or validate credentials by calling Cobre.

Public facts below come from Cobre's public Cross Border Payments, FX Quotes,
CBMM, balances, notifications, and FX Alerts documentation. **Field names,
required properties, and schemas must be confirmed in the current Docs MCP
before generating code.** The OpenAPI contract served by the Docs MCP can be
older than the live documentation. Confirm the current contract in the Docs
MCP before generating code.

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
- API errors vs operation outcomes, amounts, pagination, versioning,
  `fx_rate` **not** a minor-unit integer → `cobre-api-conventions`
- Generic MM (no quote; `POST /money_movements`) →
  `cobre-cross-border-generic-flow`
- Local delivery after conversion → `cobre-payout-co-*` / `cobre-payout-mx-*`
  (and local payin skills to **fund** a COP source)
- Tests → `cobre-cross-border-testing`; certification prep →
  `cobre-cross-border-readiness`

StableFX, stable pairs, wallets, `global_deposit_*`, on-ramp and off-ramp
are **not covered here**.

## Two products — do not mix

A **CBMM** converts between two Cobre Balances: quote first, then
`POST /cross_border_money_movements` with `forex_quote_id`. It does **not**
pay the beneficiary bank. Cross Border Payments with Cobre: a complete
USD → COP/MXN → bank flow needs a CBMM **plus** a local payout.

A **Generic Money Movement** is a different API (`POST /money_movements`),
**without** a quote. Do not generate it from this skill.

## Prerequisites and funding

Accounts must match the pair (Create a Cross Boder Money Movement). Global
USD: `action: create`, `provider_id: pr_global_cobre`, `metadata.currency`
(verify against the current OAS). Allowed currency `usd`; payments “Only
for cross border”. Fund your global Cobre Balance: bank instructions from
KAM/operations, currency USD; do not invent a window. Wallets are **not
covered here**. COP: Portal or R2P (`cobre-payin-co-*`).

## FX Quotes

`POST /fx_quotes` (GET list/one — verify against the current OAS). Quote
by `source_amount` **or** `destination_amount`. Types: `static_quote`
(pre-fund) and `rolling_quote` (CBMM then fund; `rolling_quote_details`
tiers + penalization). Confirm required fields and `type` default in the
current OAS. Amounts are integers; `fx_rate` is **not** a minor-unit
integer (`cobre-api-conventions`). Do not copy pair enums, fees, quotas,
or minima.

**Quote validity:** Create Fx Quotes and OAS `valid_until` text publish
**more than one duration**. Do not pick or write any. Tiers have their
own `valid_until`. Only the most recent quote (`last_quote`) can start a
CBMM. On Market / Off Market / `off_market`: that page — do not copy
schedules. Create Fx Quotes publishes an idempotency **period**; POST
`/fx_quotes` OAS reviewed showed **no** header. Verify per endpoint; do
not quote the period.

## Create the CBMM

`POST /cross_border_money_movements` with `source_id`, `destination_id`,
`forex_quote_id`, and `metadata` (verify against the current OAS). Header:
`idempotency` on that contract (questionnaire: `idempotency-key` — verify
per endpoint). `destination_description` / `external_id`: confirm required
in the current OAS; questionnaire marks `external-id` mandatory. Response
`type`: `cross_border`. GET list/one: verify against the current OAS.
Combinations (do not copy the table): USD source Global `cobre_balance`;
MXN source Mexico `clabe`; COP source Colombia `cobre_balance`.

## Lifecycle and how the client learns

Static: `initiated` → `processing` → `completed`; insufficient funds →
`failed`. Rolling: `initiated` → `pending_funds` → `processing` →
`completed`. Guides also show `pending_approval` / `canceled` when
`checker_approval` is true, and `processing` → `failed` / `rejected`.
`checker_approval` was **not** on the CBMM create schema in the docs
reviewed; whether Money Movement Approvals apply to CBMM is **not
documented** there — check the current OAS/page before assuming either
way.

Do not copy F*/R* or QU*/CBMM* tables. Point to Money Movement Statuses
and Error Dictionary **FX Quotes** / **Cross Border Money Movements**.
Whether Statuses `ALL` codes apply 1:1 to CBMM is **not documented** in
the docs reviewed; check that page before assuming either way.

Learn via `cross_border_money_movements.status.*` (`cobre-webhooks`) plus
GET one. Notifications are best-effort; Money Movement says subscribe and
avoid polling — **expose**. At `completed`: `cbmm_debit` / `cbmm_credit`
(Transaction Types). Reports: geo **All** layouts; no CB-specific layout
in the docs reviewed. Payouts Reconciliation is a payout `mm_`/`trx_`
guide — do not claim it as a CBMM contract.

## FX Rate Alerts

Optional. `POST /alerts` `type: fx_rate` (verify against the current OAS).
Conditions: `above`, `below`, `within_range`. Subscribe to
`alerts.fx_rate.triggered`. Do not copy thresholds. Alert pairs may not
match the quote enum — expose. Overview CBP 24/7 / Rate Lock / Overdraft
are conceptual; published quote types remain `static_quote` /
`rolling_quote`. Do not state prices, credit, or off-hours policy.

## Public conflicts to expose (do not resolve)

- Quote validity: more than one duration. Do not pick.
- Quote idempotency period (guide) vs no POST `/fx_quotes` header in the
  OAS reviewed. CBMM `idempotency` vs questionnaire `idempotency-key`.
  Verify per endpoint. Nested `valid_until` wording: verify against the
  current OAS.
- `external_id` optional on create-CBMM OAS reviewed vs questionnaire
  mandatory.
- CBMM events: Notifications vs layout (`pending_funds`, `failed`) vs
  Subscription management. FX Alerts guide `alerts.fx_rate.created` vs
  catalog `triggered`.
- `QU003` “market closed” vs Off Market / CBP 24/7. Do not copy codes.
- Alert pairs vs quote pairs. `pr_global_cobre` `usd` vs MX/CO sources.
- Questionnaire Cross Border “Pay Out rails” are **currency pairs**, not
  ACH/SPEI.

## Testing

For environments and public cases, see `cobre-cross-border-testing`. Do
not say Cross Border is in QA.

## Review checklist

1. **Sources** — Docs MCP reachable and refreshed? If not, stop.
2. **Product** — CBMM + quote, not Generic MM, not local payout?
3. **Accounts** — Published combination for the pair?
4. **Quote** — Validity conflicts exposed, no duration quoted?
5. **Header** — `idempotency` verified per endpoint?
6. **Events** — Catalog conflicts exposed; GET as source of truth?
7. **Delivery** — Local payout not generated as CBMM?
8. **Stablecoins** — Left out?

## Do not assert

- That a CBMM pays the beneficiary bank (local PayOut is separate).
- That Generic MM uses `/cross_border_money_movements` or needs a quote.
- That StableFX, stable pairs, wallets, or `global_deposit_*` are this flow.
- That Cobre quotes currency pairs beyond those published in the quote
  request (as reviewed: among USD, COP and MXN). The overview mentions
  other pairs through OTC without an API enum: do not present them as
  quotable through the API.
- A single quote-validity duration, webhook catalog, or idempotency header
  name (verify per endpoint).
- Spreads, fees, On Market hours, quotas, minima, settlement times, or
  credit/overdraft terms — point to the public page; do not quote figures.
- That `fx_rate` is a minor-unit integer (`cobre-api-conventions`).
- That `fx_rate` already includes, or excludes, Cobre's spread or fees.
  The quote response publishes `fees_breakdown` (and per-tier values for
  rolling quotes) separately, and how the rate and the fees relate is not
  documented in the docs reviewed while writing this skill. Read both from
  the response and check the current page; never present a price, spread
  or total cost from memory.
- A parser of `status.code` copied from local PayIn/PayOut without citing
  Money Movement Statuses **and** the CBMM gap.
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
- Prefer requiring the caller to supply the idempotency key on endpoints
  that document one (verify per endpoint), and keep it for retries of the
  same logical payment. If a default key is generated, create it once per
  logical payment and persist it, never once per call. This is engineering
  guidance, not a Cobre contract.

## Sources

- [Cross Border Payments](https://docs.cobre.com/cross-border-payments-1886566m0)
- [Cross Border Payments with Cobre](https://docs.cobre.com/cross-border-payments-with-cobre-1859026m0)
- [Create Fx Quotes](https://docs.cobre.com/create-fx-quotes-1886567m0)
- [Create a FX Quote](https://docs.cobre.com/create-a-fx-quote-25933252e0)
- [Create a Cross Boder Money Movement](https://docs.cobre.com/create-a-cross-boder-money-movement-1886568m0)
- [Create a Cross Border Money Movement](https://docs.cobre.com/create-a-cross-border-money-movement-25933255e0)
- [Fund your global Cobre Balance](https://docs.cobre.com/fund-your-global-cobre-balance-1886569m0)
- [Managing Virtual Balance Accounts](https://docs.cobre.com/managing-virtual-balance-accounts-cobre-balances-1886553m0)
- [FX Alerts](https://docs.cobre.com/fx-alerts-1968149m0)
- [Create Alert](https://docs.cobre.com/create-alert-28431523e0)
- [FX Alerts layout](https://docs.cobre.com/fx-alerts-2091781m0)
- [Notifications & Subscriptions](https://docs.cobre.com/notifications-subscriptions-1886572m0)
- [Cross Border Money Movement layout](https://docs.cobre.com/cross-border-money-movement-1923576m0)
- [Subscription management](https://docs.cobre.com/subscription-management-1886550m0)
- [Transaction Types](https://docs.cobre.com/transaction-types-1886582m0)
- [Money Movement Statuses](https://docs.cobre.com/money-movement-statuses-2032280m0)
- [Error Dictionary](https://docs.cobre.com/error-dictionary-1886577m0)
- [Reports](https://docs.cobre.com/reports-1886571m0)
- [Questionnaire](https://docs.cobre.com/questionnaire-2047804m0)
- OAS (confirm current): `POST /fx_quotes`, `POST /cross_border_money_movements`, `POST /alerts`
