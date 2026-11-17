---
name: cobre-payin-co-r2p-flow
description: >-
  Guide developers through Cobre PayIn Colombia Request-to-Pay collections:
  Checkout (hosted) and Direct Link (integrator UX) over PSE, Bancolombia,
  Nequi, and Bre-B, counterparties, money movements, and PSE subclient
  overlay. Also use for reviewing those integrations. Use when the user
  asks how to collect COP via Checkout or Direct Link. Do not use this
  skill for Cobre Keys, Transfer-In, Direct Debit, authentication, webhook
  HMAC, conventions, or SPEI / Mexico collections.
---

# Cobre PayIn Colombia — R2P flow

Client-facing guidance for Checkout and Direct Link collections in Colombia.

v0.1 may review and edit local application code and generate examples or tests.
Do not execute real Cobre API requests with customer credentials, ask the user
to paste secrets, or validate credentials by calling Cobre.

Public facts below come from Cobre's public Checkout, Direct Link, Money
Movement, and Payins Reconciliation documentation. **Field names, required
properties, and schemas must be confirmed in the current Docs MCP before
generating code.** The OpenAPI contract served by the Docs MCP can be older
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
undocumented behavior.

Cross-reference, do not duplicate:

- Token lifecycle and 401 → `cobre-auth`
- Webhook signatures, delivery, retries, and event dedup → `cobre-webhooks`
- API errors vs operation outcomes, amounts, pagination, versioning →
  `cobre-api-conventions`
- Cobre Keys, Transfer-In, Direct Debit, Refund API → `cobre-payin-co-standing-flow`
- Colombia **payouts** → `cobre-payout-co-*`; Mexico collections → `cobre-payin-mx-*`

## Products

Unlike Mexico (SPEI / standing CLABE / Direct Link R2P SPEI), these two
Colombia products collect over **PSE, Bancolombia, Nequi, and Bre-B**. Do
not generate Virtual CLABEs or SPEI as Colombia payins. Portal **Payment
Links** is not `POST /checkouts`.

1. **Checkout** — Cobre-hosted UX. `POST /checkouts` returns `checkout_url`.
   A Money Movement is created **when the payer pays**, not at Checkout
   create. Correlate via `batch_id` = `checkout_id`.
2. **Direct Link** — integrator-owned UX. Creates a Money Movement up
   front. PSE/Bancolombia: `payment_link`; Nequi: push; Bre-B: **dynamic**
   key or QR (`valid_until` on the Direct Link page — do not quote
   windows). Do not call that dynamic key a Cobre Key (static) or a
   Virtual CLABE.

Post-expiry transfer to a dynamic Bre-B key is not documented in the docs
reviewed while writing this skill; check the current page before assuming
either way.

## Prerequisites

Active Colombia Cobre Balance. Provider: Managing Virtual Balance Accounts
— confirm the current `provider_id`. Direction is the **inverse of
payout**: `source_id` = `<counterparty_id>`, `destination_id` =
`<account_id>`.

Direct Link: create the counterparty **before** the MM — `r2p` for
PSE/Nequi/Bancolombia, `r2p_breb` for Bre-B (verify against the current
OAS). Checkout: `r2p` is **optional**; if omitted, Checkout collects payer
data and creates it.

## Create

Confirm body fields in the current OAS. Idempotency header name is **not**
universal: create-MM uses `idempotency`; Create a Checkout documented
**none** in the docs reviewed while writing this skill — verify per
endpoint.

**Checkout:** `POST /checkouts`. Required in the OAS reviewed: `amount`,
`destination_id`, `checkout_rails`, `checkout_header`, `checkout_item`,
`valid_until`, `money_movement_intent_limit`, `redirect_url`. Enum rails
in that contract: `pse`, `bancolombia`, `nequi`, `breb`. Open links: `-1`
on the Checkout page. Integer `amount` in minor units.

**Direct Link:** `POST /money_movements` with integer `amount` in minor
units. Metadata variants (verify against the current OAS):
`r2p_direct_link_request_r2p` (source `r2p`, rails `pse` / `nequi` /
`bancolombia`); `r2p_direct_dynamic_keys_request` (source `r2p_breb`,
`r2p_rail` `breb_key` / `breb_qr`). Lengths and `valid_until` format:
verify against the current OAS; do not quote them. `external_id` was
optional in the OAS reviewed and mandatory on the Direct Link
questionnaire row — expose that split.

## Lifecycle and how the client learns they were paid

Both products use the published PayIn MM path. Do not copy F*/R* tables;
point to Money Movement Statuses. Learn the result from
`money_movements.status.*` (`cobre-webhooks`) plus
`GET /money_movements/<mm_id>`. Avoid polling until terminal (Money
Movement guide). Notifications are best-effort. PayIn path allows
`rejected` → `completed` (uncommon).

Reusing the same create-MM `idempotency` key inside its documented window
returns the original response (verify against the current OAS). A new
attempt needs a new key. Engineering guidance, not a Cobre contract.

## Reconciliation

