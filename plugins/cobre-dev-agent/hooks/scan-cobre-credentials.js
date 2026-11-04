#!/usr/bin/env node
"use strict";

/**
 * Local PreToolUse scanner for hardcoded Cobre credentials.
 * Reads only the current hook JSON from stdin. No disk traversal, network,
 * logging of payloads, or emission of matched values.
 */

const BLOCK_REMEDIATION =
  "Hardcoded Cobre credentials are not allowed. Load user_id and secret from environment variables (COBRE_USER_ID, COBRE_SECRET) or a secret manager at runtime, then obtain and cache the access_token in memory. Do not write live credential values into source or .env files through the agent; the developer should populate secrets outside this session.";

const WARN_USER_ID =
  "A literal user_id was found. Prefer COBRE_USER_ID from the environment or a secret manager. This write was not blocked.";

const PLACEHOLDER_EXACT = new Set([
  "your_secret",
  "your_user_id",
  "your_access_token",
  "changeme",
  "todo",
  "xxx",
  "***",
  "string",
  "null",
  "undefined",
  "none",
  "n/a",
]);

const BEARER_JWT_RE =
  /\bBearer\s+eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/i;
const BUSINESS_ID_RE = /^(cli|acc|mm|cp)_[A-Za-z0-9]+$/i;
const ENV_REF_RE =
  /process\.env|os\.environ|os\.getenv|getenv\s*\(|ENV\[|ENV\.fetch|System\.getenv|Deno\.env|Bun\.env|\$env:|secret.?manager|secretsmanager/i;
const ENV_VAR_RE = /^\$\{?[A-Za-z_][A-Za-z0-9_]*\}?$/;
const ASSIGNMENT_RE =
  /(?:^|[^A-Za-z0-9_])(?:export\s+|set\s+)?(?:\$env:)?["']?([A-Za-z_][A-Za-z0-9_]*)["']?[ \t]*[:=][ \t]*/gi;

function extractText(toolName, toolInput) {
  if (!toolInput || typeof toolInput !== "object") {
    return "";
  }
  switch (toolName) {
    case "Write":
      return stringify(toolInput.content);
    case "Edit":
      return stringify(toolInput.new_string);
    case "Bash":
    case "PowerShell":
      return stringify(toolInput.command);
    case "NotebookEdit":
      return stringify(toolInput.cell_source || toolInput.new_source);
    default:
      return [
        toolInput.content,
        toolInput.new_string,
        toolInput.command,
        toolInput.cell_source,
      ]
        .filter((value) => value != null && value !== "")
        .map(stringify)
        .join("\n");
  }
}

function stringify(value) {
  if (value == null) {
    return "";
  }
  return typeof value === "string" ? value : String(value);
}

function isSecretField(name) {
  const lower = name.toLowerCase();
  return lower === "secret" || lower.endsWith("_secret");
}

function isAccessTokenField(name) {
  const lower = name.toLowerCase();
  return lower === "access_token" || lower.endsWith("_access_token");
}

function isUserIdField(name) {
  const lower = name.toLowerCase();
  return lower === "user_id" || lower === "cobre_user_id";
}

function isPlaceholder(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  if (/^\{\{[^}]+\}\}$/.test(trimmed)) {
    return true;
  }
  if (/^<[^>]+>$/.test(trimmed)) {
    return true;
  }
  if (trimmed.includes("...")) {
    return true;
  }
  if (/^your_/i.test(trimmed)) {
    return true;
  }
  if (/^x+$/i.test(trimmed) || /^\*+$/.test(trimmed)) {
    return true;
  }
  return PLACEHOLDER_EXACT.has(trimmed.toLowerCase());
}

function isEnvReference(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }
  if (ENV_REF_RE.test(trimmed)) {
    return true;
  }
  return ENV_VAR_RE.test(trimmed);
}

function isBusinessId(value) {
  return BUSINESS_ID_RE.test(value.trim());
}

function isFullJwt(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("...")) {
    return false;
  }
  return /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed);
}

