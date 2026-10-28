# JustLend V2 Guide

JustLend V2 is an isolated-lending protocol on TRON. Unlike V1's
single shared pool, V2 splits lending into two layers: **vaults** (the supply side) and **isolated
markets** (the borrow side). Risk is contained per market instead of pooled across all assets.

> V2's on-chain contracts and MCP tools carry the `Moolah` / `moolah_*` naming (e.g. `MoolahProxy`,
> `get_moolah_vault`); this guide refers to the product as **JustLend V2** and only uses those
> identifiers where they match the actual contract/tool surface.

## Core Concepts
- **Isolated Market**: A single `(loanToken, collateralToken, oracle, irm, lltv)` tuple, identified
  by a `bytes32` market id. Borrowers interact with one market at a time; a bad debt event in one
  market cannot drain another.
- **Vault (ERC4626)**: A curated supply vault. Lenders deposit the loan asset and receive shares; a
  curator allocates the liquidity across one or more isolated markets to earn yield.
- **LLTV (Liquidation Loan-To-Value)**: An 18-decimal ratio defining the maximum borrow against
  collateral's oracle value. Cross it and the position becomes liquidatable.
- **risk**: Current borrow divided by maximum borrowable; it can exceed 1.
  Approaching 1 is a risk warning, not proof that the position can be liquidated.
  V2 has **no single account-wide health factor** — risk is evaluated per market.
- **IRM**: The interest-rate model contract for a market.
- **Oracle**: The price feed (ResilientOracle) used to value collateral vs loan.

## Supply Side — Vaults
1. **Deposit**: Send the loan asset (e.g. USDT) into a vault → receive ERC4626 shares.
2. **Earn**: The vault's curator allocates to markets; yield accrues to the share price.
3. **Withdraw / Redeem**: Pull a specific asset amount (`withdraw`) or burn shares (`redeem`).

## Borrow Side — Markets
1. **Supply Collateral**: Deposit the collateral token into a market.
2. **Borrow**: Draw the loan token up to the market's `lltv`.
3. **Repay**: Return borrowed assets plus accrued interest.
4. **Withdraw Collateral**: Reclaim collateral once the position is healthy enough.

A common one-shot path is `supplyCollateralAndBorrow`, which supplies collateral and borrows in a
single transaction.

## Liquidation
An unhealthy position is necessary, but not sufficient, for a liquidation route
to accept a transaction. Borrow above the `lltv`-implied limit corresponds to `risk > 1`, not
merely approaching 1. Rounded API values at 1 do not establish the exact boundary:
use current on-chain `isHealthy` and a fresh liquidation quote. A liquidator repays
part of the debt and seizes collateral plus an incentive. Pending-liquidation lists
and quotes are exposed via the MCP server; they do not guarantee transaction success.

Verify the core caller permission (`isLiquidationWhitelist`) and the public-liquidator's
applicable `marketWhitelist` / `marketUserWhitelist` gates for the exact market and
borrower, using the deployed network and implementation. Core caller allowlisting
does not by itself satisfy the liquidator's own gate. A quote does not prove
liquidation permission. If permissions are unknown, stop and request read-only
verification. Do not enable a global whitelist or alter protocol permissions as a workaround.

## Risk Management
- Monitor each borrow position's `risk` ratio; keep it well below 1 (e.g. under 0.8) to survive
  oracle moves.
- Because markets are isolated, diversify borrows across markets rather than relying on a single
  blended health factor.
- Volatile collateral pairs run with a lower `lltv` — check it per market before borrowing.

## V1 vs V2 at a glance

| | V1 (pooled) | V2 (isolated) |
|---|---|---|
| Position token | jTokens | vault shares (supply) / market position (borrow) |
| Risk scope | account-wide health factor | per-market `risk` + `lltv` |
| Supply | supply any market | deposit into an ERC4626 vault |
| Bad-debt blast radius | whole pool | one isolated market |

## Tooling
The full MCP server ([@justlend/mcp-server-justlend](https://github.com/justlend/mcp-server-justlend),
v1.1.0+) exposes 30 V2 tools across vault, market, liquidation, dashboard, history, and gas
estimation, plus the `moolah_supply` / `moolah_borrow` / `moolah_liquidate` / `moolah_portfolio` AI
prompts. See the [`justlend-lending-v2` skill](../skills/justlend-lending-v2/SKILL.md) for the full
tool list and workflows.