See Payins Reconciliation in Colombia. Checkout, Direct Link (and R2P)
credits reconcile on `metadata.money_movement_id`. Do not use
`key_value` or `account_reference` here. `completed` is not a permanently
final balance if a later refund debit appears (`cobre-payin-co-standing-flow`).

## Subclients (PSE overlay — in active development)

Do **not** generate this as a generally available integration. Two
guides plus Checkout describe attaching a Subclient to **PSE** only.
Expose, do not pick: Associated Movements error `MM057` vs Management
`MM034`; both say `subclient_id` on `r2p_pse` MM is **coming soon** for
PSP/aggregators, while the create-MM OAS reviewed listed the field as
mandatory for aggregators; Checkout PSP + `pse` uses `CHK016`. Checkout
does not copy merchant identity onto the Money Movement.

## Refunds

Published Colombia path: Refund API (beta, KAM) — details in
`cobre-payin-co-standing-flow`. Return API is Mexico. Processing Refunds
in Colombia was not found in the docs reviewed while writing this skill.

## Public conflicts to expose (do not resolve)

- Checkout rails `breb_qr` / `breb_key` vs OAS enum `breb`; table field
  `checkout_rail` vs API `checkout_rails`. General Testing path
  `/v1/checkout` vs `POST /checkouts`.
- Checkout “Idempotency” heading describes Cobre Key creation.
- Direct Link: integrator owns UX and also mentions a hosted experience.
- OAS `financial_institution_code` required on `r2p_direct_link_request_r2p`
  vs description “only if PSE”. x-example names vs schema fields, and
  `valid_until` `format` vs datetime examples: verify against the current
  OAS.
- Reconciliation MM `type` `direct_link` vs combination table `r2p` /
  `r2p_breb` (not `r2p_pse`); `col_cb_credit` vs example `r2p_credit` for
  PSE. Money Movement “Where to go next” lists Checkout, Cobre Keys,
  Direct Link.

## Testing

For test plans and sandbox limits, see `cobre-payin-co-testing`. Do not
say that QA covers every rail or product. General Testing (as reviewed
while writing this skill) lists a full testing solution for Direct Link
with PSE and Bancolombia, and for Checkout only with Bancolombia, and
says Nequi and Bre-B are not available there. Check the current page
before assuming either way.

## Review checklist

1. **Sources** — Docs MCP reachable and refreshed? If not, stop.
2. **Product** — Checkout vs Direct Link? Payment Links not used as API?
3. **Direction** — source counterparty, destination account?
4. **MM** — Checkout MM only after the payer pays?
5. **Events** — `money_movements.status.*`, not Keys / Transfer-In events?
6. **Reconcile** — `metadata.money_movement_id`?
7. **Subclients** — Conflicts exposed, not treated as generally live?
8. **Conflicts** — Exposed rather than silently chosen?

## Do not assert

- That SPEI, Virtual CLABEs, or the Return API are Colombia payins.
- That Portal Payment Links is `POST /checkouts`.
- That Checkout creates a Money Movement at Checkout create time.
- That Direct Link's dynamic Bre-B key is a static Cobre Key, or a
  Virtual CLABE.
- A single idempotency header name for every endpoint (verify per
  endpoint).
- That the PSE subclient overlay is generally available.
- That Checkout and Direct Link share one UX.
- Auth, HMAC, error-envelope, pagination, `Cobre-Version`, Keys /
  Transfer-In / Direct Debit, or SPEI payout create.
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

- [Local Payments](https://docs.cobre.com/local-payments-with-cobre-1859025m0)
- [Checkout](https://docs.cobre.com/checkout-1886557m0)
- [Create a Checkout](https://docs.cobre.com/create-a-checkout-25933258e0)
- [Direct Link](https://docs.cobre.com/direct-link-1886559m0)
- [Create a Money Movement](https://docs.cobre.com/create-a-money-movement-25933236e0)
- [Payment Links](https://docs.cobre.com/payment-links-1886544m0)
- [Managing Counterparties](https://docs.cobre.com/managing-counterparties-1886556m0)
- [Managing Virtual Balance Accounts](https://docs.cobre.com/managing-virtual-balance-accounts-1886553m0)
- [Money Movement](https://docs.cobre.com/money-movements-1899651m0)
- [Money Movement Statuses](https://docs.cobre.com/money-movement-statuses-2032280m0)
- [Payins Reconciliation in Colombia](https://docs.cobre.com/payins-reconciliation-in-colombia-1908673m0)
- [Subclient Associated Movements](https://docs.cobre.com/subclient-associated-movements-2475269m0)
- [Subclient Management](https://docs.cobre.com/subclient-management-payins-colombia-2470953m0)
- [Notifications & Subscriptions](https://docs.cobre.com/notifications-and-subscriptions-1886572m0)
- [Questionnaire](https://docs.cobre.com/certification-questionnaire-2047804m0)
- [General Testing](https://docs.cobre.com/general-testing-1886578m0)
- OAS (confirm current): `POST /checkouts`, `POST /money_movements`, `POST /counterparties`
