---
name: cobre-payout-mx-readiness
description: >-
  Guide developers through a public-docs readiness check for Cobre PayOut
  Mexico before a certification session: questionnaire items for outgoing
  SPEI payments, mandatory versus optional controls, live-demo environment
  (pre-go-live), and public conflicts to disclose. Use when the user asks
  if a Mexico payout integration is ready to certify, what the questionnaire
  requires, or what to demo. This skill is not official Cobre certification
  and must not be presented as a pass/fail certificate.
---

# Cobre PayOut Mexico — readiness

A **readiness check** against public certification docs for outgoing MXN
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
- Colombia questionnaire rails and QA demo → `cobre-payout-co-readiness`

## Official process (context only)

The Certification Process has: (1) questionnaire, in session or offline;
(2) live demo against QA, or a pre-go-live instance when the product is not
in QA; (3) a Cobre report with score, issues, and recommendations. The
client requests the session through the KAM / Integration contact. This
skill only prepares answers and a demo outline from **published** pages.

## Questionnaire items that apply to outgoing payments

PayOut section (confirm current wording on the Questionnaire page):

- Which Pay Out rails have you implemented? Mexico values:
  **`SPEI Clabes (MX)`**, **`SPEI Card (MX)`** (plus Colombia rails on the
  same question). **Mandatory.** Do not mark Colombia rails as Mexico work.
- API Counterparty — **mandatory.**
- API Bulk — **optional.**
- API Scheduler — **optional.**
- `idempotency-key` — **mandatory** (questionnaire label).
- `external-id` — **mandatory.**

A Mexico Cobre Balance destination is **not listed** as a PayOut rail
option. Bulk lists that dest with Fast Pay — expose; do not settle it.
Account Connect MX banks are a **different** section, not SPEI PayOut.
Account Verification was **not** a PayOut questionnaire row in the docs
reviewed while writing this skill; check the current page before assuming
either way. Do not mark AV as questionnaire-mandatory.

Webhooks & Polling (optional): signed notifications; which events;
polling. SPEI “strongly recommend[s]” webhooks; the Money Movement guide
says you must subscribe. **Expose the tone conflict.** Do not mark
webhooks as questionnaire-mandatory. Auth rows → `cobre-auth`.

## Conflicts the readiness review must surface

- Questionnaire `idempotency-key` vs create-MM header `idempotency` (confirm
  the current OAS). Testing Cases says `idempotency_key`. Do not “fix” the
  name; cite the endpoint contract.
- Questionnaire `account.balance.debit` / `account.balance.credit` vs
  Notifications catalog `accounts.balance.debit` / `accounts.balance.credit`.
- Portal subscription-management lists `money_movements.status.returned`.
  Notifications and the event-layout page do **not**. Processing Refunds in
  Mexico says there is no `returned` status. Do not treat `returned` as an
  implemented API event unless current MCP/docs agree.
- `external_id` was optional in the create-MM OAS reviewed while writing
  this skill and mandatory on the questionnaire. SPEI guide requires
  `description` and `reference`; OAS `required` on `spei_request_meta` in
  the contract reviewed listed `reference` only. Check the current OAS
  before assuming either way.
- Source: SPEI guides say a Mexican Cobre Balance; OAS when-clauses
  reviewed while writing this skill also mention a Connect Account with
  geo `mex`; the combination table lists SPEI source type `clabe`. Bulk
  Mexico `cobre_balance` / Fast Pay vs SPEI-only guides and the rails
  above. Payouts Reconciliation: `failed` has no debit; SPEI still
  describes `failed` during validation or processing. Expose; do not pick.

## Live demo environment

General Testing: **Mexico is not in QA** (`false`). The demo is the
isolated **pre-go-live** instance — not QA and not live. AV is also
`false` in QA. `account_test_transactions` and `change_mm_state` were
listed under Colombia only in the docs reviewed while writing this skill;
check the current page before assuming either way. Do not invent a
numbered PayOut MX case list.

## Suggested readiness questions (not a certificate)

Answer only from current public docs + the user's code:

1. Docs MCP reachable and refreshed?
2. Rails claimed ⊆ `SPEI Clabes (MX)` / `SPEI Card (MX)`, with Colombia
   rails not presented as Mexico?
3. Counterparties created via API for `clabe` / `spei_card` actually used
   (verify against the current OAS)? `mm_return` / `r2p_spei` not used as
   payout destinations?
4. Create MM sends the current `idempotency` header, an `external_id`, and
   SPEI metadata with `reference` (verify OAS)?
5. Terminal states handled, including uncommon `completed` → `rejected`?
   No code treating `returned` as an API status?
6. Reconciliation groups by `metadata.money_movement_id` and does not
   treat `completed` as a permanently final balance? Return API claimed
   only for incoming-credit refunds, not as payout create?
7. Webhooks implemented if claimed (`cobre-webhooks`); polling fallback?
8. Bulk / Scheduler only claimed if implemented? Conflicts disclosed?

Items this check **cannot** certify because they are unpublished: SPEI
numeric limits, a test institution, AV schedule figures (look up Account
Verification — do not quote them here), production funding, F*/R* per
rail, official pass/fail.

## Review checklist

1. **Framing** — Presented as readiness, not certification?
2. **MCP** — Current contract confirmed? Stop if MCP is down.
3. **Questionnaire** — Mandatory PayOut MX rows mapped to code?
4. **Conflicts** — Header name, event keys, `returned`, source, Bulk Fast
   Pay dest, `external_id` optional vs mandatory: all spoken?
5. **Demo env** — Pre-go-live from General Testing, not Colombia QA?
6. **Scope** — No invented demo cases or unpublished minima?

## Do not assert

- That this skill, or any local checklist, is official certification.
- That Mexico PayOut certifies in QA, or that Colombia QA endpoints apply.
- That webhooks or Account Verification are PayOut questionnaire-mandatory.
- Header `idempotency-key` / `Idempotency-Key` as the create-MM contract
  name.
- Event keys from the questionnaire or Portal over the Notifications
  catalog / current OAS.
- `money_movements.status.returned` as a documented API subscription key.
- That `cobre_balance` is a questionnaire Mexico PayOut rail.
- Unpublished SPEI min/max amounts, a test institution, AV timing
  figures, or production funding.
- That the Return API is the SPEI payout flow.
- Auth, HMAC, error-envelope, pagination, or `Cobre-Version` rules.

## Sources

- [Certification Process](https://docs.cobre.com/certification-2047778m0)
- [Questionnaire](https://docs.cobre.com/certification-questionnaire-2047804m0)
- [General Testing](https://docs.cobre.com/general-testing-1886578m0)
- [SPEI](https://docs.cobre.com/spei-1886563m0)
- [Notifications & Subscriptions](https://docs.cobre.com/notifications-and-subscriptions-1886572m0)
- [Subscription management](https://docs.cobre.com/subscription-management-1886550m0)
- [Payouts Reconciliation](https://docs.cobre.com/payouts-reconciliation-2335732m0)
- [Bulk Money Movements](https://docs.cobre.com/bulk-money-movements-1886564m0)
- [Processing Refunds in Mexico](https://docs.cobre.com/processing-refunds-in-mexico-2202241m0)
- [Account Verification](https://docs.cobre.com/account-verification-1886570m0)
- OAS (confirm current): `POST /money_movements`, `POST /counterparties`,
  `POST /subscriptions`, `GET /subscribable_events`
