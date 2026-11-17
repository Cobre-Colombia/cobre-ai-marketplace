---
name: cobre-cross-border-generic-flow
description: >-
  Guide developers through Cobre Generic Money Movements: payouts from a
  Global Cobre Balance to a generic counterparty over SWIFT, SEPA, or CIPS,
  without an FX quote. Also use for reviewing those integrations. Use when
  the user asks how to pay an international beneficiary from a global
  balance. Do not use this skill for Cross Border Money Movements, FX
  quotes, Stablecoins, local PayOut/PayIn, authentication, webhook HMAC,
  or transversal API conventions.
---

# Cobre Cross-Border — Generic Money Movement flow

Client-facing guidance for **Generic Money Movements**: a payout already in
the payout currency, from a Global Cobre Balance to a `type: generic`
counterparty, **without** an FX quote.

v0.1 may review and edit local application code and generate examples or tests.
Do not execute real Cobre API requests with customer credentials, ask the user
to paste secrets, or validate credentials by calling Cobre.

Public facts below come from Cobre's public Generic Money Movement,
counterparties, Money Movement, and transaction-type documentation.
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
- API errors vs operation outcomes, amounts, pagination, versioning →
  `cobre-api-conventions`
- FX quote + CBMM (`/cross_border_money_movements`) →
  `cobre-cross-border-fx-flow`
- Local PayOut Colombia / Mexico → `cobre-payout-co-*` / `cobre-payout-mx-*`
- Tests → `cobre-cross-border-testing`; certification prep →
  `cobre-cross-border-readiness`

StableFX, stable pairs, wallets, `global_deposit_*`, on-ramp and off-ramp
are **not covered here**.

## Two products — do not mix

Create a Generic Money Movement: unlike a CBMM, this flow **does not use
an FX Quote**. Funds are already in the payout currency. You fund a Global
Cobre Balance and pay a generic counterparty via `POST /money_movements`.
Do **not** send `forex_quote_id` or call `/cross_border_money_movements`.

Which payout currencies a Global Cobre Balance can hold, and how a balance
is funded in a currency other than USD, are not documented in the docs
reviewed while writing this skill: the balances guide lists `usd` as the
allowed currency, and the FX quote pairs published are only among USD, COP
and MXN. Do not propose converting to EUR (or any other currency) through
the FX flow, or a balance in that currency, unless the current docs say so.
Ask the KAM and check the current pages before assuming either way.

A CBMM converts between two Cobre Balances and does **not** pay the
beneficiary bank (`cobre-cross-border-fx-flow`, then local payout skills).

## Rails (expose the split; do not pick)

Create a Generic Money Movement publishes **SWIFT, SEPA, and CIPS**.
Managing Counterparties (Generic) also lists **Fedwire** as a generic
rail (`payment_code1` ABA; currency and country constraints on that page
— do not copy them). Fedwire was **not** in the Generic Money Movement
guide in the docs reviewed while writing this skill; check the current
pages before assuming either way. **Expose** the split; do not resolve it.

Money Movement’s combination table has a **GLOBAL** row (`global_deposit_le`
/ `global_deposit_np`) and a **Fedwire** row (`business`). Create a Money
Movement OAS also has MM `type` values including `swift`, `fedwire`, and
`global_pay_to_generic` (verify against the current OAS). Those are
**not** the same story as `type: generic` on the counterparty. Do not
merge them. `global_deposit_*` is **not covered here**.

USA `pr_usa_cobre` (FBO receiving details) is a different product. Do
not treat it as this payout unless the current page says they are the same.

## Prerequisites

Global Cobre Balance as `source_id` (Create a Generic Money Movement:
account type `cobre_balance`). Create: Managing Virtual Balance Accounts
`pr_global_cobre` (verify against the current OAS). Funding: Fund your
global Cobre Balance (fiat / bank-instruction path). Wallets are **not
covered here**.

Register the beneficiary first: `POST /counterparties` with `type:
generic` (verify against the current OAS). Managing Counterparties lists
identity, address, and `counterparty_payment_information`. Confirm which
fields are required in the current OAS. Routing published on that page
(do not copy the table): `rail`, `currency`, `bank_name`, `account_type`
(`checking` / `savings`), `account_number`, `bank_address.country`,
`payment_code1`; `payment_code2` required for `sepa` and `cips` only.
Counterparty idempotency concatenation for `generic` is on that page —
point there; do not copy it.

## Create the Money Movement

`POST /money_movements` with `source_id` = Global Cobre Balance,
`destination_id` = generic counterparty, integer `amount` in minor units,
and the **Generic** metadata variant (verify against the current OAS).
Create a Generic Money Movement: both `description` and `category` are
**required**. `category` is a string; **no published enum** in the docs
reviewed while writing this skill — check the current OAS before assuming
either way. Do not invent allowed values.

