---
name: cobre-stablecoins-conversion-flow
description: >-
  Guide developers through Cobre stablecoin conversions: manual on/off-ramp
  between own fiat and stable balances, StableFX between usd_stable and
  copco, and COPco Rewards. Also use for reviewing those integrations. Use
  when the user asks how to convert USD or COP into usd_stable or copco,
  or usd_stable into copco. Do not use this skill for on-chain payins,
  payouts to global_deposit counterparties, fiat Cross-Border corridors,
  authentication, webhook HMAC, or transversal API conventions.
---

# Cobre Stablecoins — conversions

Client-facing guidance for **manual on/off-ramp**, **StableFX**, and
**COPco Rewards**. These are not on-chain payins or payouts to external
wallets.

v0.1 may review and edit local application code and generate examples or tests.
Do not execute real Cobre API requests with customer credentials, ask the user
to paste secrets, or validate credentials by calling Cobre. Do not move funds.

Public facts below come from Cobre's public Stablecoin Funding, StableFX,
and COPco Rewards documentation. **Field names, required properties, and
schemas must be confirmed in the current Docs MCP before generating
code.** The OpenAPI contract served by the Docs MCP can be older than the
live documentation. Confirm the current contract in the Docs MCP before
generating code.

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
- Amounts, `fx_rate` not minor units, quote/CBMM header conflicts →
  `cobre-api-conventions` and `cobre-cross-border-fx-flow`
- Wallets / payins → `cobre-stablecoins-balances-payins-flow`
- Payouts to `global_deposit_*` → `cobre-stablecoins-payouts-flow`
- Fiat corridors (USD/COP/MXN) → `cobre-cross-border-fx-flow`
- Tests → `cobre-stablecoins-testing`; certification prep →
  `cobre-stablecoins-readiness`

## Three conversions — do not mix

| Product | What it converts | API |
|---|---|---|
| Manual on/off-ramp | Fiat ↔ same-market stable (`usd`↔`usd_stable`, COP↔`copco`) | `POST /money_movements` between **own** balances, **no** counterparty, **no** FX quote |
| Automatic USD on/off-ramp | Embedded in a global payin or payout | See payins / payouts skills — **USD corridor only** |
| StableFX | `usd_stable` ↔ `copco` only | `static_quote` then CBMM. **Not** fiat↔stable |

COP on/off-ramp always uses `copco`. Automatic ramp is **not** published
for COP.

## Manual on/off-ramp

Stablecoin Funding: both balances must exist and the source must be
funded. Cobre infers `on_ramp` or `off_ramp` from account types
(verify against the current OAS). USD: Global fiat ↔ `usd_stable`. COP:
`pr_col_cobre` ↔ `copco`. Metadata schema reviewed:
`description`; `settlement_type` `standard` \| `instant` (default
`standard`) **only** for COPco **off-ramp** — not on-ramp, not USD.
Windows and whether `instant` has a cost are on that page — do not quote
them.

Lifecycle: `initiated` → `processing` → `completed`. COP mint (on-ramp) or
burn (off-ramp): destination credit after on-chain confirmation; failure
reverses the source debit. Events: `money_movements.status.*`. Completed:
`onramp_*` / `offramp_*` transaction names on Transaction Types — do not
copy codes.

Transfer of COPco between the client's own balances is mentioned on COPco
& Rewards; a dedicated API guide was **not** in the docs reviewed while
writing this skill — check the current page before assuming either way.

## StableFX

StableFX API: only `usd_stable/copco` and `copco/usd_stable`. Only
`type: static_quote`. Both `source_id` and `destination_id` must be those
balance types. Execute with Create a Cross Border Money Movement and the
quote id. Converting **into** `copco` mints; **out** burns. Completed:
`cbmm_debit` / `cbmm_credit`.

Quote validity, `last_quote`, and the idempotency header →
`cobre-cross-border-fx-flow`. **Do not repeat or resolve** those
conflicts here. `fx_rate` is not a minor-unit integer; do not assert that
it includes or excludes spread (`cobre-cross-border-fx-flow`).

Overview: 24/7 with off-market pricing behavior. Error Dictionary `QU003`
(“market closed”) vs that overview — **expose**; do not pick. Rewards
calls this “FX Spot”; the API is `static_quote` — **expose**.

CBMM event-catalog vs layout (`pending_funds`, `failed`) → same split as
`cobre-cross-border-fx-flow` / readiness; do not resolve it here.

## COPco Rewards

COPco & Rewards: closed-loop COP balance; daily `reward_credit`. The page
says COPco is **not** a stablecoin; the Stablecoins hub still lists it —
**expose**. Accrual rules, enrollment, and any percentage live on that
page — do not copy them. No published “claim” POST in the docs reviewed.
`copco` has no wallets, external payins, or payouts.

## Public conflicts to expose (do not resolve)

- Hub groups COPco under Stablecoins vs Rewards “not a stablecoin”.
- Rewards “FX Spot” vs API `static_quote`.
- `QU003` vs StableFX 24/7 / off-market text.
- CBMM notification lists (point at Cross-Border skills; do not re-litigate).

## Testing

See `cobre-stablecoins-testing`. Never suggest mainnet funds as a test.

## Review checklist

1. **Sources** — Docs MCP reachable and refreshed? If not, stop.
2. **Product** — Manual MM vs automatic USD vs StableFX CBMM?
3. **COP** — Via `copco`? `settlement_type` only on COPco off-ramp?
4. **StableFX** — Pairs and `static_quote` only? Quote conflicts deferred?
5. **COPco** — Closed loop; not called a stablecoin without the split?
6. **No payout/payin** — External wallets not used here?

## Do not assert

- That StableFX converts fiat↔stable, or that it supports `rolling_quote`.
- That manual on/off-ramp uses `/cross_border_money_movements` or a quote.
- That automatic on/off-ramp exists for COP.
- That `copco` has wallets, external payins, or payouts.
- That COPco is, or is not, a stablecoin without exposing hub vs Rewards.
- Quote-validity durations, spreads, `instant` costs, settlement windows,
  or reward percentages — point to the page.
- How any compliance filter works.
- That Stablecoins is in QA, or that it inherits pre-go-live from Cross
  Border `false` (not documented in the docs reviewed while writing this
  skill).
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

- [Stablecoins](https://docs.cobre.com/stablecoins-2262885m0)
- [Stablecoin Funding (On/Off-Ramp)](https://docs.cobre.com/stablecoin-funding-onoff-ramp-2262882m0)
- [Stablecoin Funding overview](https://docs.cobre.com/stablecoin-funding-on-ramp-off-ramp-2262873m0)
- [Money Movement | Create Metadata Type On-Ramp / Off-Ramp](https://docs.cobre.com/money-movement-create-metadata-type-on-ramp-off-ramp-16518613d0)
- [StableFX](https://docs.cobre.com/stablefx-2262883m0)
- [StableFX overview](https://docs.cobre.com/stablefx-2262876m0)
- [COPco & Rewards](https://docs.cobre.com/copco-rewards-2262874m0)
- [Create a FX Quote](https://docs.cobre.com/create-a-fx-quote-25933252e0)
- [Create a Cross Border Money Movement](https://docs.cobre.com/create-a-cross-border-money-movement-25933255e0)
- [Transaction Types](https://docs.cobre.com/transaction-types-1886582m0)
- [Error Dictionary](https://docs.cobre.com/error-dictionary-1886577m0)
- [Notifications & Subscriptions](https://docs.cobre.com/notifications-subscriptions-1886572m0)
- OAS (confirm current): `POST /money_movements`, `POST /fx_quotes`, `POST /cross_border_money_movements`
