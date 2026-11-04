import { MCP_TOOL_OUTPUT_SCHEMA } from "./mcp_contract.mjs";

const tool = (definition) => ({
  ...definition,
  outputSchema: MCP_TOOL_OUTPUT_SCHEMA,
});

/** The complete catalog for the bundled read-only MCP server. */
export const MCP_TOOLS = [
  tool({
    name: "get_all_markets",
    description: "Overview of live mainnet markets: symbol, jToken, supplyAPY, totalSupplyAPY, borrowAPY, formatted tvlUSD and optional mining/staking APY. Does not return market supply/borrow totals.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  }),
  tool({
    name: "get_account_summary",
    description: "Get mainnet account liquidityUSD, shortfallUSD, isLiquidatable and status. Nonzero Comptroller error codes fail the query.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "TRON address" },
      },
      required: ["address"],
      additionalProperties: false,
    },
  }),
  tool({
    name: "get_trx_balance",
    description: "Check native TRX balance.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "TRON address" },
      },
      required: ["address"],
      additionalProperties: false,
    },
  }),
  tool({
    name: "get_token_balance",
    description: "Check a recognized mainnet TRX/TRC20 shortcut balance (for example TRX, USDT or USDD). Unknown symbols fail as invalid_input.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "TRON address" },
        token: { type: "string", description: "Bundled token shortcut (for example USDT)" },
      },
      required: ["address", "token"],
      additionalProperties: false,
    },
  }),
  tool({
    name: "get_dashboard",
    description: "Get JustLend protocol dashboard: total supply, total borrow, TVL, and supplier/borrower counts.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  }),
  tool({
    name: "get_jtoken_details",
    description: "Get detailed jToken market info: interest rate model, reserves, mining rewards, and utilization.",
    inputSchema: {
      type: "object",
      properties: {
        jtokenAddr: {
          type: "string",
          description: "jToken contract address (for example TXJgMdjVX5dKiQaUi9QobwNxtSQaFqccvd for jUSDT)",
        },
      },
      required: ["jtokenAddr"],
      additionalProperties: false,
    },
  }),
  tool({
    name: "get_account_data_from_api",
    description: "Get lending positions, balances, mining rewards, and health data from the JustLend account API.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "TRON address" },
      },
      required: ["address"],
      additionalProperties: false,
    },
  }),
  tool({
    name: "get_supported_markets",
    description: "List the bundled static market shortcuts used by balance and allowance tools.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  }),
  tool({
    name: "check_allowance",
    description: "Check whether a bundled TRC20 market shortcut has been approved for its JustLend jToken. Native TRX needs no approval.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "TRON address to check" },
        asset: { type: "string", description: "Bundled asset shortcut (for example USDT)" },
      },
      required: ["address", "asset"],
      additionalProperties: false,
    },
  }),
];
