---
name: justlend-lending-v1
description: >-
  Supply, borrow, repay, and withdraw on JustLend V1 pooled (Compound-style)
  jToken markets on TRON, plus enable/disable collateral and TRC20 approvals.
  Use when the user wants to lend, borrow, repay, or withdraw on JustLend V1.
  Writes require the full @justlend/mcp-server-justlend and a signing wallet.
  Not for V2 isolated markets (use justlend-lending-v2) or read-only queries
  (use the base justlend-dao skill).
---

# JustLend V1 Lending

Supply, borrow, repay and withdraw through the full MCP server's V1 pooled-market
tools. Reads below are preconditions for these writes; use the base `justlend-dao`
skill for a read-only request. The bundled nine-tool server cannot execute writes.

Before a write, explicitly load [Shared write safety v1](../SAFETY.md) from this
checkout. The host/agent owns loading and confirmation; if unavailable, remain read-only.

## Workflow Rules

### 1. Always Check Before Advising
- Use `get_all_markets` to find the best supply/borrow APYs (includes mining rewards).
- Use `get_protocol_summary` for Comptroller configuration, liquidation parameters and market count.
- Use `get_account_summary` to check health factor. If `shortfallUSD > 0`, the user is **at liquidation risk**.
- Use `get_trx_balance` or `get_token_balance` to check balances.
- Use `check_allowance` to verify TRC20 approval status.

## Available Tools

| Tool | Description |
|------|-------------|
| `get_all_markets` | All markets with supply/borrow APY, mining rewards, and TVL |
| `get_protocol_summary` | Comptroller configuration, close factor, liquidation incentive and market count |
| `get_supported_markets` | Full server's market registry, including active/legacy status |
| `get_market_data` | Detailed market APY, TVL, utilization and collateral factor; required `market` |
| `get_account_summary` | Health factor, liquidity, liquidation risk |
| `get_mining_rewards` | Current wallet/account mining rewards |
| `get_trx_balance` | Native TRX balance |
| `get_token_balance` | TRC20 token balance |
| `check_allowance` | Check TRC20 approval for required `market`; optional `amount`, `address`, `network` |

The bundled V1 server has a different catalog and parameter schema. For example,
its allowance input is `asset`, whereas the full server requires `market` (such
as `jUSDT`). Do not copy bundled examples into a write workflow. Discover
`tools/list` on the connected full server; supply an explicit `address` for reads
when no signing wallet is configured. Unknown fields or missing tools mean a
capability mismatch, not permission to guess an alias.

## Write workflow (full MCP server)

1. Resolve the network, wallet and exact market with the read tools above. Check
   balances, health and available liquidity before selecting an amount.
2. For TRC20 supply/repay, inspect allowance. If insufficient, separately confirm
   `approve_underlying` with the exact spender and amount; never assume MAX consent.
   Native TRX does not need TRC20 approval.
3. Separately preview and confirm `supply`, `borrow`, `repay`, `withdraw` or
   `withdraw_all` using the connected tool schema. `enter_market` / `exit_market`
   change collateral membership on chain and require their own confirmation;
   check borrowing capacity before removing collateral.
4. Inspect the transaction receipt and `get_account_summary` to verify the new
   position. On timeout or an unknown result, stop and reconcile the original tx;
   do not replay a borrow/repay based only on an unchanged cached balance.

See the [shared confirmation and recovery rules](../SAFETY.md) and the
[README supply example](../../README.md#write-path-with-hitl-full-server--wallet).

## Examples

- "Supply 500 USDT to the V1 market after showing me the approval and supply preview."
- "Repay my V1 USDD debt."
- "Withdraw 100 TRX from my V1 supply position if my remaining collateral permits it."
