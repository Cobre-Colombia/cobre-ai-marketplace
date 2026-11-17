---
name: cobre-payin-mx-readiness
description: >-
  Guide developers through a public-docs readiness check for Cobre PayIn
  Mexico before a certification session: questionnaire items for Direct
  Link and Virtual Clabes, mandatory versus optional controls, live-demo
  environment (pre-go-live), and public conflicts to disclose. Use when the
  user asks if a Mexico collection integration is ready to certify, what
  the questionnaire requires, or what to demo. This skill is not official
  Cobre certification and must not be presented as a pass/fail certificate.
---

# Cobre PayIn Mexico — readiness

A **readiness check** against public certification docs for incoming MXN
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
- Idempotency header name, amounts, API errors → `cobre-api-conventions`
- PayOut Mexico questionnaire → `cobre-payout-mx-readiness`

## Official process (context only)

The Certification Process has: (1) questionnaire, in session or offline;
(2) live demo against QA, or a pre-go-live instance when the product is not
in QA; (3) a Cobre report with score, issues, and recommendations. The
client requests the session through the KAM / Integration contact. This
skill only prepares answers and a demo outline from **published** pages.

## Questionnaire items that apply to incoming payments

PayIn section (confirm current wording on the Questionnaire page):

- Which Pay In solution have you implemented? Mexico values:
  **`Direct Link (CO & MX)`**, **`Virtual Clabes (MX)`** (plus Colombia
  Checkout / Static BreB Key). **Mandatory.** Do not mark Checkout, PSE,
  Nequi, Bre-B, or Cobre Keys as Mexico work.
- Which Payment Methods have you implemented? Mexico value: **`Clabes
  (MX)`**. **Mandatory.**
- Direct Link: API Counterparty and `external-id` — **mandatory.**
- Virtual Clabes: multiple Virtual Clabes on one balance; cancel — **optional.**

Named Accounts, a CLABE-backed balance as its own solution, and the Refund
API were **not** PayIn questionnaire rows in the docs reviewed while
writing this skill; check the current page before assuming either way.
Account Connect MX banks are a **different** section.

Webhooks & Polling (optional): signed notifications; which events;
polling. Direct Link “strongly recommend[s]” webhooks; Money Movement
says you must subscribe — **expose the tone conflict.** Do not mark
webhooks as questionnaire-mandatory. Auth rows → `cobre-auth`.

## Conflicts the readiness review must surface

- Questionnaire `account.balance.*` vs Notifications `accounts.balance.*`.
  Portal lists `money_movements.status.returned`; Notifications, the
  event-layout page, and Processing Refunds in Mexico do **not**.
- `external_id` was optional in the create-MM OAS reviewed while writing
  this skill and mandatory on the Direct Link questionnaire row. OAS
  `type` example `r2p_spei` vs Payins Reconciliation `direct_link`.
  Combination table source `r2p` / `r2p_breb` vs `r2p_spei`. Money
  Movement “Where to go next” omits Direct Link for Mexico payin. Check
  the current OAS before assuming either way.
- Named Accounts overview gated vs API coming soon; `subclient` vs
  `subclient_id`; `|` vs `-`; `account.connected` not in the Notifications
  catalog in the docs reviewed while writing this skill. Check the
  current page before assuming either way.
- Refund API Mexico **coming soon** vs Return API as the published payin
  refund. Direct Link integrator-owned UX vs “hosted experience”. Response
  `valid until` vs request `valid_until`. OAS x-example
  `description_to_beneficiary_account` vs `description_to_payee`. R2P
  Rejected = expired/abandoned vs PayIn `rejected` → `completed`. Expose;
  do not pick.

## Live demo environment

General Testing: **Mexico is not in QA** (`false`). The demo is the
isolated **pre-go-live** instance — not QA and not live. The PayIn QA
matrix on that page is Colombia only. `account_test_transactions` and
`change_mm_state` were listed under Colombia only in the docs reviewed
while writing this skill; check the current page before assuming either
way. Do not invent a numbered PayIn MX case list.

