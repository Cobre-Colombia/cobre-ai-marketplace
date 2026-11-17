# Cobre AI Marketplace

Client-facing Claude Code marketplace for plugins that help developers integrate with Cobre APIs using [public Cobre documentation](https://docs.cobre.com) and integration guidance.

The current plugin is **`cobre-dev-agent`**.

> This plugin is a support tool for developers. It does not replace Cobre’s official documentation or certification process. Any readiness or security checks do not constitute official Cobre certification or a security guarantee. AI-generated outputs may be inaccurate or outdated. Users must verify them against docs.cobre.com before production use.

## What v0.1 includes

- **Public Cobre Docs MCP** — reads current Cobre API docs (schemas, fields, endpoints) via the bundled `Cobre API Documentation` server.
- **`cobre-integration-router`** — routes Cobre integration questions to a matching skill, or to the Docs MCP when no skill fits.
- **`cobre-auth`** — authentication: `user_id` / `secret`, JWT `access_token`, cache and refresh, 401 handling. Can review or edit local auth code when you ask.
- **`cobre-webhooks`** — webhook subscriptions, HMAC signatures, duplicates, retries, and handler review.
- **`cobre-api-conventions`** — API errors, retries, idempotency, amounts, pagination, and versioning (not a Money Movement rejection catalog).
- **Credential-safety hook** — local `PreToolUse` scanner that blocks obvious hardcoded secrets/JWTs in agent writes.

## What v0.1 does not do

- No product-specific PayIn / PayOut / SPEI skills yet
- No sandbox orchestration
- No real Cobre API execution with customer credentials
- No access to internal Cobre systems
- No access to Cobre internal systems or customer data
- No plugin telemetry in v0.1
- Not a Cobre SDK

v0.1 is **advisor-only**.

## Known limitations

This plugin only states what Cobre's public documentation establishes. Where the documentation does not define a behavior, the plugin says so instead of guessing. In practice:

- **Webhook signatures:** the plugin does not generate the signature comparison (the digest encoding) until it is confirmed from the current public docs or the Docs MCP. Webhook handler examples stop before that step and are marked as incomplete and not deployable.
- **Webhook delivery:** the plugin does not state timeouts, 5xx retry behavior, replay windows, or ordering guarantees unless the public docs define them. What is public: 3 automatic retries on connection errors only, no retries on 4xx, and no later redelivery. Delivery is best-effort, so reconcile by polling the resource.
- **Error responses:** the error format varies across endpoints. The plugin does not assume a single error envelope or that every error is HTTP 409.
- **Idempotency:** the header name and rules are endpoint-specific. Only the Money Movements and Cross-Border Money Movements contract is treated as documented.
- **Amounts, pagination and versioning:** minimums and maximums, sign rules, pagination style, and version headers can differ by endpoint, currency, or rail. The plugin checks the endpoint contract in the Docs MCP and does not hardcode or validate them.

When you need one of these details, confirm it with Cobre before relying on it.

## Requirements

- [Claude Code](https://code.claude.com/docs/en/overview)
- **Node.js** on your `PATH` (credential hook and `npx` Docs MCP)
- Network access for the public Docs MCP (`npx apidog-mcp-server`)
- Access to this repository (local clone)

## Privacy and security

- Installing the plugin does **not** require Cobre API credentials.
- The plugin itself does **not** send adoption telemetry.
- It does **not** connect to internal Cobre systems.
- v0.1 does **not** execute real Cobre API calls with customer credentials.
- It **may** read, review, or edit local integration code when you ask.
- Credential scanning runs **locally** on the current tool action (`PreToolUse`). The hook does not intentionally log or transmit matched credential values.
- The public Docs MCP **requires network access** to fetch documentation.
- **Do not paste production credentials** into prompts.

This describes plugin behavior only, not Claude Code’s own product telemetry or privacy policy.

## What this plugin installs

Installing `cobre-dev-agent` loads:

- Three Markdown skills: `cobre-auth`, `cobre-webhooks`, and `cobre-api-conventions`
- A routing agent (`cobre-integration-router`)
- A local Node hook that blocks hardcoded credentials in agent writes
- An MCP server started with `npx` (`apidog-mcp-server@0.0.18`) that reads public Cobre documentation

Claude Code shows a standard trust prompt before installing. Use this list to decide with that information. For credentials, network access, and plugin telemetry, see [Privacy and security](#privacy-and-security).

## Install from GitHub

Register this marketplace from the GitHub repository:

```text
/plugin marketplace add Cobre-Colombia/cobre-ai-marketplace
```

Install the plugin from that marketplace:

```text
/plugin install cobre-dev-agent@cobre-ai-marketplace
```

Reload so the install is available in the current session:

```text
/reload-plugins
```


Claude Code offers to install **for you (user scope)** or **for all collaborators on this repository (project scope)**. User scope is the usual choice.

## Install from a local checkout

Use a local checkout if you want to review or modify the plugin.

1. Clone or otherwise obtain this repository.
2. Start Claude Code.
3. Add the marketplace using the **absolute** path to the repo root (the directory that contains `.claude-plugin/marketplace.json`):

   ```text
   /plugin marketplace add /absolute/path/to/cobre-ai-marketplace
   ```

4. Install the plugin:

   ```text
   /plugin install cobre-dev-agent@cobre-ai-marketplace
   ```

5. If Claude says a reload is needed:

   ```text
   /reload-plugins
   ```

   If reload warns about the prompt cache, use `/reload-plugins --force`.

From the parent of the clone, a relative path also works: `/plugin marketplace add ./cobre-ai-marketplace`. You can also pass the manifest file: `/plugin marketplace add /absolute/path/to/cobre-ai-marketplace/.claude-plugin/marketplace.json`.

Choose **user**, **project**, or **local** scope when prompted. User scope is typical for a personal install.

## Verify installation

- `/plugin list` — `cobre-dev-agent` should appear enabled.
- `/plugin` → **Installed** — open `cobre-dev-agent` and confirm skills, agent, hooks, and MCP.
- MCP — after you approve it, the server should appear as `plugin:cobre-dev-agent:Cobre API Documentation`.
- `/hooks` — a `PreToolUse` command hook from this plugin (credential scanner) should be listed.

`/reload-plugins` summaries may not always reflect plugin skills directly. Verify the installation from `/plugin` details or by invoking the plugin with a prompt.

Optional CLI checks (outside a session): `claude plugin list` and `claude plugin details cobre-dev-agent@cobre-ai-marketplace`.

## Using the plugin

Ask in natural language. The router sends you to a skill or to the Docs MCP.

**Auth**

> How should I authenticate to Cobre and when should I refresh the token?

**Webhooks**

> Review my Cobre webhook handler and tell me what is wrong.

**API conventions / errors**

> How should I handle Cobre API errors, retries and idempotency?

**Docs MCP**

> Using the Cobre API Documentation MCP, show me the required fields for POST /money_movements.

You can also invoke a skill explicitly (`/cobre-dev-agent:cobre-auth`, `/cobre-dev-agent:cobre-webhooks`, `/cobre-dev-agent:cobre-api-conventions`) or @-mention `@cobre-dev-agent:cobre-integration-router`. Natural-language routing is the primary UX.

## Credential safety hook

The hook inspects the **current** Write / Edit / Bash / PowerShell / NotebookEdit input only. It is **not** a full-repo scanner or a git pre-commit hook.

**BLOCK** (tool call denied) — hardcoded secret or a full JWT as `access_token` / `Authorization: Bearer`:

```js
const secret = "FAKE_COBRE_SECRET_FOR_TEST_ONLY";
```

**ALLOW** — environment variables and placeholders:

```js
const secret = process.env.COBRE_SECRET;
```

**WARN** (does not block) — literal `user_id`, for example `user_id = "cli_pxt0001"`.

Denial messages tell you to use env vars / a secret manager. They do not include the matched value. Put real secrets in the environment yourself; do not ask the agent to write live credential values into source or `.env`.

## Updating local plugin changes

After you pull or edit this checkout:

```text
/plugin marketplace update cobre-ai-marketplace
/reload-plugins
```

Restart Claude Code if hooks or MCP still look stale.

## Uninstall

```text
/plugin uninstall cobre-dev-agent@cobre-ai-marketplace
/plugin marketplace remove cobre-ai-marketplace
```

Removing a marketplace **uninstalls plugins you installed from it**.

## Troubleshooting

| Symptom | What to try |
| :---- | :---- |
| Marketplace path not found | Use the **repo root** absolute path (the folder that contains `.claude-plugin/marketplace.json`), not `plugins/cobre-dev-agent`. |
| Plugin installed but skills/hook/MCP missing in this session | `/reload-plugins` (or `--force`); otherwise restart Claude Code. CLI install does not activate an already-open session. |
| MCP waiting for approval | Approve `plugin:cobre-dev-agent:Cobre API Documentation` in the session (same approval flow as a project MCP server). |
| Docs MCP / `npx` fails | Confirm Node/`npx` on `PATH` and network access. The server is `apidog-mcp-server@0.0.18`. |
| MCP server times out on first start (`connection timed out after 30000ms`) | The first run downloads `apidog-mcp-server@0.0.18` through `npx`, which can take longer than Claude Code's startup timeout. Reconnect from `/mcp`, or start Claude Code with a longer timeout, for example `MCP_TIMEOUT=60000 claude`. |
| Credential hook never blocks | Node must be on `PATH`. If the hook cannot start, Claude Code may treat that as a non-blocking error and still run the write. |
| GitHub `owner/repo` add fails | Check network access to github.com and that Git can reach the repository. |
| `self-signed certificate in certificate chain` | Your network may be inspecting TLS traffic. Configure your organization's root certificate for Node.js (`NODE_EXTRA_CA_CERTS`). Never disable certificate verification. |
| Manifest doubts | From the repo root: `claude plugin validate .` and `claude plugin validate plugins/cobre-dev-agent`. |
| The credential hook blocks a write that has no credential in it | The hook looks at fields named `secret` or `*_secret` and blocks values that are not an environment reference or a configuration access. Assigning a bare parameter (for example `this.secret = secret`), a helper call that reads the environment (for example `secret: requireEnv("COBRE_SECRET")`) or a typed Python signature can be flagged by mistake. Keep credentials in a configuration object (`options.secret` or `config.secret`) or read them from environment variables, and do not paste real values into code. A block does not mean a credential was found. |

There is no supported command to “force” MCP without approval.

## Source of truth

- [Cobre documentation](https://docs.cobre.com)
- [Build with AI](https://docs.cobre.com/build-with-ai-1982911m0)
- [Discover and install Claude Code plugins](https://code.claude.com/docs/en/discover-plugins)

**Public Cobre documentation and the Docs MCP are the source of truth for current API facts.** Skills give implementation guidance and should defer to current docs when contracts change.

## Internal contributor note

Repository maintainers: see [`AGENTS.md`](AGENTS.md).

## License

The code, guides and configuration in this repository are published under the Apache License 2.0 (see `LICENSE`).

Copyright (c) 2026 Pexto Colombia SAS

Third-party tools such as `apidog-mcp-server` (ISC license) are not included or redistributed in this repository and keep their own license terms. Adopting the Apache License 2.0 does not change those terms.

### Trademarks

Cobre and the Cobre logo are trademarks of Pexto Colombia SAS. This license does not grant rights to these trademarks, except as permitted by Section 6 of the Apache License 2.0. Modified versions must not be presented as official Cobre software or as endorsed by Cobre.
