---
name: cobre-cross-border-readiness
description: >-
  Guide developers through a public-docs readiness check for Cobre
  Cross-Border / FX before a certification session: questionnaire items for
  currency pairs, FX Quotes, Cross Border Money Movement, mandatory versus
  optional controls, live-demo on the pre-go-live instance, and public
  conflicts to disclose. Use when the user asks if a Cross-Border
  integration is ready to certify. This skill is not official Cobre
  certification and must not be presented as a pass/fail certificate.
---

# Cobre Cross-Border — readiness

A **readiness check** against public certification docs for Cross-Border FX
(quotes + CBMM). It is **not** official Cobre certification, not a score,
and not a substitute for the session with the KAM / Integration point of
contact.

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
- Amounts, `fx_rate` not minor units, API errors → `cobre-api-conventions`
- Quote + CBMM → `cobre-cross-border-fx-flow`
- Generic MM → `cobre-cross-border-generic-flow`
- Environments → `cobre-cross-border-testing`
- Local PayOut questionnaire → `cobre-payout-*-readiness`

StableFX, stable pairs, wallets, `global_deposit_*`, on-ramp and off-ramp
are **not covered here**. Questionnaire **Global** (crypto / FIAT top-ups)
is a different section.

## Official process (context only)

The Certification Process has: (1) questionnaire, in session or offline;
(2) live demo against QA, or a pre-go-live instance when the product is not
in QA; (3) a Cobre report with score, issues, and recommendations. The
client requests the session through the KAM / Integration contact. This
skill only prepares answers and a demo outline from **published** pages.

## Questionnaire items — Cross Border section

Confirm current wording on the Questionnaire page. **“Which Pay Out rails
have you implemented?”** in this section is **currency pairs**, not ACH,
SPEI, Fast Pay, or Bre-B.

- Which Pay Out rails have you implemented? Published values: `COP / USD`,
  `COP / MXN`, `MXN / COP`, `MXN / USD`, `USD / COP`, `USD / MXN`.
  **Mandatory.**
- Have you implemented FX Quotes? `true` / `false`. **Mandatory.**
- What type of FX Quotes are you using? `static_quotes` /
  `rolling_quotes`. **Mandatory.**
- What type of FX Quotation are you using? `source` / `destination`.
  **Optional.**
- Did you validate the FX quote duration? `true` / `false`. **Optional.**
  Public pages publish **more than one** duration — do not pick or quote
  any (`cobre-cross-border-fx-flow`).
- Have you implemented Cross Border Money Movement? `true` / `false`.
  **Mandatory.**
- Have you implemented idempotency-key? `true` / `false`. **Mandatory**
  (questionnaire **label**; header name is not this string — see
  conflicts).
- Have you implemented external-id? `true` / `false`. **Mandatory.**
- Are you validating that the source_id has sufficient funds? `true` /
  `false`. **Optional.**

**Not** Cross Border questionnaire rows in the docs reviewed while writing
this skill (check the current page before assuming either way): Generic
Money Movement, SWIFT/SEPA/CIPS/Fedwire, FX Alerts, Overdraft, Rate Lock,
CBP 24/7. Do not mark them questionnaire-mandatory. Local PayOut rails
are a **different** section (`cobre-payout-*-readiness`).

Webhooks & Polling (**optional**): signed notifications; which events
(includes `cross_border_money_movements.status.{status}`); polling.
CBMM/Money Movement guides tell you to subscribe; Notifications are
best-effort — **expose the tone conflict.** Do not mark webhooks as
questionnaire-mandatory. Auth rows → `cobre-auth`. Reports: optional;
layouts Money Movements / Transactions / Counterparties — no CB-specific
layout in Reports in the docs reviewed.

## Conflicts the readiness review must surface

- Questionnaire `idempotency-key` vs CBMM create header `idempotency` vs
  Create Fx Quotes idempotency **period** with **no** header on POST
  `/fx_quotes` in the OAS reviewed vs Testing Cases `idempotency_key`.
  Verify per endpoint; do not “fix” the name.
- Questionnaire `external-id` mandatory vs `external_id` not in
  `required` on the create-CBMM OAS reviewed.
- Questionnaire `account.balance.debit` / `account.balance.credit` vs
  Notifications `accounts.balance.debit` / `accounts.balance.credit`.
- CBMM event keys: questionnaire `{status}` vs Notifications catalog vs
  layout (`pending_funds`, `failed`) vs Subscription management. Do not
  prefer any one list: the Notifications catalog, the layout page and
  Subscription management publish different sets of CBMM statuses (the
  layout adds `pending_funds` and `failed`), so handle every status the
  lifecycle guide describes and confirm the current event list before
  relying on any of them.
