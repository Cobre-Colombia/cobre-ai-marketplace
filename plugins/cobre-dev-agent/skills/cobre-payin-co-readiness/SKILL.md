---
name: cobre-payin-co-readiness
description: >-
  Guide developers through a public-docs readiness check for Cobre PayIn
  Colombia before a certification session: questionnaire items for Checkout,
  Direct Link, Static BreB Key, and Direct Debit, mandatory versus optional
  controls, live-demo environment (QA vs pre-go-live), and public conflicts
  to disclose. Use when the user asks if a Colombia collection integration
  is ready to certify. This skill is not official Cobre certification and
  must not be presented as a pass/fail certificate.
---

# Cobre PayIn Colombia — readiness

A **readiness check** against public certification docs for incoming COP
collections. It is **not** official Cobre certification, not a score, and
not a substitute for the session with the KAM / Integration point of
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
- Amounts, API errors → `cobre-api-conventions`
- Checkout / Direct Link → `cobre-payin-co-r2p-flow`
- Keys / Transfer-In / Direct Debit / Refund API → `cobre-payin-co-standing-flow`
- PayOut Colombia questionnaire → `cobre-payout-co-readiness`

## Official process (context only)

The Certification Process has: (1) questionnaire, in session or offline;
(2) live demo against QA, or a pre-go-live instance when the product is not
in QA; (3) a Cobre report with score, issues, and recommendations. The
client requests the session through the KAM / Integration contact. This
skill only prepares answers and a demo outline from **published** pages.

## Questionnaire items that apply to incoming payments

PayIn section (confirm current wording on the Questionnaire page):

- Which Pay In solution have you implemented? Colombia values:
  **`Checkout (CO)`**, **`Direct Link (CO & MX)`**, **`Static BreB Key
  (CO)`** (plus Mexico Virtual Clabes on the same question). **Mandatory.**
  Do not mark Virtual Clabes or SPEI as Colombia work.
- Which Payment Methods have you implemented? Colombia values: **`PSE
  (CO)`**, **`Bancolombia (CO)`**, **`Nequi (CO)`**, **`BreB (CO)`**.
  **Mandatory.**
- Checkout: API Counterparty — **optional.** Save `checkout_id` —
  **optional.** `external_id` — **mandatory.**
- Direct Link: API Counterparty — **mandatory.** `external_id` —
  **mandatory.**
- Static BreB Key: multiple Cobre Balances with one Bre-B Key each —
  **mandatory** (the Keys-guide maximum is stated inconsistently; check
  the current pages; do not quote a figure). Cancel/stop — **optional.**

Direct Debit is a **separate** section: API Counterparty — **mandatory.**
DDR API — **mandatory.** Validate `registered` — **optional.**
`external-id` — **mandatory.**

Transfer-In, Refund API, and Subclients were **not** PayIn questionnaire
rows in the docs reviewed while writing this skill; check the current page
before assuming either way. Account Connect CO banks are a **different**
section.

Webhooks & Polling (optional): signed notifications; which events;
polling. Checkout/Direct Link “strongly recommend[s]” webhooks; Money
Movement says you must subscribe — **expose the tone conflict.** Do not
mark webhooks as questionnaire-mandatory. Auth rows → `cobre-auth`.

## Conflicts the readiness review must surface

- Questionnaire `account.balance.*` vs Notifications `accounts.balance.*`.
  Questionnaire event list omits `refund.status.*`, `transfer_acc.*`,
  `subclient.*`, and DDR keys that appear on other pages.
- `external_id` optional in the create-MM OAS reviewed vs mandatory on
  Direct Link / Checkout rows. Create-MM header `idempotency` vs
  questionnaire `idempotency-key` vs Create a Refund / Create a Subclient
  `Idempotency-Key`. Verify per endpoint.
- Subclient overlay in active development: `MM057` vs `MM034`; coming
  soon vs OAS field present; Checkout `CHK016`. Do not mark it as live.
- Refund API beta vs Processing Refunds in Colombia **not found** in the
  docs reviewed. Field names `original_payin_id` vs `money_movement_id` /
  `transaction_id`. Transfer-In not refundable. Return API is Mexico.
- Checkout rails `breb_*` vs OAS `breb`; Direct Link integrator UX vs
  hosted experience; MM `type` `direct_link` vs `r2p` / `r2p_breb`.
  x-example names and `valid_until` format: verify against the current OAS.

## Live demo environment

