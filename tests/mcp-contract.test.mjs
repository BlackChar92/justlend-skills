import assert from "node:assert/strict";
import { readFileSync, realpathSync } from "node:fs";
import test from "node:test";
import {
  MCP_OUTPUT_SCHEMA_VERSION,
  classifyToolError,
  createToolError,
  createToolSuccess,
} from "../scripts/mcp_contract.mjs";
import { MCP_TOOLS } from "../scripts/mcp_tools.mjs";

const readJson = (relativePath) =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));

test("V2 liquidation guidance separates candidates and cost quotes from eligibility", () => {
  const skill = readFileSync(new URL("../skills/justlend-lending-v2/SKILL.md", import.meta.url), "utf8");
  assert.doesNotMatch(skill, /Positions currently liquidatable|find liquidatable positions|1\.0 = liquidatable/);
  assert.match(skill, /inclusion is not proof of eligibility/);
  assert.match(skill, /healthy or unknown, stop/);
  assert.match(skill, /does not check borrower health/);
});

test("package and client manifests share one release version", () => {
  const packageVersion = readJson("../package.json").version;
  assert.equal(packageVersion, "1.1.1");
  assert.equal(readJson("../skills/_meta.json").latest.version, packageVersion);
  assert.equal(readJson("../.claude-plugin/plugin.json").version, packageVersion);
  assert.equal(readJson("../.claude-plugin/marketplace.json").plugins[0].version, packageVersion);
  assert.equal(readJson("../.cursor-plugin/plugin.json").version, packageVersion);
});

test("every distributed write module can resolve its shared safety dependency", () => {
  const meta = readJson("../skills/_meta.json");
  const shared = realpathSync(new URL("../skills/SAFETY.md", import.meta.url));
  for (const { id } of meta.skills) {
    const moduleUrl = new URL(`../skills/${id}/SKILL.md`, import.meta.url);
    const text = readFileSync(moduleUrl, "utf8");
    const links = [...text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((match) => match[1]);
    const safetyLink = links.find((link) => link.endsWith("/SAFETY.md"));
    assert.ok(safetyLink, `${id} must declare its shared safety dependency`);
    assert.equal(realpathSync(new URL(safetyLink, moduleUrl)), shared);
    assert.ok(readFileSync(new URL(safetyLink, moduleUrl), "utf8").length > 0);
  }
});

test("all nine bundled tools declare the common output schema", () => {
  assert.equal(MCP_TOOLS.length, 9);
  assert.equal(new Set(MCP_TOOLS.map(({ name }) => name)).size, 9);
  for (const tool of MCP_TOOLS) {
    assert.equal(tool.outputSchema.properties.schemaVersion.const, MCP_OUTPUT_SCHEMA_VERSION);
    assert.deepEqual(tool.outputSchema.required, ["schemaVersion", "tool"]);
    assert.equal(tool.inputSchema.additionalProperties, false);
  }
});

test("success keeps legacy JSON text and adds structuredContent", () => {
  const result = [{ symbol: "TRX" }];
  const response = createToolSuccess("get_all_markets", result);
  assert.deepEqual(JSON.parse(response.content[0].text), result);
  assert.deepEqual(response.structuredContent, {
    schemaVersion: "1.0.0",
    tool: "get_all_markets",
    result,
  });
  assert.equal(response.isError, undefined);
});

test("errors expose a stable code, retryability, and remediation hint", () => {
  const response = createToolError("get_all_markets", new Error("HTTP 429 rate limit"));
  assert.equal(response.isError, true);
  assert.equal(response.structuredContent.errorCode, "rate_limit");
  assert.equal(response.structuredContent.retryable, true);
  assert.deepEqual(JSON.parse(response.content[0].text), response.structuredContent);

  assert.deepEqual(classifyToolError(new Error("Unknown asset: NOPE")), {
    error: "Unknown asset: NOPE",
    errorCode: "invalid_input",
    retryable: false,
    hint: "Correct the tool name or arguments before retrying.",
  });
});

test("energy purchase instructions bind confirmation to the authoritative quote", () => {
  const skill = readFileSync(
    new URL("../skills/justlend-energy-purchase/SKILL.md", import.meta.url),
    "utf8",
  );
  assert.match(skill, /quoted `total_sun` as `expectedAmountSun`/);
  assert.doesNotMatch(skill, /`amount_sun`/);
  assert.match(skill, /official default `https:\/\/tegrow\.ablesdxd\.link`/);
  assert.match(skill, /get_energy_purchase_history/);
  assert.match(skill, /exact signed request/);
  assert.match(skill, /get_energy_payment_risk` with no arguments/);
  assert.match(skill, /never replays or clears a stored payment/);
  assert.match(skill, /separately user-confirmed `buy_energy_direct` call/);
});
