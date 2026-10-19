---
name: justlend-governance-v1
description: >-
  Participate in JustLend DAO governance on TRON: view proposals, deposit JST
  for voting power (WJST), cast votes, and reclaim votes after a proposal ends.
  Use when the user wants to view or vote on JustLend proposals. Writes require
  the full MCP server plus a signing wallet; depositing JST locks it as WJST
  until withdrawal. Not for plain token transfers or non-JustLend DAOs.
---

# JustLend DAO Governance

Before a write, explicitly load [Shared write safety v1](../SAFETY.md) from this
checkout. The host/agent owns loading and confirmation; if unavailable, remain read-only.

Governance skill for participating in JustLend DAO proposals. View proposals, deposit JST for voting power, cast votes, and reclaim votes after proposals end.

> **Note**: This skill requires the full MCP server ([@justlend/mcp-server-justlend](https://github.com/justlend/mcp-server-justlend)) which provides `get_proposal_list`, `cast_vote`, `deposit_jst_for_votes`, and other governance tools.

## How Governance Works

1. **Get Voting Power**: Deposit JST tokens to receive WJST (1 JST = 1 Vote)
2. **Vote**: Cast FOR or AGAINST on active proposals with a specified vote amount
3. **Reclaim**: After a proposal ends, withdraw locked votes. Then optionally convert WJST back to JST.

## Tools (Full MCP Server)

| Tool | Description | Write? |
|------|-------------|--------|
| `get_proposal_list` | List all governance proposals with status and vote counts | No |
| `get_vote_info` | Voting power, available votes, locked votes | No |
| `get_user_vote_status` | User's voting history and withdrawable proposals | No |
| `get_locked_votes` | Votes locked in a specific proposal | No |
| `check_jst_allowance_for_voting` | Check JST approval for WJST contract | No |
| `approve_jst_for_voting` | Approve JST for the WJST voting contract | **Yes** |
| `deposit_jst_for_votes` | Deposit JST to get voting power (1:1) | **Yes** |
| `cast_vote` | Vote FOR or AGAINST a proposal | **Yes** |
| `withdraw_votes_from_proposal` | Reclaim votes from completed proposals | **Yes** |
| `withdraw_votes_to_jst` | Convert WJST back to JST | **Yes** |

## Voting Workflow

1. `get_proposal_list` — find active proposals
2. `get_vote_info` — check available voting power
3. If no votes: `approve_jst_for_voting` → `deposit_jst_for_votes`
4. `cast_vote` — vote on the proposal
5. After proposal ends: `withdraw_votes_from_proposal` → `withdraw_votes_to_jst`

## Examples

- "List all active JustLend governance proposals."
- "What is my current voting power?"
- "Vote FOR proposal #425 with 1000 votes."
- "Withdraw my votes from completed proposals."
