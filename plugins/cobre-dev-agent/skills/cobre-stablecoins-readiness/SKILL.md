---
name: cobre-stablecoins-readiness
description: >-
  Guide developers through a public-docs readiness check for Cobre
  Stablecoins before a certification session: questionnaire Global items
  (all optional), no StableFX/wallets/Rewards/filter rows, Cross Border as
  a different section, and public conflicts to disclose. Use when the user
  asks if a stablecoin integration is ready to certify. This skill is not
  official Cobre certification and must not be presented as a pass/fail
  certificate.
---

# Cobre Stablecoins — readiness

A **readiness check** against public certification docs for Stablecoins.
It is **not** official Cobre certification, not a score, and not a
substitute for the session with the KAM / Integration point of contact.

v0.1 may review local integration code and produce a checklist. Do not
execute real Cobre API requests with customer credentials, ask the user to
paste secrets, or call Cobre to validate the integration.

**Confirm every contract field in the current Docs MCP before marking an
item implemented.** The OpenAPI contract served by the Docs MCP can be older
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
unpublished certification steps.

Cross-reference, do not duplicate:

- Auth questionnaire items and token renewal → `cobre-auth`
- Signed notifications, HMAC, retries → `cobre-webhooks`
- Amounts, API errors → `cobre-api-conventions`
- Wallets / payins → `cobre-stablecoins-balances-payins-flow`
- Payouts → `cobre-stablecoins-payouts-flow`
- On/off-ramp / StableFX / Rewards → `cobre-stablecoins-conversion-flow`
- Environments → `cobre-stablecoins-testing`
- Fiat Cross Border questionnaire → `cobre-cross-border-readiness`

## Official process (context only)

The Certification Process has: (1) questionnaire, in session or offline;
(2) live demo against QA, or a pre-go-live instance when the product is not
in QA; (3) a Cobre report. Request the session through the KAM /
Integration contact. This skill only prepares answers from **published**
pages. General Testing has **no Stablecoins row** in the docs reviewed;
do **not** say the demo is on the Cross Border pre-go-live instance —
that inheritance is **not documented** in the docs reviewed while writing
this skill.

## Questionnaire items — Global section

Confirm current wording on the Questionnaire page. All three are
**optional**:

- Have you implemented crypto wallet top-ups? `true` / `false`
- Have you implemented FIAT top-ups? `true` / `false`
- Have you implemented Pay Out to crypto wallets? `true` / `false`

**Not** Global (or any) questionnaire rows in the docs reviewed while
writing this skill (check the current page before assuming either way):
StableFX, self-custodian wallets as a named row, COPco Rewards, deposit
filter / screening, `settlement_type`. Do not mark them
questionnaire-mandatory.

**Cross Border** is a **different** section (fiat pairs, FX Quotes, CBMM).
StableFX reuses quote+CBMM but is **not** a Cross Border questionnaire
row. Local PayOut rails (ACH/SPEI) are another section.

Webhooks & Polling (**optional**): the published event list includes
`money_movements.status.{status}` and
`cross_border_money_movements.status.{status}` and does **not** list
`self_custodian_wallet.status.*` (those keys **are** on Notifications).
**Expose** the gap. Do not prefer the questionnaire list over the catalog.
Do not mark webhooks questionnaire-mandatory. Auth → `cobre-auth`.

## Conflicts the readiness review must surface

- Questionnaire Global labels vs product names (payin vs “crypto wallet
  top-ups”; manual on/off-ramp vs “FIAT top-ups”; `stable_payout`/`global`
  vs “Pay Out to crypto wallets”). The questionnaire does not define which
  product each Global question covers: do not map the questions to products
  for the user, and ask the KAM how the three questions apply to what was
  implemented.
- Webhook keys: questionnaire omits wallet events that Notifications
  publishes.
- Payin wallet `chain` vs payout `counterparty_chain`; Payins `token` vs
  OAS `chain` only.
- Wallets on `usd_stable` only vs Payins/OAS `usd_stable` or global;
  `pr_global_cobre` “Only for cross border” vs stable payin/payout.
- Hub groups COPco as Stablecoins vs Rewards “COPco is not a stablecoin”.
- Rewards “FX Spot” vs StableFX `static_quote` only.
- `QU003` vs StableFX 24/7 text — point at Error Dictionary; do not copy
  codes. Quote header/validity → `cobre-cross-border-fx-flow`; do not
  re-resolve.
- CBMM event lists differ (catalog vs layout vs Subscription management)
  — handle statuses the lifecycle describes; confirm the current list.

## Suggested readiness questions (not a certificate)

1. Docs MCP reachable and refreshed?
2. Claims mapped to the three **optional** Global questions only — not
   sold as Cross Border rails or local PayOut?
3. Payin = no MM / `global_credit`? Payout and manual ramp = MM?
   StableFX = quote + CBMM, `static_quote`, `usd_stable`↔`copco` only?
4. `copco` not claimed for wallets or external payin/payout?
5. Payin vs payout network lists not merged? Unsupported deposits not
   credited (current Payins page)?
6. `verified` counterparties for payouts, without explaining verification?
7. Deposit-filter **outcomes** only, as published — not internals?
8. Webhooks: catalog vs questionnaire gap disclosed? GET as fallback?
9. Demo environment **not** assumed from Cross Border `false`?

Cannot certify: commercial spreads, reward %, wallet-count caps, amount
minima, quote duration, official pass/fail, QA/pre-go-live for this
product.

## Review checklist

1. **Framing** — Readiness, not certification?
2. **MCP** — Current contract? Stop if MCP is down.
3. **Questionnaire** — Three Global optionals only?
4. **Conflicts** — Networks, COPco naming, webhooks, env: spoken?
5. **Demo env** — Not inherited from Cross Border `false`?
6. **Scope** — No mainnet funds; no invented rows?

## Do not assert

- That this skill is official certification.
- That Global questions are mandatory, or that StableFX, wallets, Rewards,
  or the deposit filter are questionnaire rows.
- That a Global questionnaire question corresponds to a specific product
  (for example payins, manual on/off-ramp or payouts). The questionnaire
  does not say so in the docs reviewed.
- That StableFX is a Cross Border questionnaire row.
- That a payin creates a Money Movement, or that StableFX converts
  fiat↔stable or supports `rolling_quote`.
- That `copco` has wallets, external payins, or payouts.
- That one published CBMM or webhook list is complete.
- How the deposit filter or counterparty verification works.
- That Stablecoins is in QA, or that it inherits pre-go-live from Cross
  Border `false` (not documented in the docs reviewed while writing this
  skill).
- Spreads, fees, minima, wallet caps, quote durations, or reward %.
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

- [Certification Process](https://docs.cobre.com/certification-process-2047778m0)
- [Questionnaire](https://docs.cobre.com/questionnaire-2047804m0)
- [General Testing](https://docs.cobre.com/general-testing-1886578m0)
- [Stablecoins](https://docs.cobre.com/stablecoins-2262885m0)
- [Stablecoin Payins](https://docs.cobre.com/stablecoin-payins-2262879m0)
- [Stablecoin Payouts](https://docs.cobre.com/stablecoin-payouts-2262880m0)
- [StableFX](https://docs.cobre.com/stablefx-2262883m0)
- [COPco & Rewards](https://docs.cobre.com/copco-rewards-2262874m0)
- [Notifications & Subscriptions](https://docs.cobre.com/notifications-subscriptions-1886572m0)
- [Error Dictionary](https://docs.cobre.com/error-dictionary-1886577m0)
- OAS (confirm current): `POST /account_references`, `POST /money_movements`, `POST /fx_quotes`
