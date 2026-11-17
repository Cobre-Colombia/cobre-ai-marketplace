---
name: cobre-payout-co-readiness
description: >-
  Guide developers through a public-docs readiness check for Cobre PayOut
  Colombia before a certification session: questionnaire items for outgoing
  payments, mandatory versus optional controls, live-demo environment, and
  public conflicts to disclose. Use when the user asks if a Colombia payout
  integration is ready to certify, what the questionnaire requires, or what
  to demo. This skill is not official Cobre certification and must not be
  presented as a pass/fail certificate.
---

# Cobre PayOut Colombia — readiness

A **readiness check** against public certification docs for outgoing COP
payouts. It is **not** official Cobre certification, not a score, and not a
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
- Idempotency header name, amounts, API errors → `cobre-api-conventions`

## Official process (context only)

The Certification Process has: (1) questionnaire, in session or offline;
(2) live demo against QA, or a pre-go-live instance when the product is not
in QA; (3) a Cobre report with score, issues, and recommendations. The
client requests the session through the KAM / Integration contact. This
skill only prepares answers and a demo outline from **published** pages.

## Questionnaire items that apply to outgoing payments

PayOut section (confirm current wording on the Questionnaire page):

- Which Pay Out rails have you implemented? Published values include
  `ACH/FastPay (CO)` and `Breb Key(CO)` (plus Mexico rails). **Mandatory.**
- API Counterparty — **mandatory.**
- API Bulk — **optional.**
- API Scheduler — **optional.**
- `idempotency-key` — **mandatory** (questionnaire label).
- `external-id` — **mandatory.**

**Bre-B QR is not listed** as a PayOut rail option. The API and Bre-B guide
document `breb_qr`. Expose that gap; do not tell the user QR “is” or “is
not” a certification rail.

Webhooks & Polling (optional on the questionnaire): signed notifications;
which events; polling for Money Movements or Transactions. Payout guides
“strongly recommend” webhooks; the Money Movement guide says you must
subscribe. **Expose the tone conflict.** Do not mark webhooks as a
questionnaire mandatory.

Auth rows → `cobre-auth`. Do not re-teach them here.

## Conflicts the readiness review must surface

- Questionnaire `idempotency-key` vs create-MM header `idempotency` (confirm
  the current OAS). Testing Cases says `idempotency_key`. Do not “fix” the
  name; cite the endpoint contract.
- Questionnaire `account.balance.debit` / `account.balance.credit` vs
  Notifications catalog `accounts.balance.debit` / `accounts.balance.credit`.
- Portal subscription-management lists `money_movements.status.returned`.
  Notifications and the event-layout page do **not**. The subscribe enum and
  `GET /subscribable_events` examples in the OAS reviewed while writing this
  skill did not include it either; check the current OAS before assuming
  either way. Do not treat `returned` as an implemented API event unless
  current MCP/docs agree.
- `external_id` was optional in the create-MM OAS reviewed while writing
  this skill and mandatory on the questionnaire. Check the current OAS
  before assuming either way.
- Payouts Reconciliation: `failed` has no debit; Fast Pay / ACH and Bre-B
  guides mention `failed` during processing after describing the debit.
  Same reconciliation page later groups debit + credit as rejection **or
  failure**. Expose; do not pick.

## Live demo environment

General Testing: Colombia payout Money Movements are in QA; the only
published counterparty institution is `1007`. Account Verification and
Connect Account are **not** in QA. For products marked unavailable in QA,
the Certification Process points to an isolated pre-go-live instance — not
QA and not the live account.

Do not invent a demo script beyond “show the flows you implemented.”
Published process language is “key flows and scenarios,” not a numbered
PayOut CO case list.

## Suggested readiness questions (not a certificate)

Answer only from current public docs + the user's code:

1. Docs MCP reachable and refreshed?
2. Rails claimed ⊆ questionnaire values, with QR called out as unpublished
   on the questionnaire?
3. Counterparties created via API for the destination types actually used
   (`cc` / `ch` / `dp` / `cobre_balance` / `breb_key` / `breb_qr` — verify
   against the current OAS)?
4. Create MM sends the current `idempotency` header and an `external_id`?
5. Client does **not** try to select Fast Pay vs ACH?
6. Terminal states handled: `completed`, `rejected`, `failed`, `canceled`,
   plus uncommon `completed` → `rejected`?
7. Reconciliation uses `metadata.money_movement_id` and does not treat
   `completed` as a permanently final balance?
8. Webhooks implemented if claimed; HMAC via `cobre-webhooks`; polling
   fallback present?
9. Bulk / Scheduler only claimed if actually implemented?
10. Conflicts above disclosed to the reviewer instead of hidden?

Items this check **cannot** certify because they are unpublished: Fast
Pay/ACH numeric limits, a single Fast Pay SLA, ACH cycle duration (look up
the ACH product page — do not quote figures here), Bre-B cap (look up the
Bre-B pages), production funding, F*/R* per rail, official pass/fail.

## Review checklist

1. **Framing** — Presented as readiness, not certification?
2. **MCP** — Current contract confirmed? Stop if MCP is down.
3. **Questionnaire** — Mandatory PayOut rows mapped to code?
4. **Conflicts** — Header name, event keys, `returned`, `failed`/debit,
   QR, `external_id` optional vs mandatory: all spoken?
5. **Demo env** — QA vs pre-go-live chosen from General Testing, not
   guessed?
6. **Scope** — No invented demo cases or unpublished minima?

## Do not assert

- That this skill, or any local checklist, is official certification.
- That Bre-B QR is a questionnaire PayOut rail.
- That webhooks are questionnaire-mandatory.
- Header `idempotency-key` / `Idempotency-Key` as the create-MM contract
  name.
- Event keys from the questionnaire or Portal over the Notifications
  catalog / current OAS.
- `money_movements.status.returned` as a documented API subscription key.
- Fast Pay/ACH min/max, Bre-B cap, or ACH timing figures.
- That the client chooses Fast Pay vs ACH.
- That `failed` always has (or never has) a debit — the public pages
  disagree.
- Production funding of a Cobre Balance.
- Auth, HMAC, error-envelope, pagination, or `Cobre-Version` rules.

## Sources

- [Certification Process](https://docs.cobre.com/certification-process-2047778m0)
- [Questionnaire](https://docs.cobre.com/questionnaire-2047804m0)
- [General Testing](https://docs.cobre.com/general-testing-1886578m0)
- [Notifications & Subscriptions](https://docs.cobre.com/notifications-subscriptions-1886572m0)
- [Subscription management](https://docs.cobre.com/subscription-management-1886550m0)
- [Payouts Reconciliation](https://docs.cobre.com/payouts-reconciliation-2335732m0)
- [Fast Pay & ACH](https://docs.cobre.com/fast-pay-ach-1886561m0)
- [Bre-B](https://docs.cobre.com/bre-b-1886562m0)
- OAS (confirm current): `POST /money_movements`, `POST /counterparties`,
  `POST /subscriptions`, `GET /subscribable_events`
