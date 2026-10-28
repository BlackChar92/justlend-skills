---
name: justlend-lending-v2
description: >-
  Isolated-market lending on JustLend V2 on
  TRON: supply into ERC4626 vaults, supply-collateral / borrow / repay in
  isolated markets, and liquidate. Use when the user references JustLend V2,
  Moolah, isolated markets, or vaults. Writes require the full MCP server plus a
  signing wallet. Not for V1 pooled markets (use justlend-lending-v1).
---

# JustLend V2 Lending

Before a write, explicitly load [Shared write safety v1](../SAFETY.md) from this
checkout. The host/agent owns loading and confirmation; if unavailable, remain read-only.

Isolated-market lending skill for **JustLend V2** on TRON. The protocol
separates curated **ERC4626 vaults** on the supply side from **isolated markets**
on the borrow side. Each market is a single `(loanToken, collateralToken, oracle, irm, lltv)`
pair, so risk is contained per-market rather than pooled like JustLend V1.

> **Naming**: V2's on-chain contracts and MCP tools are named `Moolah` / `moolah_*` (e.g.
> `MoolahProxy`, `get_moolah_vault`). That is the technical identifier for the V2 system — this
> skill refers to the product as **JustLend V2** throughout and uses the `moolah_*` names only
> where they match the actual tool/contract surface.

