---
name: cobre-stablecoins-balances-payins-flow
description: >-
  Guide developers through Cobre stablecoin balances, self-custodian wallets,
  and on-chain payins into usd_stable or a USD global balance. Also use for
  reviewing those integrations. Use when the user asks how to create a
  usd_stable or copco balance, provision a wallet, or receive USDC/USDT.
  Do not use this skill for stablecoin payouts, on/off-ramp, StableFX,
  authentication, webhook HMAC, or transversal API conventions.
---

# Cobre Stablecoins — balances and payins

Client-facing guidance for **stablecoin balances**, **self-custodian
wallets**, and **on-chain payins**. A payin does **not** create a Money
Movement.

v0.1 may review and edit local application code and generate examples or tests.
Do not execute real Cobre API requests with customer credentials, ask the user
to paste secrets, or validate credentials by calling Cobre. Do not move funds.

Public facts below come from Cobre's public Stablecoins, balances, wallets,
payins, and notifications documentation. **Field names, required properties,
and schemas must be confirmed in the current Docs MCP before generating
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
- Amounts, pagination, versioning → `cobre-api-conventions`
- Payouts to `global_deposit_*` → `cobre-stablecoins-payouts-flow`
- On/off-ramp, StableFX, Rewards → `cobre-stablecoins-conversion-flow`
- Fiat Cross-Border / Generic MM → `cobre-cross-border-*`
- Tests → `cobre-stablecoins-testing`; certification prep →
  `cobre-stablecoins-readiness`

## Balances

Create via `POST /accounts` with `action: create`, `provider_id:
pr_stable_omnibus_cobre`, and `metadata.currency` `usd_stable` or `copco`
(verify against the current OAS). Managing Stablecoin Balances & Wallets:
creation is asynchronous (`connecting` → `connected`). That page tells
you to poll; it also says to subscribe instead of polling — **expose**.

`usd_stable`: on-chain wallets, payins, and payouts. `copco`: closed loop
— no wallets, no external payins/payouts; on/off-ramp with COP fiat and
rewards only (`cobre-stablecoins-conversion-flow`). The Stablecoins hub
groups COPco in this line; COPco & Rewards says COPco is **not** a
stablecoin — **expose**.

A default per-instance wallet count is published on the balances/wallets
page (KAM to raise it). Do not quote the figure.

## Wallets

Payins need an Account Reference `type: self_custodian_wallet` on the
destination balance (`POST /account_references`; verify against the
current OAS). Starts `processing` with empty `value`; then `enabled` with
the on-chain address. Share `<wallet_address>` only — never a real or
docs-example address or hash.

Whether a wallet address can be reused across customers or shown as a
fixed address, and how many wallets to create (for example one per
customer or per invoice), are not documented in the docs reviewed while
writing this skill. Do not answer "yes, you can" or recommend a layout as
if it were documented. What the docs do publish: a wallet can be
permanently blocked after a screening outcome (a new wallet is then
needed), deposits on an unsupported chain/token are not detected or
credited, and there is a per-instance cap on wallets (see the page; no
figure here). Ask the KAM and check the current Stablecoin Payins page
before assuming either way.

Create schema reviewed: required `source_id`, `type`, `metadata.chain`
(`evm_compatible`, `tron`, `stellar`). `alias` optional. Payins step 2
also names `token`. The OAS reviewed listed only `chain` as required —
**expose**; verify against the current OAS.

**Payin wallet networks** live on Managing Stablecoin Balances & Wallets
and Stablecoin Payins — do not copy the table. **Payout counterparty
chains** are a **different** list (`cobre-stablecoins-payouts-flow`). Do
not mix them.

Unsupported chain/token deposits are **not detected and not credited**.
Check the current Payins list before sharing `<wallet_address>`.

## Payins (no Money Movement)

Once the wallet is `enabled`, Cobre detects the on-chain deposit. Credits
a `global_credit` on the destination — not a Money Movement. Destinations
(Stablecoin Payins):

- `usd_stable` (`pr_stable_omnibus_cobre`) → credited as `usd_stable`
- `pr_global_cobre` → automatic conversion to USD fiat (`usd`) — **only**
  this destination. `copco` cannot receive external payins.

Managing Wallets describes provisioning on a `usd_stable` balance. Payins
and the Account Reference OAS describe `usd_stable` **or global**.
Virtual Balance Accounts lists `pr_global_cobre` payments “Only for cross
border”. **Expose**; do not pick.

Every deposit is filtered before credit. Published outcomes (Stablecoin
Payins — point there; do **not** explain how or why): credited; not
credited and the wallet permanently blocked; that deposit not credited
and the wallet remains operational. If blocked, create a new wallet to
keep receiving.

Learn via `self_custodian_wallet.status.*` (`processing`, `enabled`,
`failed`, `blocked`, `disabled`) and `accounts.balance.credit`
(`cobre-webhooks`) plus GET account / transactions. Do not copy
transaction-type codes; see Transaction Types.

## Public conflicts to expose (do not resolve)

- Wallets “`usd_stable` only” vs Payins/OAS “`usd_stable` or global”.
- Payins `chain` and `token` vs OAS required `chain` only.
- Payin `chain` values vs payout `counterparty_chain` values.
- `pr_global_cobre` “Only for cross border” vs payin auto-conversion.
- Hub groups COPco as Stablecoins vs Rewards “not a stablecoin”.
- Poll the account vs subscribe instead of polling.

## Testing

See `cobre-stablecoins-testing`. Never suggest mainnet funds as a test.

## Review checklist

1. **Sources** — Docs MCP reachable and refreshed? If not, stop.
2. **Currency** — `usd_stable` vs `copco` capabilities not mixed?
3. **Wallet** — `self_custodian_wallet`; chain vs token split exposed?
4. **Payin** — No MM generated? Unsupported pairs not credited?
5. **Address** — Placeholder `<wallet_address>` only?
6. **Events** — Wallet + balance credit, not MM keys?
7. **Networks** — Payin list not copied from payouts?

## Do not assert

- That a payin creates a Money Movement.
- That `copco` receives external payins or uses wallets.
- That payin `chain` values are the payout counterparty chains.
- How the deposit filter or a wallet block works, or why it applies.
- Wallet-count caps, confirmation times, or any address/hash (use
  `<wallet_address>`).
- That a wallet address can be reused or published as a fixed address
  for all customers, or that one wallet per customer or per invoice is
  the documented design.
- Network standards, wallet products or custody practices (for example
  token standards, hardware wallets, exchanges or seed-phrase advice) as
  Cobre guidance. They are not in the Cobre docs reviewed; do not present
  them as such.
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
- [Stablecoins with Cobre](https://docs.cobre.com/stablecoins-with-cobre-2270098m0)
- [Managing Stablecoin Balances & Wallets](https://docs.cobre.com/managing-stablecoin-balances-wallets-2262878m0)
- [Managing Virtual Balance Accounts](https://docs.cobre.com/managing-virtual-balance-accounts-cobre-balances-1886553m0)
- [Stablecoin Payins](https://docs.cobre.com/stablecoin-payins-2262879m0)
- [Create an Account Reference](https://docs.cobre.com/create-an-account-reference-26104719e0)
- [COPco & Rewards](https://docs.cobre.com/copco-rewards-2262874m0)
- [Notifications & Subscriptions](https://docs.cobre.com/notifications-subscriptions-1886572m0)
- [Transaction Types](https://docs.cobre.com/transaction-types-1886582m0)
- [Error Dictionary](https://docs.cobre.com/error-dictionary-1886577m0)
- OAS (confirm current): `POST /accounts`, `POST /account_references`
