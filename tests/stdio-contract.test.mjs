import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

test("installed SDK interoperates with the real bundled stdio server", { timeout: 15_000 }, async (t) => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../scripts/mcp_server.mjs", import.meta.url))],
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    stderr: "pipe",
  });
  const client = new Client({ name: "skills-offline-regression", version: "1.0.0" });
  t.after(() => client.close());
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.equal(tools.length, 9);
  assert.deepEqual(tools.map(tool => tool.name).sort(), [
    "check_allowance", "get_account_data_from_api", "get_account_summary", "get_all_markets",
    "get_dashboard", "get_jtoken_details", "get_supported_markets", "get_token_balance", "get_trx_balance",
  ]);
  assert.ok(!tools.some(tool => tool.name === "moolah_liquidate" || tool.name === "buy_energy_direct"));
  assert.ok(tools.every(tool => tool.outputSchema.properties.schemaVersion.const === "1.0.0"));
  const success = await client.callTool({ name: "get_supported_markets", arguments: {} });
  assert.notEqual(success.isError, true);
  assert.equal(success.structuredContent.tool, "get_supported_markets");
  assert.deepEqual(JSON.parse(success.content[0].text), success.structuredContent.result);
  const failure = await client.callTool({ name: "moolah_liquidate", arguments: {} });
  assert.equal(failure.isError, true);
  assert.equal(failure.structuredContent.errorCode, "invalid_input");
  assert.equal(failure.structuredContent.retryable, false);
});