function readRhs(text, start) {
  let i = start;
  while (i < text.length && (text[i] === " " || text[i] === "\t")) {
    i += 1;
  }
  if (i >= text.length || text[i] === "\n" || text[i] === "\r") {
    return { value: "", raw: "", quoted: false };
  }
  const quote = text[i];
  if (quote === '"' || quote === "'") {
    i += 1;
    let value = "";
    while (i < text.length && text[i] !== quote && text[i] !== "\n") {
      if (text[i] === "\\") {
        value += text[i];
        i += 1;
        if (i < text.length) {
          value += text[i];
          i += 1;
        }
        continue;
      }
      value += text[i];
      i += 1;
    }
    return { value, raw: value, quoted: true };
  }
  const from = i;
  while (i < text.length && !/[\s,;}\]#]/.test(text[i])) {
    i += 1;
  }
  const raw = text.slice(from, i);
  return { value: raw, raw, quoted: false };
}

function eachAssignment(text) {
  const assignments = [];
  ASSIGNMENT_RE.lastIndex = 0;
  let match;
  while ((match = ASSIGNMENT_RE.exec(text))) {
    const rhs = readRhs(text, ASSIGNMENT_RE.lastIndex);
    assignments.push({
      field: match[1],
      value: rhs.value,
      raw: rhs.raw,
      quoted: rhs.quoted,
    });
  }
  return assignments;
}

const VARIABLE_REFERENCE_RE =
  /^(?:this|self|env|config|cfg|options|opts|settings|params|props|credentials|creds|args|ctx)\.[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/;

function isVariableReference(assignment) {
  return !assignment.quoted && VARIABLE_REFERENCE_RE.test(assignment.raw.trim());
}

function isIgnoredLiteral(assignment) {
  if (
    isPlaceholder(assignment.value) ||
    isEnvReference(assignment.raw) ||
    isVariableReference(assignment)
  ) {
    return true;
  }
  if (!assignment.quoted && !assignment.value) {
    return true;
  }
  return false;
}

function analyze(text) {
  const result = { decision: "allow", kinds: [] };
  if (!text) {
    return result;
  }

  let block = false;
  let warnUserId = false;

  for (const assignment of eachAssignment(text)) {
    if (isIgnoredLiteral(assignment)) {
      continue;
    }

    if (isSecretField(assignment.field)) {
      if (isBusinessId(assignment.value)) {
        continue;
      }
      block = true;
      result.kinds.push("secret_literal");
      continue;
    }

    if (isAccessTokenField(assignment.field) && isFullJwt(assignment.value)) {
      block = true;
      result.kinds.push("jwt_access_token");
      continue;
    }

    if (isUserIdField(assignment.field)) {
      warnUserId = true;
    }
  }

  if (BEARER_JWT_RE.test(text)) {
    block = true;
    result.kinds.push("bearer_jwt");
  }

  if (block) {
    result.decision = "block";
    return result;
  }
  if (warnUserId) {
    result.decision = "warn";
    result.kinds.push("user_id_literal");
  }
  return result;
}

function blockOutput() {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: BLOCK_REMEDIATION,
    },
    systemMessage: BLOCK_REMEDIATION,
  };
}

function warnOutput() {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: WARN_USER_ID,
    },
    systemMessage: WARN_USER_ID,
  };
}

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function failClosed() {
  process.stderr.write(
    "Credential scanner received invalid hook input; refusing the tool call.\n",
  );
  process.exit(2);
}

function main() {
  let data;
  try {
    const raw = require("fs").readFileSync(0, "utf8");
    if (!raw.trim()) {
      failClosed();
    }
    data = JSON.parse(raw);
  } catch {
    failClosed();
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    failClosed();
  }

  const toolInput = data.tool_input;
  if (toolInput != null && (typeof toolInput !== "object" || Array.isArray(toolInput))) {
    failClosed();
  }

  const text = extractText(data.tool_name, toolInput);
  const result = analyze(text);

  if (result.decision === "block") {
    writeJson(blockOutput());
    process.exit(0);
  }
  if (result.decision === "warn") {
    writeJson(warnOutput());
    process.exit(0);
  }
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = {
  analyze,
  extractText,
  BLOCK_REMEDIATION,
  WARN_USER_ID,
};
