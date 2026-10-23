# JustLend Skills

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![TRON Network](https://img.shields.io/badge/Network-TRON-red)
![MCP](https://img.shields.io/badge/MCP-Compatible-blue)
![JustLend](https://img.shields.io/badge/Protocol-JustLend_DAO-green)

AI Agent skills for [JustLend DAO](https://justlend.org) on the TRON network. Provides structured instructions and an MCP server that enables AI agents (Claude Code, Claude Desktop, Cursor, Codex, etc.) to query market data, check account positions, and analyze DeFi lending data.

> **Distribution:** install this project from [GitHub](https://github.com/justlend/justlend-skills); it is not published to the npm registry. The scoped name in `package.json` identifies the project for local tooling only. Do not run `npm install @justlend/justlend-skills`—clone the repository and run `bash install.sh` as described below. The `npm install` command used inside the clone installs this project's dependencies.

**Current version:** `1.1.1` · bundled MCP output contract: `1.0.0`

## Features

- **Market Data**: Real-time APY (including mining rewards), TVL, and utilization for all JustLend markets
- **Protocol Dashboard**: Total supply, borrow, TVL, user count across the protocol
- **Account Analysis**: Health factor monitoring, liquidation risk assessment, balance queries
- **Token Allowances**: Check TRC20 approval status for JustLend contracts
- **Energy Direct Purchase Workflow**: Quote, explicitly confirm, submit, track, and recover backend-broadcast energy payments through the full MCP server

- **JustLend V2**: Isolated-market lending — curated ERC4626 supply vaults + permissionless `(collateral, loan)` borrow markets, with per-market `risk`/`lltv`, liquidation, and history (see the [V2 skill](skills/justlend-lending-v2/SKILL.md))

> For advanced features (V2 lending, sTRX staking, energy rental/direct purchase, governance voting, mining rewards), use the full MCP server: [@justlend/mcp-server-justlend](https://github.com/justlend/mcp-server-justlend) (adds the V2 tools, WTRX wrap/unwrap, and AI prompts).

**When to use this project:** an agent needs JustLend-specific workflow instructions. Its bundled MCP server supports read-only market, position, balance, and allowance queries with only a TronGrid key; write-oriented skill modules route execution to the full MCP server and a signing wallet.

**When *not* to use it:**
- You need to **move funds** — supply/borrow/repay/withdraw, stake, vote, rent/buy energy, wrap/unwrap. That is the [full MCP server](https://github.com/justlend/mcp-server-justlend) plus a signing wallet, not this project's bundled read server.
- You're on a **non-TRON chain** or a **different protocol** — these skills are JustLend/TRON-only and will not route.
- You want raw node access with **no JustLend context** — call TronGrid directly instead.

## Which Mode to Use

| Mode | What it is | Use when | Writes? |
|------|-----------|----------|:------:|
| **Skills (this repository)** | Agent instruction files (`SKILL.md`) + a bundled read-only MCP server (9 tools) | An agent needs guided read or write workflows; writes route to the full MCP server | Via full MCP only |
| **Bundled MCP server** (`npm start`) | The 9-tool read-only stdio server shipped here | Same, wired into a client (Claude / Cursor / Codex / OpenCode) | No |
| **CLI** (`node scripts/justlend_api.mjs`) | One-shot terminal queries | Quick manual checks / scripting reads | No |
| **Full MCP server** ([@justlend/mcp-server-justlend](https://github.com/justlend/mcp-server-justlend)) | 104-tool read + **write** server | You need to *act*: supply/borrow/repay/withdraw, stake, rent or buy energy, vote, liquidate | **Yes** (signing wallet required) |

### Skill → dependency matrix

| Skill | Bundled read MCP | Full MCP server | TronGrid key | Signing wallet | Writes? |
|-------|:---------------:|:---------------:|:-----------:|:-------------:|:------:|
| `justlend-dao` (base query) | ✅ | — | ✅ | — | No |
| `justlend-lending-v1` | — | ✅ | ✅ | ✅ | Yes |
| `justlend-lending-v2` | — | ✅ | ✅ | ✅ | Yes |
| `justlend-trx-staking` | — | ✅ | ✅ | ✅ | Yes |
| `justlend-energy-rental` | — | ✅ | ✅ | ✅ | Yes |
| `justlend-energy-purchase` | — | ✅ | ✅ | ✅ | Yes |
| `justlend-governance-v1` | — | ✅ | ✅ | ✅ | Yes |

Read-only skills work with just this repository + a TronGrid key. Every write skill routes through the full server and needs a **signing wallet** (agent-wallet or a browser wallet); the bundled server has no signing capability.

**Graceful degradation.** If the full MCP server or a signing wallet is absent, the read-only skills still work unchanged — the agent can quote rates, read a position, and check allowances, then tell the user exactly what to install (the full server) and connect (a wallet) to act. A write skill invoked without the full server should **stop and report the missing dependency**, never silently no-op or fake a result.

## Market Inventory and Bundled Shortcuts

The canonical JustLend V1 snapshot contains **24 markets: 18 active + 6 legacy** (verified against the expanded [JustLend app](https://app.justlend.org/) market table and live `/lend/jtoken` API on 2026-08-19). Active `jU` is included in that count.

The following table is deliberately narrower: these are the **8 static shortcuts bundled in `scripts/justlend_api.mjs`** for `get_token_balance` and `check_allowance`. It is not the canonical protocol roster. `get_all_markets` queries the live API for the visible protocol inventory; `get_supported_markets` lists only these bundled shortcuts.

| Shortcut | jToken | Underlying | Status / purpose |
|----------|--------|------------|------------------|
| `TRX` | jTRX | TRX | Active; native balance, no allowance |
| `USDT` | jUSDT | USDT | Active shortcut |
| `USDD` | jUSDD | USDD | Active shortcut |
| `USDC` | jUSDCOLD | USDCOLD | Legacy compatibility shortcut |
| `BTC` | jBTC | BTC | Active shortcut |
| `ETH` | jETH | ETH | Active shortcut |
| `SUN` | jSUN | SUN | Active shortcut |
| `WIN` | jWIN | WIN | Active shortcut |

> The full MCP server exposes the complete **24-market V1 roster**, including `jsTRX`, `jwstUSDT`, `jWBTC`, and `jU`. Do not infer the protocol total from this package's shortcut table.

## Project Structure

```
justlend-skills/
├── scripts/                          # Core implementation
│   ├── mcp_server.mjs               # MCP server (9 read-only tools, stdio transport)
│   ├── mcp_tools.mjs                # Tool catalog with input/output schemas
│   ├── mcp_contract.mjs             # Versioned success/error envelopes
│   └── justlend_api.mjs             # JustLend API client & CLI tool
├── tests/                            # Deterministic MCP contract tests
├── skills/                           # Agent skill instructions
│   ├── _meta.json                   # Skill metadata
│   ├── justlend-lending-v1/SKILL.md # V1 pooled lending operations guide
│   ├── justlend-lending-v2/SKILL.md # V2 isolated lending guide
│   ├── justlend-trx-staking/SKILL.md
│   ├── justlend-energy-rental/SKILL.md
│   ├── justlend-energy-purchase/SKILL.md
│   └── justlend-governance-v1/SKILL.md
├── docs/                             # Protocol guides
│   ├── justlend-guide.md            # Lending concepts & risk management
│   ├── justlend-v2-guide.md         # V2 isolated-market concepts
│   ├── strx-staking-guide.md        # sTRX staking guide
│   ├── resource-rental.md           # Energy rental guide
│   └── energy-purchase.md           # Energy direct-purchase safety boundary
├── SKILL.md                          # Main skill reference
├── install.sh                        # Quick setup script
└── uninstall.sh                      # Cleanup script
```

## Quick Start

Recommended development baseline: **Node.js 24.22.1**, pinned in `.nvmrc`.
The supported runtime ranges are listed in `package.json`.

### 1. Install from GitHub

```bash
git clone https://github.com/justlend/justlend-skills.git
cd justlend-skills
bash install.sh
```

Or, after cloning the repository, install its dependencies manually:

```bash
npm install
cp .env.example .env   # Then edit .env with your keys
npm test               # Offline contract tests; no key or network required
```

### 2. Configure

Edit `.env`:

```env
# Required — get from https://www.trongrid.io/
TRONGRID_API_KEY=your_trongrid_api_key

# Network: mainnet (default) or nile (testnet)
NETWORK=mainnet
```

### 3. Run

**As MCP Server** (for AI agents):

```bash
npm start
```

**As CLI Tool** (for quick checks):

```bash
node scripts/justlend_api.mjs markets              # List all markets with APY
node scripts/justlend_api.mjs dashboard            # Protocol dashboard (TVL, users)
node scripts/justlend_api.mjs supported-markets    # List supported markets & addresses
node scripts/justlend_api.mjs balance <addr>       # Check TRX balance
node scripts/justlend_api.mjs balance <addr> USDT  # Check token balance
node scripts/justlend_api.mjs account <addr>       # Account health status
node scripts/justlend_api.mjs account-api <addr>   # Full account data from API
node scripts/justlend_api.mjs jtoken-details <jtoken>  # Detailed jToken info
node scripts/justlend_api.mjs allowance <addr> USDT    # Check TRC20 approval
```

### 4. Verify

```bash
node scripts/justlend_api.mjs markets    # should print a table of markets + APY
npm run test:smoke                       # assert the live canonical 24-market roster
npm test                                 # bundled server self-check (if dev deps installed)
```

If `markets` prints rows, the TronGrid key and read path work. `npm run test:smoke` additionally fails if the live roster differs from the verified **18 active + 6 legacy = 24** snapshot or omits `jU`. An empty result or `401`/`403` means the key is missing or invalid (see [Troubleshooting](#troubleshooting)).

### 5. Upgrade

```bash
cd justlend-skills && git pull && npm install
```

Then restart your agent/client so it re-reads the skill manifests. Breaking changes and migration notes live in [`CHANGELOG.md`](CHANGELOG.md).

### 6. Uninstall

```bash
bash uninstall.sh    # removes the symlinks install.sh created
```

If you installed under a client directory, also remove that directory and the `skills/` symlink pointing at it.

## Client Configuration

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "justlend": {
      "command": "node",
      "args": ["/ABSOLUTE_PATH_TO/justlend-skills/scripts/mcp_server.mjs"],
      "env": {
        "TRONGRID_API_KEY": "your_key"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "justlend": {
      "command": "node",
      "args": ["/ABSOLUTE_PATH_TO/justlend-skills/scripts/mcp_server.mjs"],
      "env": {
        "TRONGRID_API_KEY": "your_key"
      }
    }
  }
}
```

### Claude Code

Add to `.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "justlend": {
      "command": "node",
      "args": ["/ABSOLUTE_PATH_TO/justlend-skills/scripts/mcp_server.mjs"],
      "env": {
        "TRONGRID_API_KEY": "your_key"
      }
    }
  }
}
```

### Codex

Codex reads the bundled [`.codex/`](.codex/INSTALL.md) manifest — register the same stdio command (`node /ABSOLUTE_PATH_TO/justlend-skills/scripts/mcp_server.mjs`, env `TRONGRID_API_KEY`) in your Codex MCP config; details in [`.codex/INSTALL.md`](.codex/INSTALL.md).

### OpenCode

OpenCode loads the bundled `.opencode/` plugin, which auto-discovers each skill from its `SKILL.md` frontmatter. Point OpenCode at this directory (or symlink `.opencode/`); the read-only MCP server registers the same way (`node .../scripts/mcp_server.mjs`, env `TRONGRID_API_KEY`).

### Verifying a client loaded the skills

- **Discovery:** ask the agent *"which JustLend skills do you have?"* — it should name the six skills. If it lists none, the skills path/symlink is wrong (see [Troubleshooting](#troubleshooting)).
- **MCP tools:** ask for the tool list, or in Claude Code run `/mcp` — the `justlend` server should expose the 9 read tools (`get_all_markets`, `get_account_summary`, …).

### Handling conflicts

- **Duplicate skill names:** if another package also ships a `justlend-*` skill, install only one — same-named skills shadow each other and the agent may load the wrong `SKILL.md`.
- **Two MCP servers:** don't register both this read-only server and the full server under the **same** `justlend` name — the second registration wins. Give the full server a distinct name (e.g. `justlend-write`) if you want both, or just use the full server (it is a superset of the read tools).

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `get_all_markets` | All markets with supply/borrow APY, mining rewards, and TVL |
| `get_dashboard` | Protocol overview: total supply, borrow, TVL, user count |
| `get_supported_markets` | List the 8 bundled static balance/allowance shortcuts |
| `get_jtoken_details` | Detailed jToken info: interest rate model, reserves, mining rewards |
| `get_account_summary` | Health factor, liquidity, liquidation risk |
| `get_account_data_from_api` | Comprehensive account data from API (positions, rewards) |
| `get_trx_balance` | Native TRX balance |
| `get_token_balance` | TRC20 token balance (USDT, USDD, etc.) |
| `check_allowance` | Check TRC20 approval status for JustLend contracts |

Each read tool declares both `inputSchema` and `outputSchema`. Successful calls retain the legacy raw JSON text and add this MCP `structuredContent` envelope:

```json
{
  "schemaVersion": "1.0.0",
  "tool": "get_all_markets",
  "result": []
}
```

Failures are flagged `isError` and return the same JSON in text and `structuredContent`: `{ schemaVersion, tool, error, errorCode, retryable, hint }`. Stable codes are `invalid_input`, `authentication`, `rate_limit`, `transient`, and `internal`. Only `rate_limit` and `transient` are safe to retry automatically, using backoff. Consumers should pin the schema major and prefer `structuredContent`; the full server uses the same `schemaVersion` / `tool` / `result` success fields.

The version above covers the bundled server's envelope and stable error codes,
not every nested upstream API field. The full server's failures may instead be
JSON text with `isError: true`; do not assume they share this bundled error
envelope. Unknown codes or absent retryability stop the write workflow. Validate
critical business fields against the connected full tool's schema; an unavailable
value is not zero. Pin the package/source revision when consuming payload details.

### Shared safety loading

Every write module explicitly links [Shared write safety v1](skills/SAFETY.md).
The host/agent must load that file when selecting a write module; README/root
skill discovery does **not** automatically inject it. Keep the complete `skills/`
tree when installing or symlinking, including `SAFETY.md`. If it is inaccessible,
remain read-only and report the missing resource. The rules identify confirmation,
refusal/re-confirmation, prechecks, unknown errors and unresolved-write recovery
responsibilities. Their revision is separate from package/deployment versions.

## Skill Inputs, Outputs & Failure Handling

| Skill | Reads with | Writes with (full server) | Returns | On failure |
|-------|-----------|---------------------------|---------|-----------|
| `justlend-dao` (base) | the 9 read tools above | — | market / account JSON | retryable read errors (rate-limit, timeout) are safe to retry with backoff |
| `justlend-lending-v1` | `get_account_summary`, `check_allowance` | `approve_underlying` → `supply` / `borrow` / `repay` / `withdraw` | tx hash + post-state | **never auto-retry a write** — a repay/borrow may have landed; re-query `get_account_summary` first |
| `justlend-lending-v2` | market / vault reads | `approve_moolah_vault` / `approve_moolah_proxy` → `moolah_vault_deposit` / `moolah_supply_collateral` / `moolah_borrow` / `moolah_withdraw_collateral` / `moolah_liquidate` | tx hash + position | same no-retry rule; liquidation is irreversible — confirm target and amount |
| `justlend-trx-staking` | balance / eligibility reads | `stake_trx_to_strx` / `unstake_strx` / `claim_strx_rewards` | tx hash + post-state | `unstake_strx` starts an **unbonding period**; use `claim_strx_rewards` to collect available TRX afterward |
| `justlend-energy-rental` | market reads | rental tools | tx hash + order | quote first; price can move between quote and order |
| `justlend-energy-purchase` | config / quote / order / public history / payment risk | `buy_energy_direct` | payment tx + order state | confirm exact quote; backend broadcasts; ambiguous results block a second payment |
| `justlend-governance-v1` | `get_proposal_list`, `get_vote_info` | `approve_jst_for_voting` → `deposit_jst_for_votes` → `cast_vote` → `withdraw_votes_*` | tx hash + vote state | `deposit_jst_for_votes` locks JST as WJST until withdrawal |

**Write failure contract:** the host must confirm each write with the user (HITL), preview first, and on any error **re-query state before retrying**. Mutating contract calls are not idempotent. Energy direct purchase is the narrow exception: its service may retry only the **same signed transaction** internally; it must never create a second payment silently.

## Agent Workflows

Real closed loops — user utterance → skill/tool routing → output → next step.

### Read + advise (routing: picks the read skill, not a write)

**User:** *"Is it worth borrowing USDT on JustLend right now, and can my account take it?"*
1. Agent loads **`justlend-dao`** — this is a read question, no write skill needed.
2. `get_all_markets` → USDT borrow APY and mining offset.
3. `get_account_summary` → current health factor and borrow limit.
4. **Output:** "USDT borrow APY is X% (Y% after mining). Your health factor is 2.1; borrowing $500 drops it to ~1.6 — still safe. To actually borrow you'll need the full server plus a wallet."

No funds move — the agent stops at advice because this project is read-only.

### V1 vs V2 disambiguation

**User:** *"Borrow against my collateral."*
- The agent asks one routing question — **pooled (V1)** or **isolated market (V2)**? — because `justlend-lending-v1` and `justlend-lending-v2` are different skills with different risk models (per-market `lltv`, isolation).
- "USDT from the main pool" → `justlend-lending-v1`; "against my wstUSDT in the isolated market" → `justlend-lending-v2`.

### Write path with HITL (full server + wallet)

**User:** *"Supply 500 USDT to JustLend."* → **`justlend-lending-v1`**
1. `check_allowance` (read) — is USDT approved for the jUSDT market?
2. If not: `approve_underlying` — the agent shows amount + spender and **waits for user confirmation** before signing. For USDT/USDC/USDJ the tool defensively resets the allowance to 0 first (parity with the official front-end), so the user may see two transactions; the tool sequences them automatically.
3. `supply` — **HITL confirm** (amount, market, direction), simulate first, then sign.
4. `get_account_summary` (read) — verify the new supply balance and health factor.

> **No auto-retry.** If step 3 errors, the agent re-queries state before doing anything else — a supply may already have landed.

### Error / boundary handling

- **Insufficient allowance** → agent surfaces the missing approval and proposes `approve_underlying` (HITL), never a silent MAX approval.
- **Health factor would breach** → agent refuses or warns before a borrow/withdraw that pushes `shortfallUSD > 0`.
- **Rate limit (TronGrid 429)** → reads are safe to retry after a short backoff (the full server marks these `errorCode: "transient"`, `retryable: true`). Writes are **not** retried automatically.
- **Full server not installed** → a write skill reports the missing dependency and points to [@justlend/mcp-server-justlend](https://github.com/justlend/mcp-server-justlend); it does not fake a transaction.
- **sTRX claim availability unknown** → preserve `null`, provenance and degradation notes; re-query `get_strx_account` / `check_strx_withdrawal_eligibility`. Do not report a zero claim or submit a claim from unknown data.

## Safety & Boundaries

- **This project is read-only.** The bundled MCP server (`scripts/mcp_server.mjs`) and the CLI only *query* — no transaction signing, no writes, no fund movement. It cannot move or lose funds.
- **Credentials.** The only secret is a **TronGrid API key** (read-only RPC access), stored locally in `.env` (git-ignored). No signing key is used or stored by this project.
- **Write operations live in the full server.** supply/borrow/repay/withdraw, sTRX staking, energy rental/direct purchase, and governance voting run through [@justlend/mcp-server-justlend](https://github.com/justlend/mcp-server-justlend), which requires a **signing wallet**. When you enable those, the host MUST:
  - **confirm every write with the user (HITL)** before signing — show amount, market, and direction;
  - **never auto-retry a mutating call** (a repay / borrow / liquidate / vote may already have landed) — re-query state first;
  - simulate / preview first, and prefer **Nile testnet** (`NETWORK=nile`) before mainnet.
- **Per-module risk (highest-consequence, irreversible):** `liquidate` (V2), `unstake` (sTRX — has an unbonding period), and `cast_vote` (locks JST as WJST until withdrawal). Treat these as destructive.

### Per-skill risk profile

| Skill | Class | Reversible? | Cost / lock | HITL |
|-------|-------|-------------|-------------|:----:|
| `justlend-dao` (base) | read-only | n/a | none | no |
| `justlend-lending-v1` | write | yes (repay / withdraw) | gas + interest | yes |
| `justlend-lending-v2` | write incl. **`liquidate`** | borrow/repay yes; **liquidate no** | gas; liquidation seizes collateral | yes |
| `justlend-trx-staking` | write | **`unstake` delayed** (unbonding) | gas + unbonding wait | yes |
| `justlend-energy-rental` | write, **spends TRX** | no (consumed) | rental fee | yes |
| `justlend-energy-purchase` | write, **signs TRX payment** | no after backend broadcast | quoted payment + possible activation fee | yes, exact quote |
| `justlend-governance-v1` | write | vote reclaimable after proposal ends | **JST locked as WJST** | yes |

### If an agent misfires (recovery)

- **Wrong skill / wrong market** → because writes are HITL, catch it at the confirm prompt: reject and restate market + amount. Nothing signs without approval.
- **A write may have half-landed** (client crash, timeout) → do **not** re-send. Re-query `get_account_summary` (or `get_vote_info` / balances) for the real state, then decide.
- **Direct-purchase result unknown** → call `get_energy_purchase_history`, then call `get_energy_payment_risk` with no arguments. The configured-wallet risk check is read-only and never replays a payment. Never sign a second payment while the first is unresolved; any exact-request replay occurs only inside a separately confirmed `buy_energy_direct` call.
- **Accidental approval** → revoke by setting the allowance back to 0 (`amount='0'` on the approve tool — the same `approve(0)` the write flow uses).
- **Stuck in sTRX unbonding** → wait, then query `check_strx_withdrawal_eligibility` and `get_strx_account`. If a positive amount is known, separately confirm `claim_strx_rewards`; verify its receipt and refreshed balance/claimable amount. Do not call `unstake_strx` again to collect an existing round.
- **Locked votes** → query proposal/vote status after the timelock, then separately confirm `withdraw_votes_from_proposal` and, if requested, `withdraw_votes_to_jst`; verify the resulting vote/token balances.

## Data & Privacy

- **What's read:** on-chain market/account data plus the JustLend read APIs. A queried **address is sent to TronGrid and the JustLend `/account` API** to fetch its balances / positions.
- **What's stored:** the bundled read-only tools persist nothing beyond your local `.env` key. After the full server signs an energy payment, an ambiguous result may store the exact signed request (signature plus raw transaction) in a local mode-`0600` risk file. It is broadcastable until expiry, is redacted from normal output, and remains only until history confirms the payment/order or a deterministic pre-broadcast rejection clears it. The no-argument risk check only reports this configured-wallet state; it does not replay or clear the request.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Agent lists **no** JustLend skills | skills path/symlink wrong, or client not restarted | check the `skills/` symlink for your client ([Client Configuration](#client-configuration)); restart the agent so it re-reads manifests |
| **Wrong** skill fires (read when you meant write, or V1 vs V2) | overlapping triggers | the frontmatter carries negative triggers — state the operation explicitly ("supply", "borrow on V2") |
| `401` / `403` on reads | missing or invalid `TRONGRID_API_KEY` | set a valid key in `.env`; verify with `node scripts/justlend_api.mjs markets` |
| `429` / slow reads | TronGrid rate limit | back off and retry; upgrade the TronGrid plan for higher throughput |
| Empty market/account data | key works but network mismatch | check `NETWORK` (`mainnet` vs `nile`) matches the address you're querying |
| A write skill "does nothing" | full MCP server or signing wallet not installed | install [@justlend/mcp-server-justlend](https://github.com/justlend/mcp-server-justlend) and connect a wallet — the bundled server never signs |
| MCP server won't start | Unpatched/EOL Node, or deps not installed | `node -v` (use the patched releases in `package.json`); run `npm install` |
| Behaviour changed after update | version / manifest drift | compare installed version with [`CHANGELOG.md`](CHANGELOG.md); re-run `npm install` and restart |

**Logs & version.** The server emits lifecycle/fatal logs to stderr and returns tool failures through the structured error contract above; the CLI prints errors to stderr. Run the CLI command directly to diagnose the offending address/token. Include the project version from `package.json` / `skills/_meta.json` and output `schemaVersion` when filing an issue.

## License

MIT License — Copyright (c) 2026 JustLend DAO

`SPDX-License-Identifier: MIT`
