"use strict";

const { spawnSync } = require("child_process");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { analyze, extractText } = require("./scan-cobre-credentials.js");

const SCANNER = path.join(__dirname, "scan-cobre-credentials.js");

const FAKE_SECRET = "n0t-a-real-credential-aabbccddeeff99887766";
const FAKE_JWT =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJub3QtYS1yZWFsLXN1YmplY3QiLCJpc3MiOiJ0ZXN0LXN1aXRlIn0.dGhpc19pc19ub3RfYS1yZWFsX3NpZ25hdHVyZV9wYWRkaW5n";
const FAKE_USER_ID = "cli_pxt0001";
const FORBIDDEN = [FAKE_SECRET, FAKE_JWT, FAKE_USER_ID];

function runHook(payload) {
  const result = spawnSync(process.execPath, [SCANNER], {
    input: JSON.stringify(payload),
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function writePayload(content) {
  return {
    hook_event_name: "PreToolUse",
    tool_name: "Write",
    tool_input: { file_path: "/tmp/app.js", content },
  };
}

function assertNoMatchedValue(output) {
  const haystacks = [output.stdout, output.stderr];
  for (const haystack of haystacks) {
    for (const value of FORBIDDEN) {
      if (haystack.includes(value)) {
        assert.fail("Hook output contained a matched secret value");
      }
    }
  }
}

function parseStdout(output) {
  const trimmed = output.stdout.trim();
  if (!trimmed) {
    return null;
  }
  return JSON.parse(trimmed);
}

function assertBlocked(output) {
  assert.equal(output.status, 0);
  assertNoMatchedValue(output);
  const body = parseStdout(output);
  assert.ok(body);
  assert.equal(body.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.equal(body.hookSpecificOutput.permissionDecision, "deny");
  assert.match(
    body.hookSpecificOutput.permissionDecisionReason,
    /environment variable/i,
  );
  assert.match(body.systemMessage, /environment variable/i);
}

function assertAllowed(output) {
  assert.equal(output.status, 0);
  assertNoMatchedValue(output);
  const body = parseStdout(output);
  assert.equal(body, null);
}

function assertWarned(output) {
  assert.equal(output.status, 0);
  assertNoMatchedValue(output);
  const body = parseStdout(output);
  assert.ok(body);
  assert.notEqual(body.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(body.systemMessage, /user_id/i);
}

test("extracts Write content, Edit new_string, shell command, NotebookEdit cell_source", () => {
  assert.equal(extractText("Write", { content: "a" }), "a");
  assert.equal(extractText("Edit", { new_string: "b", old_string: "z" }), "b");
  assert.equal(extractText("Bash", { command: "c" }), "c");
  assert.equal(extractText("PowerShell", { command: "d" }), "d");
  assert.equal(extractText("NotebookEdit", { cell_source: "e" }), "e");
});

test("fake hardcoded secret -> BLOCK", () => {
  const output = runHook(
    writePayload(`const secret = "${FAKE_SECRET}";`),
  );
  assertBlocked(output);
  assert.equal(analyze(`secret: "${FAKE_SECRET}"`).decision, "block");
});

test("fake full JWT access_token -> BLOCK", () => {
  const output = runHook(
    writePayload(`access_token = "${FAKE_JWT}"`),
  );
  assertBlocked(output);
});

test("fake Bearer JWT -> BLOCK", () => {
  const output = runHook(
    writePayload(`headers["Authorization"] = "Bearer ${FAKE_JWT}"`),
  );
  assertBlocked(output);
});

test("shell command embedding fake credential -> BLOCK", () => {
  const bash = runHook({
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    tool_input: {
      command: `curl -H "Authorization: Bearer ${FAKE_JWT}" https://api.cobre.co/v1/accounts`,
    },
  });
  assertBlocked(bash);

  const powershell = runHook({
    hook_event_name: "PreToolUse",
    tool_name: "PowerShell",
    tool_input: {
      command: `$env:COBRE_SECRET = "${FAKE_SECRET}"`,
    },
  });
  assertBlocked(powershell);
});

test("env references -> ALLOW", () => {
  const snippets = [
    'const secret = process.env.COBRE_SECRET;',
    'secret = os.environ["COBRE_SECRET"]',
    'secret = os.getenv("COBRE_SECRET")',
    'export COBRE_SECRET=$COBRE_SECRET',
    'access_token = process.env.COBRE_ACCESS_TOKEN',
  ];
  for (const content of snippets) {
    assertAllowed(runHook(writePayload(content)));
  }
});

test("placeholders -> ALLOW", () => {
  const snippets = [
    'secret = "your_secret"',
    'secret: "{{secret}}"',
    'Authorization: Bearer <access_token>',
    'secret = "changeme"',
    'secret = "TODO"',
    'secret = "xxx"',
    'secret = "***"',
    "COBRE_SECRET=",
    'COBRE_SECRET=""',
  ];
  for (const content of snippets) {
    assertAllowed(runHook(writePayload(content)));
  }
});

test("truncated docs JWT -> ALLOW", () => {
  assertAllowed(
    runHook(
      writePayload(
        'access_token: "eyJhbGciOiJSUzI1..."\ntype: Bearer',
      ),
    ),
  );
});

test("ordinary Cobre IDs -> ALLOW", () => {
  const content = `
    const movement = { id: "mm_4WxYzAbCdEfGh" };
    const account = { id: "acc_4WxYzAbCdEfGh" };
    const counterparty = { id: "cp_7KmNpQrStUvWx" };
    const client = { id: "cli_0000" };
  `;
  assertAllowed(runHook(writePayload(content)));
});

test("literal user_id -> WARN / non-blocking", () => {
  const output = runHook(
    writePayload(`user_id = "${FAKE_USER_ID}"`),
  );
  assertWarned(output);
});

test("BLOCK output never contains the fake matched value", () => {
  const cases = [
    writePayload(`secret = "${FAKE_SECRET}"`),
    writePayload(`access_token = "${FAKE_JWT}"`),
    writePayload(`Authorization: Bearer ${FAKE_JWT}`),
    {
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: `export COBRE_SECRET=${FAKE_SECRET}` },
    },
  ];
  for (const payload of cases) {
    const output = runHook(payload);
    assertBlocked(output);
    assertNoMatchedValue(output);
  }
});

test("Edit new_string with secret is scanned; old_string is not", () => {
  const output = runHook({
    hook_event_name: "PreToolUse",
    tool_name: "Edit",
    tool_input: {
      file_path: "/tmp/app.js",
      old_string: `secret = "${FAKE_SECRET}"`,
      new_string: 'secret = process.env.COBRE_SECRET',
    },
  });
  assertAllowed(output);
});

test("literal secret in .env is BLOCK, empty template is ALLOW", () => {
  const blocked = runHook({
    hook_event_name: "PreToolUse",
    tool_name: "Write",
    tool_input: {
      file_path: "/tmp/.env",
      content: `COBRE_SECRET=${FAKE_SECRET}\n`,
    },
  });
  assertBlocked(blocked);

  const allowed = runHook({
    hook_event_name: "PreToolUse",
    tool_name: "Write",
    tool_input: {
      file_path: "/tmp/.env",
      content: "COBRE_SECRET=\nCOBRE_USER_ID=\n",
    },
  });
  assertAllowed(allowed);
});

test("invalid JSON fails closed without leaking input", () => {
  const result = spawnSync(process.execPath, [SCANNER], {
    input: "{not-json",
    encoding: "utf8",
  });
  assert.equal(result.status, 2);
  assert.equal(result.stdout.includes("{not-json"), false);
});

test("object property from this.secret -> ALLOW", () => {
  assertAllowed(runHook(writePayload("const a = { secret: this.secret };")));
});

test("object property from env.COBRE_SECRET -> ALLOW", () => {
  assertAllowed(runHook(writePayload("const a = { secret: env.COBRE_SECRET };")));
});

test("JSON body using this.userId and this.secret -> ALLOW", () => {
  assertAllowed(
    runHook(
      writePayload(
        "body: JSON.stringify({ user_id: this.userId, secret: this.secret })",
      ),
    ),
  );
});

test("object property with hardcoded secret -> BLOCK", () => {
  assertBlocked(
    runHook(writePayload(`const a = { secret: "${FAKE_SECRET}" };`)),
  );
});

test("unquoted secret that is not an allowed variable root -> BLOCK", () => {
  assertBlocked(runHook(writePayload("const a = { secret: abc123def456 };")));
});

test("unquoted dotted secret with a disallowed root -> BLOCK", () => {
  assertBlocked(runHook(writePayload("const a = { secret: abc.def };")));
});

test("unquoted COBRE_SECRET in .env content -> BLOCK", () => {
  assertBlocked(
    runHook(
      writePayload("COBRE_SECRET=abc123def456ghi789\n"),
    ),
  );
});