> **Note**: This skill requires the full MCP server v1.1.0+
> ([@justlend/mcp-server-justlend](https://github.com/justlend/mcp-server-justlend)), which added
> the 30 V2 tools and 4 AI prompts below. The lite bundled server (read-only V1) does not
> include them.

## V1 vs V2 — when to use which

| | V1 (pooled) | V2 (isolated) |
|---|---|---|
| Risk model | Shared pool, one health factor across all assets | Per-market, isolated collateral/loan pair |
| Supply | Supply any market directly | Deposit into a **vault** (ERC4626) that allocates across markets |
| Borrow | Borrow against pooled collateral | `supplyCollateral` into a market, then `borrow` the loan token |
| Risk metric | `shortfallUSD` / health factor | `risk` (borrow / max borrowable; can exceed 1) + market `lltv` |
| Skill | [justlend-lending-v1](../justlend-lending-v1/SKILL.md) | this skill |

## Core concepts

- **Vault (supply side)** — an ERC4626 vault. You `deposit` the loan asset (e.g. USDT) and receive
  shares; the curator allocates liquidity across isolated markets. `withdraw`/`redeem` to exit.
- **Market (borrow side)** — an isolated `(loanToken, collateralToken, oracle, irm, lltv)` tuple
  identified by a `bytes32` market id. You `supplyCollateral`, then `borrow` up to `lltv` of the
  collateral's oracle value, and `repay` / `withdrawCollateral` to unwind.
- **LLTV** — Liquidation Loan-To-Value (18-decimal ratio). Borrow position must stay below it.
- **risk** — ratio of current borrow to max borrowable; it can exceed 1. Approaching
  1 is a warning, not proof of liquidation eligibility. A ratio above 1 indicates
  debt above the limit; rounded API values at 1 do not settle the exact boundary.
  Use current on-chain health and a fresh liquidation quote before acting. There is
  **no single account-wide health factor** in V2; risk is per-market.
- **Liquidation** — an authorized liquidation route can repay an unhealthy position's debt
  and seize collateral. An unhealthy position alone does not establish permission to use that route.

## Tools (Full MCP Server v1.1.0)

### Vault (supply side)
| Tool | Description | Write? |
|------|-------------|--------|
| `get_moolah_vault` | Single vault: total assets, APY, allocation | No |
| `get_moolah_vaults` | List all vaults with APY/TVL | No |
| `approve_moolah_vault` | Approve the loan asset for a vault | **Yes** |
| `moolah_vault_deposit` | Deposit loan asset → receive vault shares | **Yes** |
| `moolah_vault_withdraw` | Withdraw a specific asset amount from a vault | **Yes** |
| `moolah_vault_redeem` | Redeem vault shares back to the loan asset | **Yes** |

### Market (borrow side)
| Tool | Description | Write? |
|------|-------------|--------|
| `get_moolah_market` | Single isolated market state + params (lltv, oracle, irm) | No |
| `get_moolah_markets` | List all isolated markets | No |
| `get_moolah_user_position` | User collateral / borrow / `risk` in a market | No |
| `approve_moolah_proxy` | Approve token for the Moolah core proxy | **Yes** |
| `moolah_supply_collateral` | Supply collateral into a market | **Yes** |
| `moolah_withdraw_collateral` | Withdraw collateral from a market | **Yes** |
| `moolah_borrow` | Borrow the loan token against supplied collateral | **Yes** |
| `moolah_repay` | Repay borrowed loan token | **Yes** |

### Liquidation
| Tool | Description | Write? |
|------|-------------|--------|
| `get_moolah_pending_liquidations` | Liquidation candidates, potentially including near-threshold positions; verify current on-chain health | No |
| `get_moolah_liquidation_quote` | Seize/repay quote for liquidating a position | No |
| `get_moolah_liquidation_records` | Historical V2 liquidations | No |
| `approve_liquidator_token` | Approve the repay token for the public liquidator | **Yes** |
| `moolah_liquidate` | Liquidate an unhealthy position | **Yes** |

### Dashboard & history
| Tool | Description | Write? |
|------|-------------|--------|
| `get_moolah_dashboard` | V2 protocol overview (vaults, markets, TVL) | No |
| `get_moolah_history` | A user's V2 position history (net worth/supply/borrow over time) + recent lend/borrow records | No |
| `get_moolah_records` | Paginated V2 `/record/lend` history | No |
| `get_moolah_vault_history` | Vault APY / TVL time series | No |
| `get_moolah_market_history` | Market borrow/supply APY + utilization curves | No |
| `estimate_moolah_energy` | Energy/TRX estimate for the 11 Moolah write ops | No |

### Mining / rewards
| Tool | Description | Write? |
|------|-------------|--------|
| `get_moolah_vault_mining_apy` | Single vault's V2 mining APY (USDD/TRX split + total) | No |
| `get_moolah_mining_resolver` | All mining-enabled vaults → their USDD/TRX APY split | No |
| `get_moolah_mining_accruing` | A user's accruing + settling mining rewards across vaults | No |
| `get_moolah_pending_mining_periods` | A user's claimable (settled, merkle-published) airdrop rounds | No |
| `claim_moolah_mining_period` | Claim a single settled mining airdrop round via `multiClaim()` | **Yes** |

> AI prompts (full MCP server): `moolah_supply`, `moolah_borrow`, `moolah_liquidate`,
> `moolah_portfolio`.

## Critical rules

### Risk is per-market, not account-wide
Unlike V1's single health factor, V2 risk lives in each market. Always call
`get_moolah_user_position` (or `get_moolah_history` for the full picture) and inspect the
`risk` ratio **and** the market `lltv` before advising. Near 1 means little safety
margin, not automatic eligibility. The contract's current `isHealthy` result is
authoritative; obtain a fresh `get_moolah_liquidation_quote` for cost estimation.
The quote takes no borrower address and does not check borrower health; a successful
quote is not proof of eligibility. Do not decide from rounded/stale API values alone.

### Health and liquidation permissions are separate

Check the deployed network and implementation's core caller permission
(`isLiquidationWhitelist`) and the public-liquidator market/borrower gates
(`marketWhitelist`, `marketUserWhitelist`) for the exact market and borrower.
Allowlisting the liquidator in the core contract does not by itself prove that
the liquidator's own gate is satisfied. A quote does not prove liquidation permission.
If permissions are unknown, stop and request read-only verification; do not
substitute caller addresses for the borrower or broaden a whitelist to make the call pass.

### Approve before write
TRC20 vault deposits need `approve_moolah_vault`; market collateral supply and
TRC20 repayment need `approve_moolah_proxy`; liquidation needs
`approve_liquidator_token`. Borrowing and collateral withdrawal do not themselves
need a new token allowance. The full server returns a
structured `errorCode: insufficient_allowance` with a `hint` when allowance is missing.
Confirm the necessary approval separately, recheck it, then confirm the intended write;
the error is not permission to retry automatically.

### Vaults are the supply side, markets are the borrow side
To *earn*, use a **vault** (`moolah_vault_deposit`). To *borrow*, use a **market**
(`moolah_supply_collateral` → `moolah_borrow`). Don't conflate the two.

## Typical workflows

### Supply (earn) via a vault
1. `get_moolah_vaults` — compare vault APYs
2. `approve_moolah_vault` — approve the loan asset
3. `moolah_vault_deposit` — deposit; later `moolah_vault_redeem` to exit

### Borrow against collateral in an isolated market
1. `get_moolah_markets` — pick a `(collateral, loan)` market; note its `lltv`
2. `approve_moolah_proxy` → `moolah_supply_collateral`
3. `moolah_borrow` — borrow below `lltv`; monitor with `get_moolah_user_position`
4. `moolah_repay` → `moolah_withdraw_collateral` to unwind

### Liquidate an unhealthy position
1. `get_moolah_pending_liquidations` — find candidates; inclusion is not proof of eligibility.
2. Verify the target borrower's current on-chain health. If it is healthy or unknown, stop.
3. Verify the exact route's core caller and public-liquidator market/borrower permissions. If denied or unknown, stop; do not change permissions as a workaround.
4. `get_moolah_liquidation_quote` — check seize vs repay economics; this is not a borrower-health or permission check.
5. Separately confirm `approve_liquidator_token`, recheck allowance, then separately confirm `moolah_liquidate`. Verify the receipt and post-state.

## Examples

- "Compare the APYs of all JustLend V2 vaults — which USDT vault pays the most?"
- "Supply 5000 USDT into the best JustLend V2 vault."
- "Open a borrow position: supply BTC as collateral and borrow USDT on JustLend V2. What's the LLTV?"
- "Check my JustLend V2 positions — is any market close to liquidation?"
- "Show me the pending liquidations on JustLend V2 and the quote to liquidate the riskiest one."
- "How much energy will a V2 supply-collateral-and-borrow cost?"