Idempotency header: verify per endpoint (`cobre-api-conventions`). Create
a Money Movement uses `idempotency` in other payout skills; questionnaire
Cross Border says `idempotency-key` (that section is FX/CBMM, not Generic
— see `cobre-cross-border-readiness`). `external_id`: confirm in the
current OAS.

Response `type` for this variant: verify against the current OAS (public
examples include `global_pay_to_generic`; other examples use `swift` /
`fedwire`). Do not pick one.

## Lifecycle and how the client learns

Create a Generic Money Movement: same payout state machine as other Money
Movements (`initiated` → `processing` → `completed` / `failed` /
`rejected`, optional `pending_approval`). Full machine: Money Movement
guide. Status codes: Money Movement Statuses — do not copy the table.

Subscribe to `money_movements.status.*` (`cobre-webhooks`), not
`cross_border_money_movements.status.*`. GET `/money_movements/<mm_id>`.
Notifications are best-effort; the Money Movement guide says subscribe and
avoid polling — **expose the tone conflict**.

At `completed`, the Generic guide says debit and credit transactions are
created. Transaction Types: Generic geography `global_pay_to_generic_debit`
/ `global_pay_to_generic_credit`. USA geography also lists `swift_*` and
`fedwire_*`. How those relate is **not documented** in the docs reviewed;
check the current page before assuming either way. **Expose**; do not pick.

## Public conflicts to expose (do not resolve)

- Generic MM guide rails (SWIFT, SEPA, CIPS) vs Managing Counterparties
  Generic (includes Fedwire).
- Money Movement table GLOBAL / Fedwire vs generic counterparty vs OAS MM
  `type` enum (`swift`, `fedwire`, `global_pay_to_generic`): verify
  against the current OAS.
- Transaction Types Generic vs USA SWIFT/Fedwire rows.
- `category` required with no published value list.
- Questionnaire Cross Border is FX quotes + CBMM, **not** Generic rails
  (`cobre-cross-border-readiness`).

## Testing

See `cobre-cross-border-testing`. Cross Border is `false` in QA. Do not
teach `change_mm_state` or `account_test_transactions` as fixtures for
this product. Testing Cases has Money Movement and Counterparty rows —
they are not Generic-specific.

## Review checklist

1. **Sources** — Docs MCP reachable and refreshed? If not, stop.
2. **Product** — `POST /money_movements`, no quote, not CBMM?
3. **Counterparty** — `type: generic`? Fedwire split exposed?
4. **Metadata** — `description` and `category` required; no invented enum?
5. **Events** — `money_movements.status.*`, not CBMM keys?
6. **Stablecoins / GLOBAL deposit** — Left out?
7. **Conflicts** — Exposed rather than silently chosen?

## Do not assert

- That Generic MM uses `/cross_border_money_movements` or requires an FX
  quote.
- That a Generic payout can be funded in a currency other than the ones
  the docs reviewed publish, or that an FX quote exists for it (for
  example USD to EUR).
- That a CBMM pays the beneficiary bank, or that this flow is a local
  ACH/SPEI payout.
- That Fedwire is, or is not, part of the Generic MM guide — expose the
  counterparties vs guide split.
- That `global_deposit_*`, StableFX, wallets, or USA FBO/`business`
  Fedwire are this flow unless the current page says so.
- A published `category` enum.
- A single Money Movement `type` string for generic payouts (verify
  against the current OAS).
- A single idempotency header name for every endpoint (verify per
  endpoint).
- Spreads, fees, hours, quotas, minima, or settlement times.
- That Generic SWIFT/SEPA/CIPS/Fedwire is a Cross Border questionnaire
  row.
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
- [Create a Generic Money Movement](https://docs.cobre.com/create-a-generic-money-movement-2289072m0)
- [Managing Counterparties](https://docs.cobre.com/managing-counterparties-1886556m0)
- [Create a Counterparty](https://docs.cobre.com/create-a-counterparty-25933229e0)
- [Create a Money Movement](https://docs.cobre.com/create-a-money-movement-25933236e0)
- [Money Movement | Create Metadata Type Generic](https://docs.cobre.com/money-movement-create-metadata-type-generic-16719286d0)
- [Money Movement](https://docs.cobre.com/money-movements-1899651m0)
- [Money Movement Statuses](https://docs.cobre.com/money-movement-statuses-2032280m0)
- [Fund your global Cobre Balance](https://docs.cobre.com/fund-your-global-cobre-balance-1886569m0)
- [Managing Virtual Balance Accounts](https://docs.cobre.com/managing-virtual-balance-accounts-cobre-balances-1886553m0)
- [Transaction Types](https://docs.cobre.com/transaction-types-1886582m0)
- [Notifications & Subscriptions](https://docs.cobre.com/notifications-subscriptions-1886572m0)
- [Error Dictionary](https://docs.cobre.com/error-dictionary-1886577m0)
- [Questionnaire](https://docs.cobre.com/questionnaire-2047804m0)
- OAS (confirm current): `POST /money_movements`, `POST /counterparties`
