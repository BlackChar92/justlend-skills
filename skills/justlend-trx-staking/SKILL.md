---
name: justlend-trx-staking
description: >-
  Liquid-stake TRX on JustLend to receive sTRX (earns staking rewards, stays
  usable in DeFi), and unstake / claim / withdraw. Use when the user wants to
  stake or unstake TRX, or asks about sTRX. Unstaking has an unbonding period.
  Writes require the full MCP server plus a signing wallet. Not for plain TRX
  transfers.
---

# JustLend sTRX Staking

Before a write, explicitly load [Shared write safety v1](../SAFETY.md) from this
checkout. The host/agent owns loading and confirmation; if unavailable, remain read-only.

Liquid staking skill for TRX on JustLend. Stake TRX to receive sTRX tokens, which earn staking rewards automatically while remaining usable in DeFi protocols.

> **Note**: This skill requires the full MCP server ([@justlend/mcp-server-justlend](https://github.com/justlend/mcp-server-justlend)) which provides `stake_trx_to_strx`, `unstake_strx`, `get_strx_dashboard`, and other staking tools.

## How sTRX Works

1. **Stake**: Deposit TRX into the sTRX contract → receive sTRX tokens
2. **Rewards**: Staking rewards accrue to the sTRX/TRX exchange rate (sTRX appreciates over time)
3. **Unstake**: Burn sTRX to get TRX back (subject to ~14 day unbonding period)

## Tools (Full MCP Server)

| Tool | Description | Write? |
|------|-------------|--------|
| `get_strx_dashboard` | Staking APY, exchange rate, total supply | No |
| `get_strx_account` | User staking info (staked amount, income, rewards) | No |
| `get_strx_balance` | sTRX token balance | No |
| `check_strx_withdrawal_eligibility` | Unbonding status and withdrawal readiness | No |
| `stake_trx_to_strx` | Stake TRX to receive sTRX | **Yes** |
| `unstake_strx` | Unstake sTRX (starts unbonding period) | **Yes** |
| `claim_strx_rewards` | Calls `claimAll` to collect available TRX after unbonding | **Yes** |

## Unstake, wait, then claim

1. Query the balance and current unfreeze delay; preview and confirm `unstake_strx`
   with the exact sTRX amount. It starts unbonding; it is not the final claim step.
2. After the waiting period, call `check_strx_withdrawal_eligibility` and
   `get_strx_account`. Preserve `source` / `note`; unavailable amounts or rounds
   are unknown, not a zero balance or an empty queue. On clients exposing the
   detailed eligibility contract, inspect `claimEligibility`, `dataStatus` and
   `unknownFields`; older outputs must not override a degraded account result.
3. If availability is unknown, stop and re-query later. If the known claimable
   amount is zero, explain that nothing is currently claimable. Do not call
   `unstake_strx` again to collect an existing unlocked withdrawal.
4. For a known positive amount, preview and confirm `claim_strx_rewards` separately.
   Check its receipt, TRX balance and refreshed claimable amount before reporting
   success. An unknown tx result must be reconciled before considering another claim.

## Examples

- "What is the current sTRX staking APY?"
- "Stake 1000 TRX to get sTRX."
- "Check my sTRX staking rewards."
- "Unstake all my sTRX."