General Testing: Colombia `true` in QA. PayIn matrix: Direct Link PSE and
Bancolombia; Checkout full path Bancolombia only. **“Nequi and BreB are
not available”** applies to that PayIn matrix (Direct Link and Checkout),
not to other products. Cobre Keys is `false` → **pre-go-live**. Transfer-In
and Direct Debit: **not documented** on the matrix in the docs reviewed.
`account_test_transactions` is listed for Colombia. `change_mm_state` is
a **Payout** solution — not a PayIn demo fixture. Do not invent a numbered
PayIn CO case list.

## Suggested readiness questions (not a certificate)

Answer only from current public docs + the user's code:

1. Docs MCP reachable and refreshed?
2. Solutions claimed ⊆ Checkout / Direct Link / Static BreB Key, with
   Virtual CLABE not presented as Colombia?
3. Checkout MM only after the payer pays? Direct Link direction source CP
   / dest account? Static Cobre Key and Transfer-In create **no** MM?
4. Current idempotency header **per endpoint**? `external_id` if Checkout
   or Direct Link is claimed?
5. Events: MM status for Checkout/Direct Link/Direct Debit;
   `accounts.balance.credit` plus `cobre_keys.status.*` or
   `transfer_acc.status.*` otherwise? No Virtual CLABE terminology?
6. Reconciliation: `money_movement_id` vs `key_value` vs
   `account_reference` — not interchanged? Refund API beta only, Transfer-In
   not claimed as refundable, Return API not claimed as CO?
7. Webhooks if claimed (`cobre-webhooks`); conflicts disclosed
   (subclients, refund fields, Nequi/Bre-B QA)?

Items this check **cannot** certify because they are unpublished: payin
numeric limits, Direct Link windows (that page — do not quote), key-count
or Transfer-In caps (stated inconsistently or on-page only), sandbox
waits, official pass/fail.

## Review checklist

1. **Framing** — Presented as readiness, not certification?
2. **MCP** — Current contract confirmed? Stop if MCP is down.
3. **Questionnaire** — Mandatory PayIn CO + Direct Debit rows mapped?
4. **Conflicts** — Header names, refund fields, subclients, Nequi/Bre-B
   QA, Keys maximum: all spoken?
5. **Demo env** — QA vs Keys pre-go-live vs undocumented Transfer-In/DD?
6. **Scope** — No invented demo cases or unpublished minima?

## Do not assert

- That this skill, or any local checklist, is official certification.
- That Nequi or Bre-B certify in QA for Direct Link or Checkout.
- That Cobre Keys certifies in QA, or that Transfer-In / Direct Debit have
  a published PayIn QA matrix row.
- That `change_mm_state` is a PayIn demo fixture.
- That Virtual CLABEs or SPEI are Colombia questionnaire rails.
- That webhooks or the PSE subclient overlay are questionnaire-mandatory
  or generally live.
- That the Refund API is GA, that Transfer-In is refundable, or that the
  Return API is the Colombia refund.
- That a Colombia refund is a new payout (Processing Refunds page not
  found in the docs reviewed).
- A single idempotency header name, or one refund body field, without
  exposing the split.
- Event keys from the questionnaire over the Notifications catalog /
  current OAS.
- Unpublished payin min/max amounts, key-count figures, or sandbox waits.
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

- [Certification Process](https://docs.cobre.com/certification-2047778m0)
- [Questionnaire](https://docs.cobre.com/certification-questionnaire-2047804m0)
- [General Testing](https://docs.cobre.com/general-testing-1886578m0)
- [Checkout](https://docs.cobre.com/checkout-1886557m0)
- [Direct Link](https://docs.cobre.com/direct-link-1886559m0)
- [Cobre Keys with Bre-B](https://docs.cobre.com/cobre-keys-with-bre-b-1886558m0)
- [Notifications & Subscriptions](https://docs.cobre.com/notifications-and-subscriptions-1886572m0)
- [Payins Reconciliation in Colombia](https://docs.cobre.com/payins-reconciliation-in-colombia-1908673m0)
- [Refund API](https://docs.cobre.com/refund-api-2410357m0)
- [Create a Refund](https://docs.cobre.com/create-a-refund-43344629e0)
- [Subclient Associated Movements](https://docs.cobre.com/subclient-associated-movements-2475269m0)
- OAS (confirm current): `POST /money_movements`, `POST /checkouts`, `POST /subscriptions`
