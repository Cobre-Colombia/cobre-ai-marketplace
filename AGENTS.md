# AGENTS.md

This repository is Cobre's client-facing AI marketplace. It hosts plugins that help developers integrate with Cobre.

The first plugin is `cobre-dev-agent`.

## Public / internal boundary

Anything included in a client-facing plugin must be suitable for publication in Cobre's public documentation.

Do not include:

- Internal Cobre systems
- Customer data
- PII
- Private credentials
- Cobre internal systems
- Non-public operational knowledge

Official Cobre public documentation and the public Docs MCP are the source of truth.

## v0.1 scope

v0.1 is advisor-only. It must not execute real Cobre API operations using customer credentials.