- Quote validity: more than one published duration. Do not certify a
  single number.
- `QU003` market closed vs Off Market / CBP 24/7. Point at the Error
  Dictionary; do not copy codes.
- “Pay Out rails” here = FX pairs, not local payout rails.
- Nested quote examples: verify against the current OAS.

## Live demo environment

General Testing: Cross Border `false` in QA → **pre-go-live testing
instance** (`cobre-cross-border-testing`). Do not demo this product in
Colombia/Mexico QA. Do not use `change_mm_state` or
`account_test_transactions` as Cross Border demo fixtures (not published
for this product in the docs reviewed). Testing Cases has no FX/CBMM
rows in the docs reviewed — do not invent a numbered case list. Do not
quote quote-validity windows, quotas, or On Market hours in the demo
script; point at Create Fx Quotes.

A CBMM demo is **not** a bank payout (`cobre-payout-*` is a different
questionnaire section). Generic MM is **not** a Cross Border row.

## Suggested readiness questions (not a certificate)

Answer only from current public docs + the user's code:

1. Docs MCP reachable and refreshed?
2. Pairs claimed ⊆ questionnaire values? Not ACH/SPEI labelled as Cross
   Border rails?
3. FX Quotes implemented, with `static_quotes` / `rolling_quotes` named?
   Source vs destination quotation if they claim it?
4. Quote duration **validated** against the current pages, without
   hardcoding one figure?
5. CBMM via `/cross_border_money_movements` + `forex_quote_id`, not
   Generic `POST /money_movements`?
6. Current idempotency **header per endpoint**? `external_id` if they
   claim the mandatory row?
7. Optional funds check on `source_id` (static vs rolling) disclosed?
8. Events: catalog conflicts disclosed; GET used as fallback
   (`cobre-webhooks`)? Local delivery not claimed as CBMM?
9. Stablecoins / Generic / Alerts not marked as Cross Border
   questionnaire rows?

Items this check **cannot** certify because they are unpublished or
conflicted: commercial spreads/fees, credit/overdraft, off-hours policy
beyond `off_market` / `QU003`/`QU006`, a single quote duration, client
quota figures, Generic rails, FX Alerts, official pass/fail.

## Review checklist

1. **Framing** — Presented as readiness, not certification?
2. **MCP** — Current contract confirmed? Stop if MCP is down.
3. **Questionnaire** — Mandatory Cross Border rows mapped; rails = pairs?
4. **Conflicts** — Header names, `external_id`, event keys, quote
   validity, QA vs pre-go-live: all spoken?
5. **Demo env** — Pre-go-live, not QA? No payout fixtures?
6. **Scope** — Generic / Alerts / Stablecoins / local PayOut not sold as
   Cross Border rows?

## Do not assert

- That this skill, or any local checklist, is official certification.
- That Cross Border certifies in QA.
- That questionnaire Cross Border “rails” are ACH, SPEI, Fast Pay, or
  Bre-B.
- That Generic MM, FX Alerts, Overdraft, or Rate Lock are Cross Border
  questionnaire rows.
- That a CBMM is the final bank payout.
- That webhooks are questionnaire-mandatory.
- That one published CBMM event list is the complete one (the
  Notifications catalog, the layout and Subscription management differ),
  or that `pending_funds` and `failed` can be ignored.
- A single idempotency header name, or a single quote-validity duration.
- Spreads, fees, hours, quotas, minima, settlement times, or credit terms.
- That `change_mm_state` or `account_test_transactions` are demo fixtures
  for this product.
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
- [Testing Cases](https://docs.cobre.com/testing-cases-1886579m0)
- [Cross Border Payments with Cobre](https://docs.cobre.com/cross-border-payments-with-cobre-1859026m0)
- [Create Fx Quotes](https://docs.cobre.com/create-fx-quotes-1886567m0)
- [Create a Cross Boder Money Movement](https://docs.cobre.com/create-a-cross-boder-money-movement-1886568m0)
- [Create a Cross Border Money Movement](https://docs.cobre.com/create-a-cross-border-money-movement-25933255e0)
- [Create a FX Quote](https://docs.cobre.com/create-a-fx-quote-25933252e0)
- [Notifications & Subscriptions](https://docs.cobre.com/notifications-subscriptions-1886572m0)
- [Cross Border Money Movement layout](https://docs.cobre.com/cross-border-money-movement-1923576m0)
- [Error Dictionary](https://docs.cobre.com/error-dictionary-1886577m0)
- [Reports](https://docs.cobre.com/reports-1886571m0)
- OAS (confirm current): `POST /fx_quotes`, `POST /cross_border_money_movements`
