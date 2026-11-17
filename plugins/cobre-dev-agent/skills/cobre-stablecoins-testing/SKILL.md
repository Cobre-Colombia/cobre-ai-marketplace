---
name: cobre-stablecoins-testing
description: >-
  Guide developers through public Cobre testing for Stablecoins: General
  Testing has no Stablecoins QA row; Testing Cases has no wallet, on/off-ramp,
  stable payout, or StableFX rows; payout fixtures do not apply. Also use
  when reviewing stablecoin test plans. Use when the user asks how to test
  wallets, payins, payouts, on/off-ramp, or StableFX. Do not use this skill
  for production execution, authentication, or webhook HMAC.
---

# Cobre Stablecoins — testing

Client-facing guidance for **published** testing of stablecoin balances,
wallets, payins, payouts, on/off-ramp, and StableFX.

v0.1 may review and edit local test code and generate examples or fixtures.
Do not execute real Cobre API requests with customer credentials, ask the user
to paste secrets, or call Cobre to validate credentials. Never suggest
operating with real funds on a mainnet as a test.

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
- Amount encoding, `fx_rate` not minor units → `cobre-api-conventions`
- Wallets / payins → `cobre-stablecoins-balances-payins-flow`
- Payouts → `cobre-stablecoins-payouts-flow`
- On/off-ramp and StableFX → `cobre-stablecoins-conversion-flow`
- Cross Border QA `false` / pre-go-live (fiat CBMM) →
  `cobre-cross-border-testing`

## No published Stablecoins QA row

General Testing Availability lists Country / Solution rows including
**Cross Border** = `false` (pre-go-live for products marked `false`).
**Stablecoins is not a row** in the docs reviewed while writing this
skill; check the current page before assuming either way. Do **not**
assert that Stablecoins inherits that pre-go-live instance from Cross
Border `false` — that is **not documented** in the docs reviewed while
writing this skill.

Do not invent a host. Require `COBRE_BASE_URL`. Ask the KAM / Account
Manager which instance they were given.

## What is not a published fixture here

`POST /account_test_transactions` and `POST /change_mm_state` appear under
General APIs / **Payout** Solutions for QA. They were **not** published for
Stablecoins in the docs reviewed while writing this skill; check the
current page before assuming either way. Do **not** teach them as wallet,
payin, on/off-ramp, `stable_payout`, or StableFX fixtures.

Testing Cases lists Authentication, Accounts, Counterparties, and Money
Movement. It had **no** wallet, on/off-ramp, stable payout, or StableFX
rows in the docs reviewed while writing this skill; check the current page
before assuming either way. Do not invent those cases. Generic MM/CP/Auth
rows are not Stablecoin-specific.

## What General Testing still asks you to validate

Token handling (`cobre-auth`); creating the accounts (and counterparties,
if payouts) the flow needs; allowed `source_id` / `destination_id`;
amount in the smallest currency unit (`fx_rate` is **not** that);
idempotency (verify per endpoint); errors; webhooks plus GET. Happy and
unhappy paths; Error Dictionary — do not copy tables.

## Suggested public paths (not a catalog)

Split by **product**. Never use mainnet funds as a test.

**Balances / wallets / payins:** create `pr_stable_omnibus_cobre`;
`self_custodian_wallet` (verify `chain` vs `token` in the current OAS).
Wait for `enabled`. Do not share unsupported chain/token
`<wallet_address>` — Payins: those deposits are not detected or credited.
Payin creates **no** MM; expect `global_credit` and
`self_custodian_wallet.status.*`. Do not copy screening internals; if you
assert outcomes, only the three published results on that page.

**Payouts:** verified `global_deposit_*`; `POST /money_movements`. Events
`money_movements.status.*`. Payout chains ≠ payin `chain` — expose.

**On/off-ramp:** own balances only; COP via `copco`; `settlement_type` only
on COPco off-ramp.

**StableFX:** `static_quote` + CBMM between `usd_stable` and `copco` only.
Quote duration / idempotency header → `cobre-cross-border-fx-flow`; do
not hardcode a window.

Unsupported: `copco` wallets, external payins/payouts, rolling StableFX,
fiat↔stable via StableFX.

## Review checklist

1. **Docs MCP** — Reachable and refreshed? If not, stop.
2. **Host** — From config, not hardcoded. QA/pre-go-live **not assumed**?
3. **Fixtures** — `change_mm_state` / `account_test_transactions` unused?
4. **Catalog** — No invented Testing Cases rows?
5. **Mainnet** — No real funds suggested?
6. **Product** — Payin without MM vs payout/ramp MM vs StableFX CBMM?
7. **Secrets** — Placeholders only (`<wallet_address>`).

## Do not assert

- That Stablecoins is available in QA.
- That Stablecoins inherits the Cross Border pre-go-live instance (not
  documented in the docs reviewed while writing this skill).
- That Testing Cases publishes wallet, on/off-ramp, stable payout, or
  StableFX rows.
- That `account_test_transactions` or `change_mm_state` are Stablecoin
  fixtures.
- That a payin creates a Money Movement, or that StableFX converts
  fiat↔stable or supports `rolling_quote`.
- That `copco` has wallets, external payins, or payouts.
- How the deposit filter works.
- Unpublished hosts, waits, minima, or quote durations.
- Operating with real mainnet funds as a test.
- A single idempotency header name (verify per endpoint).
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
- Prefer requiring the caller to supply the idempotency key on endpoints
  that document one (verify per endpoint), and keep it for retries of the
  same logical payment. If a default key is generated, create it once per
  logical payment and persist it, never once per call. This is engineering
  guidance, not a Cobre contract.

## Sources

- [General Testing](https://docs.cobre.com/general-testing-1886578m0)
- [Testing Cases](https://docs.cobre.com/testing-cases-1886579m0)
- [Certification Process](https://docs.cobre.com/certification-process-2047778m0)
- [Stablecoin Payins](https://docs.cobre.com/stablecoin-payins-2262879m0)
- [Stablecoin Payouts](https://docs.cobre.com/stablecoin-payouts-2262880m0)
- [Stablecoin Funding (On/Off-Ramp)](https://docs.cobre.com/stablecoin-funding-onoff-ramp-2262882m0)
- [StableFX](https://docs.cobre.com/stablefx-2262883m0)
- [Error Dictionary](https://docs.cobre.com/error-dictionary-1886577m0)
- [Notifications & Subscriptions](https://docs.cobre.com/notifications-subscriptions-1886572m0)
- OAS (confirm current): `POST /account_references`, `POST /money_movements`, `POST /fx_quotes`