## Suggested readiness questions (not a certificate)

Answer only from current public docs + the user's code:

1. Docs MCP reachable and refreshed?
2. Solutions claimed ⊆ `Direct Link (CO & MX)` / `Virtual Clabes (MX)`,
   with Checkout not presented as Mexico?
3. Standing CLABE credits create **no** Money Movement? Direct Link
   direction source `r2p_spei` / dest account (verify OAS)? Dynamic
   single-use CLABE not labeled Virtual CLABE?
4. Direct Link sends the current `idempotency` header and an `external_id`
   if that product is claimed?
5. Events: MM status for Direct Link; `accounts.balance.credit` for
   standing CLABE? No `returned` API event? No `transfer_acc.*` for
   Virtual CLABEs?
6. Reconciliation keys `spei_credit.metadata.account_reference` (Direct
   Link: MM `virtual_account`; standing: the CLABE)? Return API owned as
   payin refund, Refund API not claimed as live MX?
7. Webhooks implemented if claimed (`cobre-webhooks`); polling fallback?
8. Conflicts disclosed?

Items this check **cannot** certify because they are unpublished: payin
numeric limits, a test CLABE, `valid_until` windows (Direct Link page —
do not quote them), production funding, F*/R* per rail, Named Accounts
availability, official pass/fail.

## Review checklist

1. **Framing** — Presented as readiness, not certification?
2. **MCP** — Current contract confirmed? Stop if MCP is down.
3. **Questionnaire** — Mandatory PayIn MX rows mapped to code?
4. **Conflicts** — Terminology, MM type, Named Accounts, Return vs Refund
   API, event keys: all spoken?
5. **Demo env** — Pre-go-live from General Testing, not Colombia PayIn QA?
6. **Scope** — No invented demo cases or unpublished minima?

## Do not assert

- That this skill, or any local checklist, is official certification.
- That Mexico PayIn certifies in QA, or that Colombia PayIn QA applies.
- That Checkout, PSE, Nequi, Bre-B, or Cobre Keys are Mexico questionnaire rails.
- That webhooks are questionnaire-mandatory.
- Calling Direct Link's dynamic single-use CLABE a “Virtual CLABE”, or saying that CLABE is permanent.
- That the Refund API is live for Mexico.
- `money_movements.status.returned` as a documented API subscription key.
- Event keys from the questionnaire or Portal over the Notifications
  catalog / current OAS.
- Unpublished payin min/max amounts, a test CLABE, `valid_until` figures,
  or production funding.
- Auth, HMAC, error-envelope, pagination, or `Cobre-Version` rules.

## Sources

- [Certification Process](https://docs.cobre.com/certification-2047778m0)
- [Questionnaire](https://docs.cobre.com/certification-questionnaire-2047804m0)
- [General Testing](https://docs.cobre.com/general-testing-1886578m0)
- [Direct Link](https://docs.cobre.com/direct-link-1992193m0)
- [Account Reference – Virtual CLABEs](https://docs.cobre.com/account-reference-virtual-clabes-1886560m0)
- [Notifications & Subscriptions](https://docs.cobre.com/notifications-and-subscriptions-1886572m0)
- [Subscription management](https://docs.cobre.com/subscription-management-1886550m0)
- [Payins Reconciliation in México](https://docs.cobre.com/payins-reconciliation-in-m%C3%A9xico-2335734m0)
- [Named Accounts (MX)](https://docs.cobre.com/named-accounts-mx-2240375m0)
- [Processing Refunds in Mexico](https://docs.cobre.com/processing-refunds-in-mexico-2202241m0)
- [Refund API](https://docs.cobre.com/refund-api-2410357m0)
- [Named Accounts in Mexico](https://docs.cobre.com/named-accounts-in-mexico-2225470m0)
- OAS (confirm current): `POST /money_movements`, `POST /counterparties`, `POST /account_references`, `POST /subscriptions`
