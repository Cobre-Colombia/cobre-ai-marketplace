---
name: cobre-stablecoins-payouts-flow
description: >-
  Guide developers through Cobre stablecoin payouts: sending from a
  usd_stable balance or a USD global balance to a verified
  global_deposit_le or global_deposit_np counterparty. Also use for
  reviewing those integrations. Use when the user asks how to pay a
  blockchain wallet in USDC/USDT. Do not use this skill for on-chain
  payins, wallets, on/off-ramp, StableFX, Generic SWIFT/SEPA/CIPS,
  authentication, webhook HMAC, or transversal API conventions.
---

# Cobre Stablecoins — payouts

Client-facing guidance for **on-chain payouts** to a verified Global
counterparty. This **does** create a Money Movement
(`POST /money_movements`). It is **not** a payin, not StableFX, and not
Generic MM.

v0.1 may review and edit local application code and generate examples or tests.
Do not execute real Cobre API requests with customer credentials, ask the user
to paste secrets, or validate credentials by calling Cobre. Do not move funds.

Public facts below come from Cobre's public Stablecoin Payouts, Global
payouts in stable, counterparties, and Money Movement documentation.
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
- Amounts, idempotency header name, pagination → `cobre-api-conventions`
- Wallets and payins → `cobre-stablecoins-balances-payins-flow`
- On/off-ramp and StableFX → `cobre-stablecoins-conversion-flow`
- Generic MM (SWIFT/SEPA/CIPS, no wallet CP) →
  `cobre-cross-border-generic-flow`
- Tests → `cobre-stablecoins-testing`; certification prep →
  `cobre-stablecoins-readiness`

`copco` does **not** support payouts (closed loop). Self-custodian wallets
are for **receiving** payins, not payout destinations.

## Two Money Movement types — do not mix with payin

Stablecoin Payouts: Cobre infers MM `type` from `source_id` (verify against
the current OAS):

- `stable_payout` — source `usd_stable` (`pr_stable_omnibus_cobre`)
- `global` — source USD Global fiat (`pr_global_cobre`), funded via
  automatic on-ramp. Chains, tokens, and counterparty detail: Global
  payouts in stable.

Both: `destination_id` is `global_deposit_le` or `global_deposit_np`.
Virtual Balance Accounts lists `pr_global_cobre` payments “Only for cross
border” while this flow pays from that balance — **expose**.

## Counterparty (must be `verified`)

`POST /counterparties` with `geo: global` and type `global_deposit_le` or
`global_deposit_np` (verify against the current OAS). Wait for
`verified` before paying. Do **not** explain how verification works; point
to Managing Counterparties and Stablecoin Payouts. Events:
`counterparty.status.processing` / `verified` / `failed`
(`cobre-webhooks`).

**Payout** `counterparty_chain` values are on Managing Counterparties
(Global) and Global payouts in stable — do not copy the table. They are
**not** the payin wallet `metadata.chain` list
(`cobre-stablecoins-balances-payins-flow`). **Expose**; do not merge.

LE metadata required in the OAS reviewed: `counterparty_fullname`,
`counterparty_chain`, `counterparty_wallet_address`,
`counterparty_description`, `counterparty_address` (verify against the
current OAS). NP required in that contract: `counterparty_firstname`,
`counterparty_lastname`, `counterparty_id_nationality`,
`counterparty_date_of_birth`, plus chain, wallet, description, address.
Use `<wallet_address>` only — never a real or example address.

Idempotency concatenation for these types is on Managing Counterparties —
point there; do not copy it.

## Create the payout

`POST /money_movements`: `source_id` = funded balance, `destination_id` =
counterparty, integer amount in minor units (verify against the current
OAS). Global payouts in stable (fiat-source variant) also documents
metadata `description` and `token`, `external_id`, and optional
`checker_approval`. A minimum amount is published on that page — do not
quote it. Idempotency: that page publishes a validity window; header name
verify per endpoint (`cobre-api-conventions`).

Lifecycle (Stablecoin Payouts): `initiated` → `processing` (broadcast) →
`completed` (`tracking_key` holds the on-chain hash — use
`<transaction_hash>`) or `failed` / `rejected` (funds credited back).
Optional `pending_approval` when `checker_approval` is true (Global
payouts in stable). Subscribe to `money_movements.status.*`, not
`cross_border_money_movements.*`. GET `/money_movements/<mm_id>`.

Do not copy Transaction Types codes. Names published there include
`stable_payout_debit` and `global_debit` (fiat source + automatic
on-ramp). Point at that page.

## Public conflicts to expose (do not resolve)

- Payin wallet `chain` enum vs payout `counterparty_chain` values.
- `pr_global_cobre` “Only for cross border” vs `global` stable payouts.
- Questionnaire “Pay Out to crypto wallets” is optional Global — not the
  local PayOut rails section (`cobre-stablecoins-readiness`).

## Testing

See `cobre-stablecoins-testing`. Never suggest mainnet funds as a test.

## Review checklist

1. **Sources** — Docs MCP reachable and refreshed? If not, stop.
2. **Product** — MM payout, not payin, not CBMM, not Generic?
3. **Source** — `usd_stable` vs `pr_global_cobre` type inferred?
4. **Destination** — `global_deposit_*` and `verified`?
5. **Chains** — Payout list, not payin wallet `chain`?
6. **Address** — `<wallet_address>` / `<transaction_hash>` only?
7. **copco** — Not used as payout source?

## Do not assert

- That a payin creates this Money Movement, or that payouts use
  `/cross_border_money_movements`.
- That Generic SWIFT/SEPA/CIPS or `type: generic` is `global_deposit_*`.
- That `copco` can pay out on-chain.
- That payin `chain` values are the payout networks.
- How counterparty verification works, or why a payout is blocked.
- Amount minima, idempotency-window figures, or real addresses/hashes.
- General blockchain facts, network standards or custody practices (for
  example that on-chain transfers cannot be reversed, token standards,
  wallet products or seed-phrase advice) as Cobre guidance or Cobre
  guarantees. They are not in the Cobre docs reviewed. What the docs do
  publish: a failed or rejected payout returns the debit to the balance,
  and the counterparty must be verified before paying. Tell the user to
  double-check the destination address and network with the beneficiary,
  without presenting that as a Cobre rule.
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
- [Stablecoin Payouts](https://docs.cobre.com/stablecoin-payouts-2262880m0)
- [Global payouts in stable](https://docs.cobre.com/global-payouts-in-stable-2053445m0)
- [Managing Counterparties](https://docs.cobre.com/managing-counterparties-1886556m0)
- [Create a Counterparty](https://docs.cobre.com/create-a-counterparty-25933229e0)
- [Create a Money Movement](https://docs.cobre.com/create-a-money-movement-25933236e0)
- [Money Movement](https://docs.cobre.com/money-movements-1899651m0)
- [Money Movement Statuses](https://docs.cobre.com/money-movement-statuses-2032280m0)
- [Managing Virtual Balance Accounts](https://docs.cobre.com/managing-virtual-balance-accounts-cobre-balances-1886553m0)
- [Notifications & Subscriptions](https://docs.cobre.com/notifications-subscriptions-1886572m0)
- [Transaction Types](https://docs.cobre.com/transaction-types-1886582m0)
- [Error Dictionary](https://docs.cobre.com/error-dictionary-1886577m0)
- [Questionnaire](https://docs.cobre.com/questionnaire-2047804m0)
- OAS (confirm current): `POST /money_movements`, `POST /counterparties`
